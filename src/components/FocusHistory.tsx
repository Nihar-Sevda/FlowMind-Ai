import React, { useState } from 'react';
import { FocusSession } from '../types';
import { 
  Clock, 
  Trash2, 
  Filter, 
  Flame, 
  Coffee, 
  BrainCircuit, 
  Sparkles, 
  TrendingUp,
  Calendar
} from 'lucide-react';

interface FocusHistoryProps {
  sessions: FocusSession[];
  onClearHistory: () => void;
  lang: 'en' | 'hinglish';
}

export default function FocusHistory({ sessions, onClearHistory, lang }: FocusHistoryProps) {
  const [filter, setFilter] = useState<'all' | 'work' | 'break'>('all');

  const filteredSessions = sessions.filter(session => {
    if (filter === 'work') return session.mode === 'work';
    if (filter === 'break') return session.mode === 'shortBreak' || session.mode === 'longBreak';
    return true;
  });

  // Calculate statistics
  const workSessionsCount = sessions.filter(s => s.mode === 'work').length;
  const totalFocusMinutes = sessions
    .filter(s => s.mode === 'work')
    .reduce((acc, curr) => acc + curr.durationMinutes, 0);

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900/30 border border-zinc-200/80 dark:border-zinc-900 rounded-3xl p-6 shadow-sm dark:shadow-none animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-zinc-150 dark:border-zinc-900/60">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-500" />
            <h3 className="font-display font-bold text-sm text-zinc-900 dark:text-zinc-200 uppercase tracking-wider">
              {lang === 'hinglish' ? 'Focus Session History' : 'Focus Session History'}
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {lang === 'hinglish' 
              ? 'Aapke completed deep work sessions aur breaks ka log.' 
              : 'A secure log of your completed focus blocks and interval metrics.'}
          </p>
        </div>

        {sessions.length > 0 && (
          <button
            onClick={onClearHistory}
            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-xl border border-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{lang === 'hinglish' ? 'History Clear Karen' : 'Clear Log'}</span>
          </button>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-zinc-50/50 dark:bg-zinc-950/40 rounded-2xl border border-zinc-150 dark:border-zinc-900/40 flex items-center gap-3.5">
          <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono text-zinc-450 dark:text-zinc-500 block mb-0.5">
              {lang === 'hinglish' ? 'Total Focus Time' : 'Total Focus Time'}
            </span>
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              {totalFocusMinutes} {lang === 'hinglish' ? 'Minutes' : 'Minutes'}
            </span>
          </div>
        </div>

        <div className="p-4 bg-zinc-50/50 dark:bg-zinc-950/40 rounded-2xl border border-zinc-150 dark:border-zinc-900/40 flex items-center gap-3.5">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono text-zinc-450 dark:text-zinc-500 block mb-0.5">
              {lang === 'hinglish' ? 'Completed Blocks' : 'Completed Blocks'}
            </span>
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              {workSessionsCount} {lang === 'hinglish' ? 'Sessions' : 'Sessions'}
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs font-mono text-zinc-400 mr-2 flex items-center gap-1">
          <Filter className="w-3 h-3" /> Filter:
        </span>
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
            filter === 'all'
              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-850 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
          }`}
        >
          {lang === 'hinglish' ? 'Sabhi' : 'All'}
        </button>
        <button
          onClick={() => setFilter('work')}
          className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
            filter === 'work'
              ? 'bg-amber-600 border-amber-600 text-white'
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-850 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
          }`}
        >
          <Flame className="w-3 h-3" />
          {lang === 'hinglish' ? 'Focus Sessions' : 'Focus Sessions'}
        </button>
        <button
          onClick={() => setFilter('break')}
          className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
            filter === 'break'
              ? 'bg-sky-600 border-sky-600 text-white'
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-850 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
          }`}
        >
          <Coffee className="w-3 h-3" />
          {lang === 'hinglish' ? 'Recovery Breaks' : 'Breaks'}
        </button>
      </div>

      {/* List */}
      {filteredSessions.length === 0 ? (
        <div className="py-8 text-center bg-zinc-50/50 dark:bg-zinc-950/20 rounded-2xl border border-zinc-150 dark:border-zinc-900/40">
          <Sparkles className="w-6 h-6 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans">
            {lang === 'hinglish' ? 'Koi session record nahi mila.' : 'No completed sessions logged yet in this category.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
          {filteredSessions.map(session => (
            <div
              key={session.id}
              className="p-3.5 bg-zinc-50/30 dark:bg-zinc-900/10 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 rounded-2xl border border-zinc-150/80 dark:border-zinc-850/60 transition-all flex items-center justify-between gap-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                {session.mode === 'work' ? (
                  <span className="p-2 bg-amber-500/10 text-amber-500 rounded-xl shrink-0">
                    <Flame className="w-4 h-4" />
                  </span>
                ) : (
                  <span className="p-2 bg-sky-500/10 text-sky-500 rounded-xl shrink-0">
                    <Coffee className="w-4 h-4" />
                  </span>
                )}
                <div>
                  <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    {session.taskTitle}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {formatTimestamp(session.timestamp)}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                    <span className="text-[10px] font-mono font-semibold text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
                      <BrainCircuit className="w-3 h-3" /> {session.companionName}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 block">
                  +{session.durationMinutes}m
                </span>
                <span className="text-[9px] uppercase font-mono text-zinc-400 tracking-wider">
                  {session.mode === 'work' ? 'work' : 'break'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
