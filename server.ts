import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Parse JSON bodies
app.use(express.json());

// Initialize Gemini SDK lazily
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not set. Chat features will require it.");
    }
    aiClient = new GoogleGenAI({ apiKey: apiKey || '' });
  }
  return aiClient;
}

// 1. Debug endpoint to inspect headers (useful for locating OAuth token)
app.get('/api/debug-headers', (req, res) => {
  res.json({
    headers: req.headers,
    env_keys: Object.keys(process.env).filter(k => k.includes('TOKEN') || k.includes('KEY') || k.includes('AUTH') || k.includes('URL')),
  });
});

// 2. Google Calendar API endpoints
app.get('/api/calendar/events', async (req, res) => {
  try {
    // Attempt to locate OAuth token in various headers injected by the AI Studio platform or from the Authorization header
    const authHeader = req.headers['authorization'];
    const workspaceToken = req.headers['x-workspace-token'] as string;
    const googAccessToken = req.headers['x-goog-access-token'] as string;
    
    // Fallback to query param or custom header if passed by frontend
    const clientToken = req.query.token as string || req.headers['x-client-token'] as string;

    const token = workspaceToken || googAccessToken || clientToken || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null);

    if (!token) {
      return res.status(401).json({
        error: 'No Google Calendar access token found. Please ensure you are logged in and authorized Google Calendar in AI Studio.',
        suggestManualToken: true
      });
    }

    const timeMin = new Date().toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=15&orderBy=startTime&singleEvents=true&timeMin=${encodeURIComponent(timeMin)}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({
        error: `Google Calendar API returned error status: ${response.status}`,
        details: errText
      });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error: any) {
    console.error('Error fetching calendar events:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/calendar/events', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const workspaceToken = req.headers['x-workspace-token'] as string;
    const googAccessToken = req.headers['x-goog-access-token'] as string;
    const clientToken = req.headers['x-client-token'] as string;

    const token = workspaceToken || googAccessToken || clientToken || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null);

    if (!token) {
      return res.status(401).json({ error: 'No Google Calendar token found.' });
    }

    const { summary, description, startTime, endTime } = req.body;

    if (!summary || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required event fields: summary, startTime, endTime' });
    }

    const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary,
        description: description || 'Scheduled via FlowMind AI Productivity Hub',
        start: { dateTime: startTime },
        end: { dateTime: endTime },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({
        error: `Failed to create event: ${response.status}`,
        details: errText
      });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error: any) {
    console.error('Error creating calendar event:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 3. AI Gemini Chat Streaming endpoint (using Server-Sent Events)
app.post('/api/chat', async (req, res) => {
  // Set headers for Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const { messages, systemInstruction, userPrompt } = req.body;

    if (!messages || !Array.isArray(messages)) {
      res.write(`data: ${JSON.stringify({ error: 'Invalid or missing messages array' })}\n\n`);
      res.end();
      return;
    }

    const ai = getGeminiClient();

    // Map message history to the correct format required by the new SDK
    // @google/genai requires: contents: [{ role: 'user'|'model', parts: [{ text: string }] }]
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content || msg.text || '' }]
    }));

    // If there is an active extra user prompt that wasn't added to history yet
    if (userPrompt) {
      contents.push({
        role: 'user',
        parts: [{ text: userPrompt }]
      });
    }

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction || 'You are FlowMind, a helpful productivity assistant.',
        temperature: 0.7,
      }
    });

    for await (const chunk of responseStream) {
      const chunkText = chunk.text;
      if (chunkText) {
        res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
      }
    }

    // Signal completion
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('Error in Gemini Chat stream:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// 3.5 AI Deadline Triage Endpoint
app.post('/api/triage-deadline', async (req, res) => {
  try {
    const { title, dueDate, urgency, companionPersonality, companionSystemInstruction } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Missing title for deadline triage' });
    }

    // Check if key exists
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Graceful high-fidelity fallback when API key is missing
      console.log("Simulating high-stakes deadline triage fallback...");
      
      const isUrgent = urgency === 'critical' || urgency === 'high' || (dueDate && new Date(dueDate).getTime() - Date.now() < 1000 * 60 * 60 * 48);
      const triagePriority = isUrgent ? 'CRITICAL RESCUE' : urgency === 'medium' ? 'STANDARD ACTION' : 'FLEXIBLE DEPTH';
      
      let survivalPlan = [
        `🚨 Isolate all notifications immediately. Clear workspace for deep work.`,
        `⏱️ Lock in a 25-minute survival focus block with no alternative actions.`,
        `📝 Execute a raw 'brain dump' draft in 10 minutes—ignore perfection.`,
        `📞 Present your progress to a peer or log it here for instant feedback.`
      ];

      if (companionPersonality?.toLowerCase().includes('coach')) {
        survivalPlan = [
          `🔥 Stop overthinking. Open your workspace and set a 15-minute timer RIGHT NOW.`,
          `⚡ Hammer out the ugliest, roughest 10% of the draft without looking back.`,
          `🚫 Close ALL tabs except the singular target document. Extreme isolation.`,
          `💪 Lock in and do it. No excuses. Procrastination is a choice.`
        ];
      } else if (companionPersonality?.toLowerCase().includes('philosopher')) {
        survivalPlan = [
          `🌌 Quiet the noise. Take three slow, deep breaths to release future-anxiety.`,
          `🍂 Acknowledge that the dread of starting is heavier than the actual task.`,
          `🌾 Spend 15 minutes working in absolute silence with mono-focus presence.`,
          `🕯️ Re-anchor your intent: this task serves your self-mastery.`
        ];
      } else if (companionPersonality?.toLowerCase().includes('creative')) {
        survivalPlan = [
          `🎨 Re-frame the struggle: turn this deadline rescue into a gamified challenge.`,
          `🧩 Sketch a wild, messy mind-map of the solution structure in 5 minutes.`,
          `🧠 Do a "silly draft" first—write the absolute worst version imaginable.`,
          `🎵 Switch on cinematic synths and power through with lateral insights.`
        ];
      }

      const priorityExplanation = isUrgent 
        ? `This deadline demands immediate intervention. Proximity threat is high.`
        : `This target has a stable timeframe, but starting early guarantees optimal focus.`;

      return res.json({ triagePriority, survivalPlan, priorityExplanation });
    }

    const ai = getGeminiClient();
    const prompt = `Triage this high-stakes deadline rescue target:
    Title: "${title}"
    Due Date: "${dueDate}"
    Self-reported Urgency: "${urgency}"
    Companion Persona: "${companionPersonality}"
    
    You are matching the perspective of the "${companionPersonality}" companion. Write in their specific signature tone (e.g., intense tough-love if Coach, gentle supportive guidance if Mentor, deep Stoic reflection if Philosopher, gamified/lateral if Creative).
    Return a valid JSON according to the responseSchema.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: companionSystemInstruction || "You are a high-stakes AI deadline rescue manager.",
        temperature: 0.8,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            triagePriority: {
              type: Type.STRING,
              description: "Must be exactly one of: 'CRITICAL RESCUE', 'STANDARD ACTION', 'FLEXIBLE DEPTH'. Determine based on proximity of due date and level of threat."
            },
            survivalPlan: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Provide exactly 3 or 4 extremely precise, bite-sized micro-steps formatted as highly actionable steps matching the companion's tone to start within 15 minutes."
            },
            priorityExplanation: {
              type: Type.STRING,
              description: "One short sentence explaining why this level of priority was designated."
            }
          },
          required: ["triagePriority", "survivalPlan", "priorityExplanation"]
        }
      }
    });

    const jsonText = response.text || '';
    const parsedData = JSON.parse(jsonText.trim());
    return res.json(parsedData);

  } catch (error: any) {
    console.error('Error in deadline triage endpoint:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 3.6 AI Note Smart Enhancer Endpoint
app.post('/api/enhance-note', async (req, res) => {
  try {
    const { text, title, lang } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Missing text for note enhancement' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log("Simulating high-fidelity note enhancement fallback...");
      const isHi = lang === 'hi';
      const enhancedTitle = title ? `${title} (Polished)` : (isHi ? 'बेहतरीन विचार' : 'Polished Thought Draft');
      const enhancedContent = isHi
        ? `### ✨ परिष्कृत नोट: ${title || 'त्वरित विचार'}\n\nयह आपके द्वारा दर्ज किए गए विचारों का एक संरचित और पेशेवर प्रारूप है:\n\n* **मुख्य विचार:** ${text}\n* **अगला कदम:** इस विचार को एक केंद्रित कार्य में बदलें और एकाग्रता क्षेत्र का उपयोग करें।\n\n*नोट: पूर्ण AI संवर्द्धन के लिए कृपया अपनी सेटिंग्स में GEMINI_API_KEY सेट करें।*`
        : `### ✨ Polished Note: ${title || 'Quick Brainstorm'}\n\nHere is a structured, readable format of your drafted points:\n\n* **Core Concept:** ${text}\n* **Immediate Action Item:** Convert this insight into an active target objective and schedule a Pomodoro session.\n\n*Note: To unlock live generative AI enhancements, please set your GEMINI_API_KEY in the Settings.*`;
      
      return res.json({ title: enhancedTitle, content: enhancedContent });
    }

    const ai = getGeminiClient();
    const systemPrompt = lang === 'hi' 
      ? 'आप एक पेशेवर हिंदी उत्पादकता लेखक हैं। उपयोगकर्ता के दिए गए रफ नोट को व्यवस्थित, सुंदर मार्कडाउन बिंदुओं और साफ हिंदी शीर्षकों के साथ आकर्षक बनाएं।'
      : 'You are a professional productivity editor. Take the user\'s raw, messy note and enhance it into professional, clean, structured markdown with key takeaways, action items, and refined bullet points.';

    const prompt = `Please rewrite and enhance this note:
    Title suggestion: "${title || ''}"
    Raw note: "${text}"
    
    Respond with a JSON object holding "title" and "content" (in markdown).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A highly engaging, short title for the note" },
            content: { type: Type.STRING, description: "Structured markdown content representing the polished and expanded note" }
          },
          required: ["title", "content"]
        }
      }
    });

    const parsed = JSON.parse((response.text || '{}').trim());
    return res.json(parsed);

  } catch (error: any) {
    console.error('Error in enhance-note endpoint:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 3.7 AI Goal/Task Splitter Endpoint
app.post('/api/split-goal', async (req, res) => {
  try {
    const { goal, lang } = req.body;
    if (!goal) {
      return res.status(400).json({ error: 'Missing goal for splitter' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log("Simulating high-fidelity goal splitting fallback...");
      const isHi = lang === 'hi';
      const fallbackTasks = [
        {
          title: isHi ? `प्रारंभिक शोध: ${goal}` : `Initial Research: ${goal}`,
          urgency: 'high',
          duration: 30,
          category: 'Research'
        },
        {
          title: isHi ? `मूल योजना बनाना और रूपरेखा तैयार करना` : `Draft Outline & Strategy Setup`,
          urgency: 'medium',
          duration: 25,
          category: 'Planning'
        },
        {
          title: isHi ? `कार्यान्वयन का पहला चरण पूरा करना` : `Execution Phase 1: Core Draft`,
          urgency: 'critical',
          duration: 60,
          category: 'Work'
        },
        {
          title: isHi ? `समीक्षा करना और अंतिम सुधार` : `Review & Refine details`,
          urgency: 'low',
          duration: 15,
          category: 'Review'
        }
      ];
      return res.json({ subtasks: fallbackTasks });
    }

    const ai = getGeminiClient();
    const systemPrompt = `You are a breakdown task planning expert. Take a high-level goal and divide it into 3 to 4 sequential, highly actionable sub-tasks. Each sub-task must specify a "title", "urgency" (one of: 'critical', 'high', 'medium', 'low'), "duration" (integer in minutes, between 10 and 120), and a "category" (e.g. 'Work', 'Research', 'Health', 'Errand', 'Study'). Output response in ${lang === 'hi' ? 'Hindi language' : 'English language'}.`;

    const prompt = `Please split this goal into 3-4 ready-to-triage sub-tasks: "${goal}". Return a valid JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subtasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  urgency: { type: Type.STRING, description: "Must be one of: 'critical', 'high', 'medium', 'low'" },
                  duration: { type: Type.INTEGER, description: "Estimated duration in minutes" },
                  category: { type: Type.STRING, description: "Category label" }
                },
                required: ["title", "urgency", "duration", "category"]
              }
            }
          },
          required: ["subtasks"]
        }
      }
    });

    const parsed = JSON.parse((response.text || '{}').trim());
    return res.json(parsed);

  } catch (error: any) {
    console.error('Error in split-goal endpoint:', error);
    return res.status(500).json({ error: error.message });
  }
});

// 4. Vite middleware configuration or static hosting
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
