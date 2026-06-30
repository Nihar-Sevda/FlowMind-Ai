import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Notebook, 
  CheckCircle, 
  Loader2, 
  Tag, 
  ChevronRight, 
  FileText,
  Bookmark,
  PlusCircle,
  HelpCircle
} from 'lucide-react';
import { QuickNote, Task, AIPersonality } from '../types';
import { TranslationSet } from '../data/translations';

interface AIEnhancedNotesProps {
  lang: 'en' | 'hi';
  t: (key: keyof TranslationSet) => string;
  onAddMultipleTasks: (newTasks: Omit<Task, 'id' | 'completed' | 'calendarSynced'>[]) => void;
  currentPersonality: AIPersonality;
}

export default function AIEnhancedNotes({ lang, t, onAddMultipleTasks, currentPersonality }: AIEnhancedNotesProps) {
  const [activeSubTab, setActiveSubTab] = useState<'scratchpad' | 'splitter'>('scratchpad');
  const [notes, setNotes] = useState<QuickNote[]>(() => {
    const saved = localStorage.getItem('flowmind_quick_notes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    // High-fidelity fallback notes
    return [
      {
        id: 'n1',
        title: lang === 'hi' ? '🌟FlowMind मुख्य उद्देश्य' : '🌟 FlowMind Main Strategy',
        topic: 'Productivity',
        content: lang === 'hi' 
          ? '### रफ विचार\n- हमें हर कार्य को टालने से बचाना है।\n- ट्रीज विकल्प काफी उपयोगी है।\n- समय सारिणी बेहतर बनाएं।'
          : '### Raw Strategy Draft\n- Prioritize critical rescue tasks before others.\n- Run Pomodoro sessions to maintain absolute traction.\n- AI companion helps push back against stress spikes.',
        createdAt: new Date().toLocaleDateString()
      }
    ];
  });

  // Notes state
  const [newTitle, setNewTitle] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newContent, setNewContent] = useState('');
  const [enhancingNoteId, setEnhancingNoteId] = useState<string | null>(null);

  // Splitter state
  const [splitGoal, setSplitGoal] = useState('');
  const [splitting, setSplitting] = useState(false);
  const [splitResults, setSplitResults] = useState<{
    title: string;
    urgency: 'critical' | 'high' | 'medium' | 'low';
    duration: number;
    category: string;
  }[]>([]);
  const [successMsg, setSuccessMsg] = useState('');

  // Sync notes to local storage
  useEffect(() => {
    localStorage.setItem('flowmind_quick_notes', JSON.stringify(notes));
  }, [notes]);

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    const note: QuickNote = {
      id: 'note_' + Date.now(),
      title: newTitle.trim() || (lang === 'hi' ? 'शीर्षकहीन नोट' : 'Untitled Note'),
      topic: newTopic.trim() || (lang === 'hi' ? 'सामान्य' : 'General'),
      content: newContent,
      createdAt: new Date().toLocaleString()
    };

    setNotes([note, ...notes]);
    setNewTitle('');
    setNewTopic('');
    setNewContent('');
  };

  const handleDeleteNote = (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
  };

  const handleEnhanceNote = async (noteId: string) => {
    const noteToEnhance = notes.find(n => n.id === noteId);
    if (!noteToEnhance) return;

    setEnhancingNoteId(noteId);
    try {
      const res = await fetch('/api/enhance-note', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: noteToEnhance.content,
          title: noteToEnhance.title,
          lang
        })
      });

      if (!res.ok) throw new Error('Enhancement failed');
      const data = await res.json();
      
      setNotes(notes.map(n => {
        if (n.id === noteId) {
          return {
            ...n,
            title: data.title || n.title,
            content: data.content || n.content
          };
        }
        return n;
      }));
    } catch (err) {
      console.error('Enhance note failed:', err);
    } finally {
      setEnhancingNoteId(null);
    }
  };

  const handleSplitGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!splitGoal.trim()) return;

    setSplitting(true);
    setSuccessMsg('');
    try {
      const res = await fetch('/api/split-goal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          goal: splitGoal,
          lang
        })
      });

      if (!res.ok) throw new Error('Goal split failed');
      const data = await res.json();
      setSplitResults(data.subtasks || []);
    } catch (err) {
      console.error('Goal splitting failed:', err);
    } finally {
      setSplitting(false);
    }
  };

  const handleAddSplitTasksToPlanner = () => {
    if (splitResults.length === 0) return;

    // Convert to target model structure
    const formatted = splitResults.map(r => ({
      title: r.title,
      urgency: r.urgency,
      category: r.category || 'Split Goal',
      duration: r.duration || 25,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().split('T')[0] // Tomorrow as default
    }));

    onAddMultipleTasks(formatted);
    setSplitResults([]);
    setSplitGoal('');
    setSuccessMsg(lang === 'hi' ? 'सभी उप-कार्य सफलतापूर्वक आपके डेडलॉइन नियोजक में जोड़ दिए गए हैं!' : 'All sub-tasks successfully imported to your Deadline Planner!');
  };

  // Simple formatter to parse raw lines, bold, and list elements in a beautiful styling
  const renderFormattedContent = (content: string) => {
    return content.split('\n').map((line, index) => {
      let trimmed = line.trim();
      if (!trimmed) return <div key={index} className="h-2" />;

      // Headers
      if (trimmed.startsWith('###')) {
        return <h4 key={index} className="text-xs font-bold font-display uppercase tracking-wider text-indigo-500 dark:text-indigo-400 mt-3 mb-1.5">{trimmed.replace('###', '').trim()}</h4>;
      }
      if (trimmed.startsWith('##')) {
        return <h3 key={index} className="text-sm font-extrabold font-display text-zinc-900 dark:text-zinc-100 mt-4 mb-2">{trimmed.replace('##', '').trim()}</h3>;
      }
      
      // Bullets
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        let contentText = trimmed.substring(1).trim();
        // Bold parsing inside bullet
        return (
          <li key={index} className="text-[11.5px] text-zinc-600 dark:text-zinc-400 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-indigo-400 mb-1 leading-relaxed">
            {parseBoldText(contentText)}
          </li>
        );
      }

      return <p key={index} className="text-[11.5px] text-zinc-600 dark:text-zinc-400 leading-relaxed mb-1.5">{parseBoldText(trimmed)}</p>;
    });
  };

  const parseBoldText = (text: string) => {
    const regex = /\*\*(.*?)\*\*/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(<strong key={match.index} className="font-semibold text-zinc-800 dark:text-zinc-200">{match[1]}</strong>);
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Header Banner */}
      <div className="p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-900 bg-white dark:bg-zinc-900/30 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Notebook className="w-5 h-5 text-indigo-500" />
            <h2 className="font-display font-extrabold text-base tracking-tight text-zinc-900 dark:text-white">
              {t('quickNotes')}
            </h2>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-xl font-medium">
            {t('notesSubtitle')}
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-zinc-100 dark:bg-zinc-950 p-1 rounded-2xl border border-zinc-200/60 dark:border-zinc-900 self-stretch md:self-auto">
          <button
            onClick={() => setActiveSubTab('scratchpad')}
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === 'scratchpad'
                ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-sm border border-zinc-200/80 dark:border-zinc-850'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            {lang === 'hi' ? 'स्क्रैचपैड' : 'Scratchpad'}
          </button>
          <button
            onClick={() => setActiveSubTab('splitter')}
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === 'splitter'
                ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-sm border border-zinc-200/80 dark:border-zinc-850'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
            {t('aiSplitTask')}
          </button>
        </div>
      </div>

      {activeSubTab === 'scratchpad' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Note Input Form */}
          <div className="lg:col-span-1 p-5 rounded-3xl border border-zinc-200/80 dark:border-zinc-900 bg-white dark:bg-zinc-900/30 shadow-sm space-y-4">
            <h3 className="font-display font-extrabold text-xs text-zinc-900 dark:text-zinc-150 uppercase tracking-wider font-mono">
              {lang === 'hi' ? '✍️ नया नोट दर्ज करें' : '✍️ Create New Note'}
            </h3>

            <form onSubmit={handleSaveNote} className="space-y-3">
              <div>
                <input
                  type="text"
                  placeholder={t('noteTitlePlaceholder')}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 text-zinc-800 dark:text-white"
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder={t('noteTopicLabel')}
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 text-zinc-800 dark:text-white"
                />
              </div>

              <div>
                <textarea
                  rows={6}
                  placeholder={t('addNotePlaceholder')}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full p-3 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 text-zinc-800 dark:text-white resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                {t('saveNote')}
              </button>
            </form>
          </div>

          {/* Notes list display */}
          <div className="lg:col-span-2 space-y-4">
            {notes.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-zinc-900/10 border border-dashed border-zinc-200 dark:border-zinc-900 rounded-3xl text-zinc-500">
                <Bookmark className="w-8 h-8 mx-auto mb-2 text-indigo-500/30" />
                <p className="text-xs font-sans font-semibold">{t('noNotesFound')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="p-5 rounded-3xl border border-zinc-200/80 dark:border-zinc-900 bg-white dark:bg-zinc-900/30 shadow-sm relative flex flex-col justify-between group transition-all hover:border-indigo-500/40"
                  >
                    <div className="space-y-3">
                      {/* Note Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-mono font-extrabold uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10 mb-1.5">
                            <Tag className="w-2.5 h-2.5" />
                            {note.topic}
                          </span>
                          <h4 className="font-display font-extrabold text-sm text-zinc-800 dark:text-zinc-100 line-clamp-1">
                            {note.title}
                          </h4>
                        </div>
                        
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1 text-zinc-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-950 cursor-pointer"
                          title="Delete Note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Note Body */}
                      <div className="border-t border-zinc-100 dark:border-zinc-900/60 pt-3">
                        <div className="space-y-1 font-sans text-[11px]">
                          {renderFormattedContent(note.content)}
                        </div>
                      </div>
                    </div>

                    {/* Note Footer actions */}
                    <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-900/60 pt-3 mt-4 text-[9px] font-mono text-zinc-400">
                      <span>{note.createdAt}</span>
                      
                      <button
                        onClick={() => handleEnhanceNote(note.id)}
                        disabled={enhancingNoteId === note.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10 cursor-pointer transition-all disabled:opacity-50"
                      >
                        {enhancingNoteId === note.id ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {t('aiEnhancing')}
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3" />
                            {t('aiEnhanceNote')}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'splitter' && (
        <div className="max-w-3xl mx-auto p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-900 bg-white dark:bg-zinc-900/30 shadow-sm space-y-6">
          <div className="space-y-1.5 text-center">
            <h3 className="font-display font-extrabold text-sm text-zinc-900 dark:text-white uppercase tracking-wider font-mono flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
              {t('aiTaskSplitterTitle')}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
              {t('aiTaskSplitterDesc')}
            </p>
          </div>

          <form onSubmit={handleSplitGoal} className="flex gap-2 max-w-xl mx-auto">
            <input
              type="text"
              placeholder={t('splitPlaceholder')}
              value={splitGoal}
              onChange={(e) => setSplitGoal(e.target.value)}
              className="flex-1 px-4 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 text-zinc-800 dark:text-white"
              required
            />
            <button
              type="submit"
              disabled={splitting}
              className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
            >
              {splitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {lang === 'hi' ? 'विभाजित कर रहा है...' : 'Splitting...'}
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  {t('aiSplitButton')}
                </>
              )}
            </button>
          </form>

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 text-emerald-500 border border-emerald-500/15 rounded-2xl text-xs font-medium flex items-center gap-2 max-w-xl mx-auto animate-in fade-in duration-200">
              <CheckCircle className="w-4 h-4" />
              <span>{successMsg}</span>
            </div>
          )}

          {splitResults.length > 0 && (
            <div className="space-y-4 max-w-xl mx-auto border-t border-zinc-100 dark:border-zinc-900/60 pt-6 animate-in fade-in duration-300">
              <h4 className="text-[11px] font-mono font-extrabold text-zinc-400 uppercase tracking-widest text-center">
                {lang === 'hi' ? '💡 प्रस्तावित उप-कार्य अनुक्रम' : '💡 Proposed Sub-Task Sequence'}
              </h4>

              <div className="space-y-2.5">
                {splitResults.map((sub, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-900 rounded-2xl flex items-center justify-between gap-3 relative overflow-hidden"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/15 text-indigo-500 flex items-center justify-center font-mono text-[10px] font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <h5 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          {sub.title}
                        </h5>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider">{sub.category}</span>
                          <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-800" />
                          <span className="text-[9px] font-mono text-zinc-400">{sub.duration} {lang === 'hi' ? 'मिनट' : 'mins'}</span>
                        </div>
                      </div>
                    </div>

                    <span className={`text-[8px] uppercase tracking-wider font-mono font-extrabold px-1.5 py-0.5 rounded ${
                      sub.urgency === 'critical' ? 'bg-rose-500/10 text-rose-500'
                        : sub.urgency === 'high' ? 'bg-amber-500/10 text-amber-500'
                        : sub.urgency === 'medium' ? 'bg-indigo-500/10 text-indigo-500'
                        : 'bg-emerald-500/10 text-emerald-500'
                    }`}>
                      {sub.urgency}
                    </span>
                  </div>
                ))}
              </div>

              <div className="text-center pt-2">
                <button
                  onClick={handleAddSplitTasksToPlanner}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  {lang === 'hi' ? 'सभी को नियोजक में जोड़ें' : 'Import All Sub-Tasks to Planner'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
