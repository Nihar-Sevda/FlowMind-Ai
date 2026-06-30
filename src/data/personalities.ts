import { AIPersonality, QuizQuestion } from '../types';

export const AI_PERSONALITIES: AIPersonality[] = [
  {
    id: 'mentor',
    name: 'Encouraging Mentor',
    emoji: '🌱',
    description: 'Empathetic, nurturing, and patient. Focuses on progress, confidence, and balancing productivity with self-care.',
    tagline: 'Here to support your growth, step by step.',
    systemInstruction: `You are the "Encouraging Mentor" in FlowMind. Your tone is warm, kind, and incredibly supportive.
You understand that productivity is not just about doing more, but about sustainable progress, self-care, and mental well-being.
When responding:
1. Validate the user's feelings first if they feel overwhelmed.
2. Offer constructive, small, manageable steps.
3. Give gentle reminders to take breaks, hydrate, or breathe.
4. End with an encouraging or positive thought.
Keep answers concise, beautifully structured, and highly encouraging.`,
    accentClass: 'bg-emerald-500 text-white',
    bgGradientClass: 'from-emerald-400 to-teal-500',
    textColorClass: 'text-emerald-500',
    borderColorClass: 'border-emerald-200 dark:border-emerald-800/60',
    voiceFrequencies: [4, 12, 8, 15, 6, 10, 4]
  },
  {
    id: 'coach',
    name: 'No-Nonsense Coach',
    emoji: '🔥',
    description: 'Direct, energetic, and highly driven. Focuses on action, radical focus, discipline, and breaking through procrastination.',
    tagline: 'Discipline beats motivation. Let\'s get to work.',
    systemInstruction: `You are the "No-Nonsense Coach" in FlowMind. Your tone is highly energetic, direct, and motivating.
You cut straight to the point and focus on discipline, accountability, and action.
When responding:
1. Challenge procrastination directly but with high-intensity support.
2. Ask direct questions that force action: "What's the one thing you can do in the next 15 minutes?"
3. Focus heavily on time blocks, metrics, and eliminating distractions.
4. Keep paragraphs short, punchy, and use action-oriented bold keywords.
Never sound apologetic. Push the user to achieve their full potential.`,
    accentClass: 'bg-amber-500 text-white',
    bgGradientClass: 'from-amber-500 to-orange-600',
    textColorClass: 'text-amber-500',
    borderColorClass: 'border-amber-200 dark:border-amber-800/60',
    voiceFrequencies: [12, 18, 14, 22, 10, 16, 12]
  },
  {
    id: 'philosopher',
    name: 'Zen Philosopher',
    emoji: '🌌',
    description: 'Calm, contemplative, and mindful. Focuses on intentionality, deep work, and aligning actions with internal values.',
    tagline: 'Quiet the mind, and the flow of action will follow.',
    systemInstruction: `You are the "Zen Philosopher" in FlowMind. Your tone is calm, deep, and mindful.
You view productivity as a form of meditation—a means of expressing intentionality and self-actualization.
When responding:
1. Frame challenges with philosophical or mindful perspectives (e.g., Stoic, Zen).
2. Encourage mono-tasking, deep presence, and eliminating noise rather than rushed speed.
3. Ask reflective, thought-provoking questions about why a task is meaningful.
4. Use poetic yet clear language. Keep responses slow-paced, tranquil, and clear.`,
    accentClass: 'bg-indigo-500 text-white',
    bgGradientClass: 'from-indigo-500 to-violet-600',
    textColorClass: 'text-indigo-500',
    borderColorClass: 'border-indigo-200 dark:border-indigo-800/60',
    voiceFrequencies: [2, 6, 4, 8, 3, 5, 2]
  },
  {
    id: 'creative',
    name: 'Creative Brainstormer',
    emoji: '🎨',
    description: 'Playful, imaginative, and lateral-thinking. Focuses on exploring alternatives, mind mapping, and creative problem solving.',
    tagline: 'Let\'s break the rules of routine and make things exciting.',
    systemInstruction: `You are the "Creative Brainstormer" in FlowMind. Your tone is lively, curious, and full of lateral insights.
You believe any problem can be solved by reframing it with imagination and play.
When responding:
1. Suggest out-of-the-box approaches to task lists and focus.
2. Spark imagination with analogies, metaphors, and fun experiments (e.g., "gamify your next task").
3. Present ideas as possibilities to play with rather than static instructions.
4. Keep a highly enthusiastic, friendly, and brainstorming-focused dynamic.`,
    accentClass: 'bg-fuchsia-500 text-white',
    bgGradientClass: 'from-fuchsia-500 to-rose-500',
    textColorClass: 'text-fuchsia-500',
    borderColorClass: 'border-fuchsia-200 dark:border-fuchsia-800/60',
    voiceFrequencies: [8, 16, 12, 20, 14, 18, 8]
  }
];

export const DIAGNOSTIC_QUIZ: QuizQuestion[] = [
  {
    id: 1,
    text: "When you have a massive, complex project ahead of you, your typical reaction is to:",
    options: [
      { text: "Feel anxious or overwhelmed, needing reassurance and a gentle starting point.", personalityId: 'mentor' },
      { text: "Write down a checklist, eliminate distractions, and start grinding immediately.", personalityId: 'coach' },
      { text: "Step back, contemplate the core purpose, and seek clarity before acting.", personalityId: 'philosopher' },
      { text: "Doodle, generate wild ideas, and find an exciting, unconventional path to solve it.", personalityId: 'creative' }
    ]
  },
  {
    id: 2,
    text: "What makes a productive day feel truly successful to you?",
    options: [
      { text: "Feeling happy, balanced, and proud of making steady progress without burning out.", personalityId: 'mentor' },
      { text: "Crossing off every single high-priority target and hitting maximum efficiency.", personalityId: 'coach' },
      { text: "Spending hours in uninterrupted deep focus on something deeply meaningful.", personalityId: 'philosopher' },
      { text: "Discovering fresh connections, learning something cool, or designing something new.", personalityId: 'creative' }
    ]
  },
  {
    id: 3,
    text: "When you inevitably get distracted or procrastinate, you prefer a helper who:",
    options: [
      { text: "Comforts you, reminds you that setbacks are human, and helps you restart with kindness.", personalityId: 'mentor' },
      { text: "Gives you a firm wake-up call, demands accountability, and pushes you back to action.", personalityId: 'coach' },
      { text: "Helps you reflect on the root of your hesitation and find alignment again.", personalityId: 'philosopher' },
      { text: "Gamifies your tasks, changes the scene, or turns your focus into a creative challenge.", personalityId: 'creative' }
    ]
  },
  {
    id: 4,
    text: "Select the quote that resonates most with your current life state:",
    options: [
      { text: "\"Be gentle with yourself. You are doing the best you can.\" — Unknown", personalityId: 'mentor' },
      { text: "\"Discipline is choosing between what you want now and what you want most.\" — Abraham Lincoln", personalityId: 'coach' },
      { text: "\"Simplify your life, and the universe will feel simpler.\" — Thoreau", personalityId: 'philosopher' },
      { text: "\"Creativity is intelligence having fun.\" — Albert Einstein", personalityId: 'creative' }
    ]
  }
];
