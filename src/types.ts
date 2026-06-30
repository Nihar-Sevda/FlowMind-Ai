export interface AIPersonality {
  id: string;
  name: string;
  emoji: string;
  description: string;
  systemInstruction: string;
  tagline: string;
  accentClass: string; // e.g. "bg-emerald-500 text-emerald-50"
  bgGradientClass: string; // e.g. "from-emerald-400 to-teal-500"
  textColorClass: string; // e.g. "text-emerald-500"
  borderColorClass: string; // e.g. "border-emerald-200 dark:border-emerald-800"
  voiceFrequencies: number[]; // frequencies used for visualizer animation
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface QuizQuestion {
  id: number;
  text: string;
  options: {
    text: string;
    personalityId: string;
  }[];
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string; // YYYY-MM-DD format
  urgency: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  duration?: number; // duration in minutes
  survivalPlan?: string[]; // AI determined survival steps
  priorityExplanation?: string; // AI priority explanation
  triagePriority?: 'CRITICAL RESCUE' | 'STANDARD ACTION' | 'FLEXIBLE DEPTH';
  calendarSynced: boolean;
  calendarEventId?: string;
}

export type TimerMode = 'work' | 'shortBreak' | 'longBreak';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  triagePriority?: 'CRITICAL RESCUE' | 'STANDARD ACTION' | 'FLEXIBLE DEPTH';
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
}
