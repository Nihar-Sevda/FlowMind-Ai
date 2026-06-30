import React, { useState, useEffect, useRef } from 'react';
import { AIPersonality, Message } from '../types';
import { AI_PERSONALITIES } from '../data/personalities';
import { Send, Sparkles, MessageSquare, X, RefreshCw, ChevronDown, Compass, Brain, Bot, CircleDot, User, CalendarDays, Volume2, VolumeX, Mic, Square } from 'lucide-react';

interface AIOrbChatProps {
  currentPersonality: AIPersonality;
  onChangePersonality: (personality: AIPersonality) => void;
  onAddTaskFromAI?: (taskTitle: string) => void;
  onScheduleFocusFromAI?: (duration: number) => void;
  accentColor?: string;
}

export default function AIOrbChat({
  currentPersonality,
  onChangePersonality,
  onAddTaskFromAI,
  onScheduleFocusFromAI,
  accentColor = 'bg-indigo-600'
}: AIOrbChatProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I am your ${currentPersonality.name}. ${currentPersonality.tagline} How can I help you triage your upcoming deadlines today?`,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [showPersonalityDropdown, setShowPersonalityDropdown] = useState<boolean>(false);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Animated visualizer frequencies state
  const [visualizerHeights, setVisualizerHeights] = useState<number[]>(currentPersonality.voiceFrequencies || [4, 10, 6, 12, 5, 8, 4]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Scroll to bottom on new message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // Handle personality changes (resets welcome message if no prior user conversations)
  useEffect(() => {
    if (messages.length <= 1) {
      setMessages([
        {
          id: `welcome-${currentPersonality.id}`,
          role: 'assistant',
          content: `Hello! I am your ${currentPersonality.name}. ${currentPersonality.tagline} How can I help you triage your upcoming deadlines today?`,
          timestamp: new Date()
        }
      ]);
    }
    setVisualizerHeights(currentPersonality.voiceFrequencies || [4, 10, 6, 12, 5, 8, 4]);
  }, [currentPersonality]);

  // Voice wave animation loop
  useEffect(() => {
    let animId: any;
    if (isSpeaking) {
      const updateFrequencies = () => {
        setVisualizerHeights(prev => prev.map(() => Math.floor(Math.random() * 18) + 4));
        animId = setTimeout(updateFrequencies, 100);
      };
      updateFrequencies();
    } else {
      setVisualizerHeights(currentPersonality.voiceFrequencies || [4, 10, 6, 12, 5, 8, 4]);
    }
    return () => clearTimeout(animId);
  }, [isSpeaking, currentPersonality]);

  // Handle TTS speaking
  const speakText = (text: string) => {
    if (!voiceEnabled) return;
    
    // Cancel any current speech
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // Clean markdown before speaking
    const cleanText = text.replace(/[*#_`~]/g, '').trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Choose voice matching current companion personality
    if (window.speechSynthesis) {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        if (currentPersonality.id === 'coach') {
          // Energetic masculine/intense voice
          const matchedVoice = voices.find(v => v.name.includes('Male') || v.name.includes('David') || v.name.includes('Google US English'));
          if (matchedVoice) utterance.voice = matchedVoice;
          utterance.rate = 1.1;
          utterance.pitch = 0.95;
        } else if (currentPersonality.id === 'mentor') {
          // Empathic, soothing voice
          const matchedVoice = voices.find(v => v.name.includes('Zira') || v.name.includes('Hazel') || v.name.includes('Google UK English Female'));
          if (matchedVoice) utterance.voice = matchedVoice;
          utterance.rate = 0.95;
          utterance.pitch = 1.05;
        } else if (currentPersonality.id === 'philosopher') {
          // Slower deep voice
          const matchedVoice = voices.find(v => v.name.includes('David') || v.name.includes('Premium') || v.name.includes('English India'));
          if (matchedVoice) utterance.voice = matchedVoice;
          utterance.rate = 0.85;
          utterance.pitch = 0.85;
        } else {
          utterance.rate = 1.0;
        }
      }
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    speechUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // Toggle voice settings
  const toggleVoice = () => {
    const nextVal = !voiceEnabled;
    setVoiceEnabled(nextVal);
    if (!nextVal) {
      stopSpeaking();
    } else {
      // Speak greeting
      speakText(`Voice system active. I am ready to triage.`);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText || inputText;
    if (!textToSend.trim() || isStreaming) return;

    if (!customText) setInputText('');
    stopSpeaking();

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);

    // Initial placeholder for assistant streaming message
    const assistantMessageId = `assist-${Date.now()}`;
    const initialAssistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, initialAssistantMessage]);

    try {
      const historyToSend = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: historyToSend,
          systemInstruction: `${currentPersonality.systemInstruction} Keep your response very concise and highly action-oriented. Focus on assisting with deadlines, triaging tasks, or giving tactical crisis advice.`
        })
      });

      if (!response.ok) {
        throw new Error('Streaming server error');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      
      if (!reader) {
        throw new Error('Reader is undefined');
      }

      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataContent = line.replace('data: ', '').trim();
            if (dataContent === '[DONE]') {
              break;
            }
            try {
              const parsed = JSON.parse(dataContent);
              if (parsed.text) {
                accumulatedText += parsed.text;
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, content: accumulatedText }
                      : msg
                  )
                );
              } else if (parsed.error) {
                accumulatedText += `\n*[Error: ${parsed.error}]*`;
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, content: accumulatedText }
                      : msg
                  )
                );
              }
            } catch (e) {
              // Ignore line-parse errors
            }
          }
        }
      }

      // Speak final result if voice is enabled
      if (voiceEnabled && accumulatedText) {
        speakText(accumulatedText);
      }

    } catch (err: any) {
      console.error('Gemini Stream Error:', err);
      const errorMsg = "I encountered an issue connecting to the Gemini stream. Please verify your GEMINI_API_KEY is configured in your Secrets panel. In the meantime, I am happy to help as your productivity guide locally!";
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: errorMsg }
            : msg
        )
      );
      if (voiceEnabled) {
        speakText(errorMsg);
      }
    } finally {
      setIsStreaming(false);
    }
  };

  // Quick Action Buttons based on personality
  const getQuickActions = () => {
    switch (currentPersonality.id) {
      case 'mentor':
        return [
          { text: "Help me reduce feeling overwhelmed", prompt: "I am feeling extremely overwhelmed by my workload. Can you guide me through a mindful priority check and break it down into tiny encouraging steps?" },
          { text: "Suggest a self-care focus plan", prompt: "Give me a balanced productivity strategy for today that includes gentle breaks and healthy boundaries." }
        ];
      case 'coach':
        return [
          { text: "Stop my procrastination now", prompt: "I am procrastinating. Give me a 15-minute high-intensity challenge and hold me fully accountable." },
          { text: "Plan a rigorous time-block", prompt: "Let's build a strict, no-excuses time blocking layout for my major projects today." }
        ];
      case 'philosopher':
        return [
          { text: "Help me find intentionality", prompt: "Help me reflect on my core tasks and decide which are genuinely aligned with my long-term purpose, rather than just urgent noise." },
          { text: "Deep mono-tasking setup", prompt: "Guide me through setting up a distraction-free, Stoic focus environment for my primary creative endeavor." }
        ];
      case 'creative':
        return [
          { text: "Gamify my checklist", prompt: "My todo list feels boring. Can we gamify it and add some creative lateral twists to make it engaging?" },
          { text: "Lateral brainstorming session", prompt: "Let's brainstorm some completely unconventional, creative solutions to a tough work challenge." }
        ];
      default:
        return [];
    }
  };

  return (
    <>
      {/* 1. Floating AI Orb representation */}
      <button
        id="ai-floating-orb"
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 z-50 cursor-pointer border border-white/10 dark:border-zinc-850 group hover:scale-110 active:scale-95 ${
          currentPersonality.bgGradientClass 
            ? `bg-gradient-to-tr ${currentPersonality.bgGradientClass}` 
            : 'bg-indigo-600'
        }`}
        title={`Interact with your ${currentPersonality.name}`}
      >
        {/* Soft organic breathing glow rings */}
        <span className="absolute inset-0 rounded-full bg-inherit animate-ping opacity-25 scale-125 group-hover:opacity-40 transition-opacity" />
        
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <div className="relative flex items-center justify-center">
            <Bot className="w-6 h-6 text-white animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border border-zinc-950" />
          </div>
        )}
      </button>

      {/* 2. Floating Chat Overlay Window - Styled beautifully matte black or soft light gray */}
      {isOpen && (
        <div
          id="ai-chat-overlay"
          className="fixed bottom-24 right-6 w-[400px] max-w-[calc(100vw-2rem)] h-[580px] max-h-[calc(100vh-10rem)] bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-900 flex flex-col overflow-hidden transition-all duration-350 z-50 animate-in fade-in slide-in-from-bottom-6"
        >
          {/* Custom Header with Personality Styling */}
          <div className={`p-4 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white relative border-b border-zinc-200/60 dark:border-zinc-850/60`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-3xl filter drop-shadow">{currentPersonality.emoji}</span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-display font-bold text-sm text-zinc-800 dark:text-zinc-100">
                      {currentPersonality.name}
                    </h3>
                    <span className="text-[9px] uppercase font-mono font-extrabold tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded">
                      Rescue AI
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-serif italic truncate max-w-[180px]">
                    "{currentPersonality.tagline}"
                  </p>
                </div>
              </div>

              {/* Speaker & Mic Toggles & Settings */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleVoice}
                  className={`p-2 rounded-xl transition-all cursor-pointer border ${
                    voiceEnabled 
                      ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30' 
                      : 'bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                  title={voiceEnabled ? "Mute interactive voice assistance" : "Enable voice-enabled companion speaking"}
                >
                  <Volume2 className="w-4 h-4" />
                </button>

                {/* Dropdown switch */}
                <div className="relative">
                  <button
                    onClick={() => setShowPersonalityDropdown(!showPersonalityDropdown)}
                    className="p-2 bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-xl font-mono text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 text-xs transition-all flex items-center gap-1"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showPersonalityDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showPersonalityDropdown && (
                    <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-2xl shadow-xl z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-2">
                      <div className="px-3 py-1.5 text-[9px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 border-b border-zinc-100 dark:border-zinc-900 mb-1">
                        Choose Companion:
                      </div>
                      {AI_PERSONALITIES.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            onChangePersonality(p);
                            setShowPersonalityDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-sans flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors ${
                            currentPersonality.id === p.id 
                              ? 'bg-zinc-50 dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 font-bold' 
                              : 'text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span>{p.emoji}</span>
                            <span>{p.name}</span>
                          </span>
                          {currentPersonality.id === p.id && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/50 dark:bg-zinc-950">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs flex-shrink-0 ${
                  msg.role === 'user' 
                    ? 'bg-zinc-200/50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400' 
                    : `${currentPersonality.accentClass}`
                }`}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <span>{currentPersonality.emoji}</span>}
                </div>

                <div className="space-y-1">
                  <div className={`p-3 rounded-2xl text-xs sm:text-sm font-sans leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-950/20 shadow'
                      : 'bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-850 rounded-tl-none shadow-sm'
                  }`}>
                    {msg.content === '' && isStreaming && msg.id === messages[messages.length - 1].id ? (
                      <span className="flex items-center gap-1 py-1">
                        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    ) : (
                      <span className="whitespace-pre-line">{msg.content}</span>
                    )}
                  </div>
                  
                  {/* Action suggestor */}
                  {msg.role === 'assistant' && msg.content.toLowerCase().includes('plan') && onAddTaskFromAI && (
                    <div className="flex gap-2 mt-1 px-1">
                      <button 
                        onClick={() => {
                          onAddTaskFromAI("AI Emergency Rescue Action Target");
                        }}
                        className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 bg-white dark:bg-zinc-900 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        Save suggested plan to targets
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Voice Speech/Visualizer Waveform Overlay if Speaking */}
          {(isSpeaking || voiceEnabled) && (
            <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200/60 dark:border-zinc-850 flex items-center justify-between gap-4">
              <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                <CircleDot className="w-3 h-3 text-rose-500 animate-pulse" />
                Companion Output Wave
              </span>
              
              {/* Dynamic Animated Bars */}
              <div className="flex items-end gap-1 h-5">
                {visualizerHeights.map((h, i) => (
                  <div
                    key={i}
                    className="w-1 bg-gradient-to-t from-indigo-500 to-fuchsia-400 rounded-full transition-all duration-100"
                    style={{ height: `${h}px` }}
                  />
                ))}
              </div>

              {isSpeaking ? (
                <button
                  onClick={stopSpeaking}
                  className="p-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded text-[9px] font-mono font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white flex items-center gap-1"
                  title="Stop speaking"
                >
                  <Square className="w-2.5 h-2.5 text-rose-400" />
                  Mute
                </button>
              ) : (
                <span className="text-[9px] font-mono text-zinc-450 dark:text-zinc-600">Idle Voice</span>
              )}
            </div>
          )}

          {/* Suggested Actions */}
          {messages.length <= 3 && !isStreaming && (
            <div className="p-3 bg-zinc-50/50 dark:bg-zinc-950 border-t border-zinc-200/60 dark:border-zinc-900">
              <div className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2 px-1">
                Emergency Crisis Drills:
              </div>
              <div className="flex flex-col gap-1.5">
                {getQuickActions().map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(undefined, action.prompt)}
                    className="w-full text-left px-3 py-2 text-[11px] font-sans font-medium text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-xl hover:border-indigo-500/50 hover:bg-indigo-500/5 hover:text-indigo-600 dark:hover:text-white transition-all duration-200 cursor-pointer"
                  >
                    {action.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form Input */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200/60 dark:border-zinc-850 flex gap-2 items-center"
          >
            <input
              type="text"
              placeholder={`Communicate with ${currentPersonality.name}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isStreaming}
              className="flex-1 px-3.5 py-2.5 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl focus:outline-none focus:border-indigo-500 text-zinc-800 dark:text-zinc-100 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isStreaming || !inputText.trim()}
              className={`p-2.5 rounded-xl text-white shadow hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center ${
                inputText.trim() ? `${accentColor}` : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-750'
              }`}
            >
              <Send className="w-4 h-4 fill-current" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
