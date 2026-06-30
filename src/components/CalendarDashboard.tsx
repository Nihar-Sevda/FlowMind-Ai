import React, { useState, useEffect } from 'react';
import { CalendarEvent } from '../types';
import { Calendar, Plus, RefreshCw, AlertCircle, Clock, MapPin, Check, PlusCircle, CheckCircle2, ShieldAlert, Zap, Layers } from 'lucide-react';
import { getAccessToken, connectGoogleCalendar } from '../firebase';

interface CalendarDashboardProps {
  onAddFocusBlock?: (title: string, duration: number) => void;
  accentColor?: string;
  borderColor?: string;
  textColor?: string;
}

// Beautiful initial fallback events to guarantee high visual fidelity immediately
const MOCK_EVENTS: CalendarEvent[] = [
  {
    id: 'mock-1',
    summary: '🧠 AI Flow Planning Session',
    description: 'Establish priorities for the upcoming flow cycles with FlowMind.',
    triagePriority: 'CRITICAL RESCUE',
    start: { dateTime: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString() }, // in 2 hours
    end: { dateTime: new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString() }
  },
  {
    id: 'mock-2',
    summary: '☕ Mindful Reflection Break',
    description: 'Step away from screen, hydrate, and stretch.',
    triagePriority: 'FLEXIBLE DEPTH',
    start: { dateTime: new Date(Date.now() + 1000 * 60 * 60 * 5).toISOString() },
    end: { dateTime: new Date(Date.now() + 1000 * 60 * 60 * 5.5).toISOString() }
  },
  {
    id: 'mock-3',
    summary: '💻 Deep Work Block: Core Engineering',
    description: 'Pure mono-tasking focus block. Zen drone ambient active.',
    triagePriority: 'STANDARD ACTION',
    start: { dateTime: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString() }, // tomorrow
    end: { dateTime: new Date(Date.now() + 1000 * 60 * 60 * 26).toISOString() }
  }
];

// Simple intelligent auto-classifier for event importances
function classifyEventPriority(summary: string): 'CRITICAL RESCUE' | 'STANDARD ACTION' | 'FLEXIBLE DEPTH' {
  const norm = summary.toLowerCase();
  if (norm.includes('deadline') || norm.includes('exam') || norm.includes('test') || norm.includes('crit') || norm.includes('launch') || norm.includes('urgent') || norm.includes('ai')) {
    return 'CRITICAL RESCUE';
  }
  if (norm.includes('meeting') || norm.includes('work') || norm.includes('code') || norm.includes('sync') || norm.includes('engineering') || norm.includes('dev')) {
    return 'STANDARD ACTION';
  }
  return 'FLEXIBLE DEPTH';
}

export default function CalendarDashboard({ onAddFocusBlock, accentColor = 'bg-indigo-600', borderColor = 'border-zinc-800', textColor = 'text-indigo-400' }: CalendarDashboardProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isCloudSync, setIsCloudSync] = useState<boolean>(false);
  const [manualToken, setManualToken] = useState<string>('');
  const [showTokenInput, setShowTokenInput] = useState<boolean>(false);
  
  // Layout states for different visualization views
  const [layoutMode, setLayoutMode] = useState<'timeline' | 'weekly' | 'monthly'>('timeline');
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [monthOffset, setMonthOffset] = useState<number>(0);
  const [selectedMonthDate, setSelectedMonthDate] = useState<Date>(new Date());
  
  // Create Event Form state
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [summary, setSummary] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [duration, setDuration] = useState<number>(25);
  const [startTime, setStartTime] = useState<string>(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 10);
    return now.toISOString().substring(0, 16);
  });
  const [formSuccess, setFormSuccess] = useState<boolean>(false);

  // Connect Google Account for Calendar
  const handleConnectGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await connectGoogleCalendar();
      if (token) {
        setIsCloudSync(true);
        fetchCalendarEvents(token);
      }
    } catch (err: any) {
      console.error('Failed to link Google Calendar:', err);
      setError('Failed to connect Google Account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper: Get events for a specific local date
  const getEventsForDate = (date: Date) => {
    const dateString = date.toLocaleDateString([], { year: 'numeric', month: '2-digit', day: '2-digit' });
    return events.filter(event => {
      const eventStartDate = event.start.dateTime || event.start.date;
      if (!eventStartDate) return false;
      const eventDateStr = new Date(eventStartDate).toLocaleDateString([], { year: 'numeric', month: '2-digit', day: '2-digit' });
      return eventDateStr === dateString;
    });
  };

  // Helper: Calculate the 7 days of the current/offset week
  const getWeeklyDays = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const startOfWeek = new Date(today);
    // Align to Sunday as the start of the week
    startOfWeek.setDate(today.getDate() - dayOfWeek + (weekOffset * 7));
    
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
    return days;
  };

  // Helper: Calculate the grid days of the current/offset month
  const getMonthlyData = () => {
    const today = new Date();
    const targetDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    const startDayOfWeek = firstDayOfMonth.getDay();
    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({ date: d, isCurrentMonth: false });
    }
    
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({ date: d, isCurrentMonth: true });
    }
    
    const totalGridCells = days.length <= 35 ? 35 : 42;
    const nextMonthDaysNeeded = totalGridCells - days.length;
    for (let i = 1; i <= nextMonthDaysNeeded; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, isCurrentMonth: false });
    }
    
    return {
      days,
      monthName: targetDate.toLocaleDateString([], { month: 'long', year: 'numeric' }),
    };
  };

  // Fetch real Google Calendar events
  const fetchCalendarEvents = async (providedToken?: string) => {
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      
      const cachedToken = await getAccessToken();
      const tokenToUse = providedToken || manualToken || cachedToken || localStorage.getItem('gcal_access_token');
      if (tokenToUse) {
        headers['x-client-token'] = tokenToUse;
      }

      const res = await fetch(`/api/calendar/events${tokenToUse ? `?token=${encodeURIComponent(tokenToUse)}` : ''}`, { headers });
      
      if (res.status === 401) {
        setIsCloudSync(false);
        // Fallback gracefully
        setEvents(MOCK_EVENTS);
        setShowTokenInput(true);
        return;
      }

      if (!res.ok) {
        throw new Error(`Failed to load Google Calendar events: status ${res.status}`);
      }

      const data = await res.json();
      if (data.items && Array.isArray(data.items)) {
        // Map and auto-classify Google Calendar Events
        const mapped: CalendarEvent[] = data.items.map((evt: any) => ({
          ...evt,
          triagePriority: classifyEventPriority(evt.summary || '')
        }));
        setEvents(mapped);
        setIsCloudSync(true);
        setError(null);
      } else {
        setEvents(MOCK_EVENTS);
      }
    } catch (err: any) {
      console.warn('Google Calendar fetch issue:', err);
      setEvents(MOCK_EVENTS);
      setIsCloudSync(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarEvents();
  }, []);

  const saveManualToken = () => {
    if (manualToken.trim()) {
      localStorage.setItem('gcal_access_token', manualToken.trim());
      fetchCalendarEvents(manualToken.trim());
      setShowTokenInput(false);
    }
  };

  const clearManualToken = () => {
    localStorage.removeItem('gcal_access_token');
    setManualToken('');
    setIsCloudSync(false);
    setEvents(MOCK_EVENTS);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) return;

    setLoading(true);
    setFormSuccess(false);

    const startDateTime = new Date(startTime);
    const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      const cachedToken = await getAccessToken();
      const tokenToUse = manualToken || cachedToken || localStorage.getItem('gcal_access_token');
      if (tokenToUse) {
        headers['x-client-token'] = tokenToUse;
      }

      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          summary,
          description,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
        }),
      });

      if (!res.ok) {
        throw new Error('API returned failure code for creating event');
      }

      setFormSuccess(true);
      setSummary('');
      setDescription('');
      
      fetchCalendarEvents();
      
      setTimeout(() => {
        setFormSuccess(false);
        setShowAddForm(false);
      }, 2500);

    } catch (err) {
      console.warn('Failed to add calendar event on cloud, adding to local/simulated events...', err);
      const newEvent: CalendarEvent = {
        id: `mock-${Date.now()}`,
        summary: summary,
        description: description || 'Simulated focus session',
        triagePriority: classifyEventPriority(summary),
        start: { dateTime: startDateTime.toISOString() },
        end: { dateTime: endDateTime.toISOString() }
      };
      setEvents(prev => [newEvent, ...prev]);
      setFormSuccess(true);
      setSummary('');
      setDescription('');
      
      setTimeout(() => {
        setFormSuccess(false);
        setShowAddForm(false);
      }, 2500);
    } finally {
      setLoading(false);
    }
  };

  const formatEventTime = (dateTimeString?: string) => {
    if (!dateTimeString) return 'All day';
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const formatEventDate = (dateTimeString?: string) => {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' });
  };

  return (
    <div id="calendar-sync-card" className="bg-white dark:bg-zinc-950/40 border border-zinc-200/80 dark:border-zinc-900 rounded-3xl p-6 shadow-sm dark:shadow-xl transition-all duration-300">
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 rounded-xl border border-indigo-500/10">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-zinc-800 dark:text-zinc-100">
              Interactive Google Calendar
            </h3>
            <p className="text-[11px] text-zinc-500 font-sans">
              Proactive auto-triage schedule sync
            </p>
          </div>
        </div>

        {/* Refresh button */}
        <button
          onClick={() => fetchCalendarEvents()}
          disabled={loading}
          className="p-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 rounded-lg transition-all"
          title="Refresh schedule"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-xs rounded-xl flex gap-2 items-start">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Sync Status Badge */}
      <div className="mb-4 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-150 dark:border-zinc-900/60 flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase text-zinc-500">Sync Status:</span>
        <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-md ${
          isCloudSync 
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
        }`}>
          {isCloudSync ? 'Authorized Cloud Link' : 'Simulated Sandbox'}
        </span>
      </div>

      {/* Google Calendar Link Button */}
      {!isCloudSync && (
        <div className="mb-5 bg-gradient-to-tr from-indigo-500/5 to-purple-600/5 border border-indigo-500/10 p-4 rounded-2xl">
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-3 leading-normal font-sans">
            FlowMind seamlessly scans your Google Calendar to auto-prioritize deadlines and build custom focus sessions.
          </p>
          <button
            onClick={handleConnectGoogle}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-all shadow-md hover:shadow-indigo-500/10 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Calendar className="w-3.5 h-3.5" />
                <span>Link Google Calendar</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* View Switcher Toggle */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-100 dark:bg-zinc-950 rounded-xl mb-5 border border-zinc-200/50 dark:border-zinc-900">
        <button
          onClick={() => setLayoutMode('timeline')}
          className={`py-1.5 text-[10px] font-bold font-sans rounded-lg transition-all cursor-pointer ${
            layoutMode === 'timeline'
              ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-200'
          }`}
        >
          Timeline
        </button>
        <button
          onClick={() => setLayoutMode('weekly')}
          className={`py-1.5 text-[10px] font-bold font-sans rounded-lg transition-all cursor-pointer ${
            layoutMode === 'weekly'
              ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-200'
          }`}
        >
          Weekly
        </button>
        <button
          onClick={() => setLayoutMode('monthly')}
          className={`py-1.5 text-[10px] font-bold font-sans rounded-lg transition-all cursor-pointer ${
            layoutMode === 'monthly'
              ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-200'
          }`}
        >
          Monthly
        </button>
      </div>

      {/* Create Event Trigger */}
      {!showAddForm ? (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full mb-5 py-2.5 px-4 border border-dashed border-zinc-300 dark:border-zinc-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 rounded-2xl text-[11px] text-zinc-500 dark:text-zinc-400 font-sans font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          Schedule Triage Block on Calendar
        </button>
      ) : (
        <form onSubmit={handleCreateEvent} className="mb-5 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-950/40 space-y-3.5 relative">
          <h4 className="font-display font-bold text-xs text-zinc-800 dark:text-zinc-200">
            Create Schedule Block
          </h4>
          
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Task Block Name (e.g., Code Launch Triage)"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-800 dark:text-zinc-100"
            />
            <input
              type="text"
              placeholder="Rescue description / target details"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-mono uppercase text-zinc-500 mb-1">
                Start Date/Time
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-800 dark:text-zinc-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-[9px] font-mono uppercase text-zinc-500 mb-1">
                Rescue Block Length
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-700 dark:text-zinc-300"
              >
                <option value={15}>15 Mins</option>
                <option value={25}>25 Mins (Pomodoro)</option>
                <option value={45}>45 Mins (Standard Focus)</option>
                <option value={60}>1 Hour</option>
                <option value={120}>2 Hours (Double Block)</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 dark:text-zinc-400 font-sans text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-1.5 text-xs text-white rounded-xl font-sans font-semibold hover:opacity-90 transition-all flex items-center gap-1 ${accentColor}`}
            >
              <Plus className="w-3.5 h-3.5" />
              Schedule Block
            </button>
          </div>

          {formSuccess && (
            <div className="absolute inset-0 bg-white dark:bg-zinc-950 flex flex-col items-center justify-center rounded-2xl border border-zinc-200 dark:border-zinc-900">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400 animate-bounce mb-1" />
              <p className="text-xs font-sans font-bold text-zinc-800 dark:text-zinc-200">
                Rescue Block Synced!
              </p>
              <p className="text-[10px] text-zinc-500 font-sans">
                Calendar timelines updated
              </p>
            </div>
          )}
        </form>
      )}

      {/* CONDITIONAL RENDER BY LAYOUT MODE */}
      {layoutMode === 'timeline' && (
        <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
          {events.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-xs font-sans">No scheduled timelines today</p>
            </div>
          ) : (
            events.map((event) => {
              const urgency = event.triagePriority || 'STANDARD ACTION';
              const urgencyColor = urgency === 'CRITICAL RESCUE' 
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' 
                : urgency === 'STANDARD ACTION' 
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20';

              return (
                <div
                  key={event.id}
                  className="p-4 rounded-2xl border border-zinc-150 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-950/40 hover:bg-zinc-100/50 dark:hover:bg-zinc-950 transition-all group relative overflow-hidden"
                >
                  {/* Left accent block */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                    urgency === 'CRITICAL RESCUE' ? 'bg-rose-500' 
                      : urgency === 'STANDARD ACTION' ? 'bg-amber-500' 
                      : 'bg-indigo-500'
                  }`} />

                  <div className="flex justify-between items-start mb-1.5 pl-1.5">
                    <h4 className="font-sans font-semibold text-xs text-zinc-800 dark:text-zinc-200 leading-snug group-hover:text-zinc-950 dark:group-hover:text-white transition-colors pr-2">
                      {event.summary}
                    </h4>
                    <span className="text-[9px] font-mono text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-1.5 py-0.5 rounded whitespace-nowrap shadow-sm">
                      {formatEventTime(event.start.dateTime || event.start.date)}
                    </span>
                  </div>

                  {event.description && (
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-sans leading-normal pl-1.5 line-clamp-2">
                      {event.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-3 mt-3 pl-1.5 border-t border-zinc-100 dark:border-zinc-900/40 pt-2">
                    <span className="text-[9px] font-mono text-zinc-500 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formatEventDate(event.start.dateTime || event.start.date)}
                    </span>
                    
                    <span className={`text-[8px] uppercase font-mono tracking-wider font-extrabold px-1.5 py-0.5 rounded ${urgencyColor}`}>
                      {urgency}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {layoutMode === 'weekly' && (
        <div className="space-y-4">
          {/* Weekly Navigation */}
          <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-950 p-2 rounded-xl border border-zinc-150 dark:border-zinc-900/40">
            <button
              onClick={() => setWeekOffset(prev => prev - 1)}
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer text-xs font-bold"
            >
              &larr;
            </button>
            <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold text-zinc-600 dark:text-zinc-400">
              {getWeeklyDays()[0].toLocaleDateString([], { month: 'short', day: 'numeric' })} - {getWeeklyDays()[6].toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <button
              onClick={() => setWeekOffset(prev => prev + 1)}
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer text-xs font-bold"
            >
              &rarr;
            </button>
          </div>

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {getWeeklyDays().map((day) => {
              const dayEvents = getEventsForDate(day);
              const isToday = day.toDateString() === new Date().toDateString();
              return (
                <div 
                  key={day.toISOString()} 
                  className={`p-3 rounded-2xl border transition-all ${
                    isToday 
                      ? 'bg-indigo-500/5 border-indigo-500/20' 
                      : 'bg-zinc-50/50 dark:bg-zinc-950/20 border-zinc-150 dark:border-zinc-900/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold font-mono tracking-wider ${isToday ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-zinc-500 dark:text-zinc-400'}`}>
                      {day.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                      {isToday && " (Today)"}
                    </span>
                    <span className="text-[9px] font-mono text-zinc-400">
                      {dayEvents.length} {dayEvents.length === 1 ? 'Deadline' : 'Deadlines'}
                    </span>
                  </div>

                  {dayEvents.length === 0 ? (
                    <p className="text-[10px] text-zinc-400 italic font-sans py-1 pl-1">No deadlines scheduled</p>
                  ) : (
                    <div className="space-y-1.5">
                      {dayEvents.map(event => {
                        const urgency = event.triagePriority || 'STANDARD ACTION';
                        const dotColor = urgency === 'CRITICAL RESCUE' ? 'bg-rose-500' : urgency === 'STANDARD ACTION' ? 'bg-amber-500' : 'bg-indigo-500';
                        return (
                          <div key={event.id} className="flex items-center justify-between gap-3 p-1.5 bg-white dark:bg-zinc-900/60 rounded-xl border border-zinc-100 dark:border-zinc-900/40 hover:border-zinc-200 dark:hover:border-zinc-700 transition-all">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
                              <span className="text-[11px] font-sans font-semibold text-zinc-800 dark:text-zinc-250 truncate leading-snug">
                                {event.summary}
                              </span>
                            </div>
                            <span className="text-[9px] font-mono text-zinc-400 shrink-0">
                              {formatEventTime(event.start.dateTime || event.start.date)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {layoutMode === 'monthly' && (
        <div className="space-y-4">
          {/* Monthly Navigation */}
          <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-950 p-2 rounded-xl border border-zinc-150 dark:border-zinc-900/40">
            <button
              onClick={() => setMonthOffset(prev => prev - 1)}
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer text-xs font-bold"
            >
              &larr;
            </button>
            <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold text-zinc-600 dark:text-zinc-400">
              {getMonthlyData().monthName}
            </span>
            <button
              onClick={() => setMonthOffset(prev => prev + 1)}
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer text-xs font-bold"
            >
              &rarr;
            </button>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 gap-1 text-center bg-zinc-50 dark:bg-zinc-950 p-1.5 rounded-xl border border-zinc-100 dark:border-zinc-900/40">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(wd => (
              <span key={wd} className="text-[9px] font-mono font-bold uppercase text-zinc-400 dark:text-zinc-500">
                {wd}
              </span>
            ))}
          </div>

          {/* Grid of days */}
          <div className="grid grid-cols-7 gap-1">
            {getMonthlyData().days.map(({ date, isCurrentMonth }) => {
              const dayEvents = getEventsForDate(date);
              const isToday = date.toDateString() === new Date().toDateString();
              const isSelected = date.toDateString() === selectedMonthDate.toDateString();
              
              return (
                <button
                  type="button"
                  key={date.toISOString()}
                  onClick={() => setSelectedMonthDate(date)}
                  className={`aspect-square p-1 rounded-xl border flex flex-col justify-between items-center relative transition-all cursor-pointer ${
                    isToday
                      ? 'bg-indigo-600 text-white border-indigo-600 font-extrabold shadow-sm shadow-indigo-500/20'
                      : isSelected
                        ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-950 dark:text-white'
                        : isCurrentMonth
                          ? 'bg-white dark:bg-zinc-900/40 border-zinc-150 dark:border-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                          : 'bg-zinc-50/50 dark:bg-zinc-950/10 border-zinc-100 dark:border-zinc-900/20 text-zinc-300 dark:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900/40'
                  }`}
                >
                  <span className="text-[10px] font-mono">{date.getDate()}</span>
                  
                  {/* Event indicators (priorities) */}
                  <div className="flex gap-0.5 justify-center w-full overflow-hidden max-w-full">
                    {dayEvents.slice(0, 3).map(event => {
                      const urgency = event.triagePriority || 'STANDARD ACTION';
                      const indicatorColor = isToday 
                        ? 'bg-white' 
                        : urgency === 'CRITICAL RESCUE' 
                          ? 'bg-rose-500' 
                          : urgency === 'STANDARD ACTION' 
                            ? 'bg-amber-500' 
                            : 'bg-indigo-500';
                      return (
                        <span 
                          key={event.id} 
                          className={`w-1 h-1 rounded-full shrink-0 ${indicatorColor}`} 
                        />
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <span className={`text-[6px] leading-none font-bold font-sans ${isToday ? 'text-white' : 'text-zinc-400'}`}>+</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Day Event List */}
          <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950/40 rounded-2xl border border-zinc-200/50 dark:border-zinc-900/60 max-h-[160px] overflow-y-auto">
            <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-zinc-150 dark:border-zinc-900/40">
              <h4 className="text-[10px] font-bold font-mono uppercase text-zinc-500 dark:text-zinc-400">
                Deadlines for {selectedMonthDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </h4>
              <span className="text-[9px] font-mono text-zinc-400 font-bold">
                {getEventsForDate(selectedMonthDate).length} Deadlines
              </span>
            </div>

            {getEventsForDate(selectedMonthDate).length === 0 ? (
              <p className="text-[10px] text-zinc-400 italic text-center py-2">No deadlines scheduled</p>
            ) : (
              <div className="space-y-1.5">
                {getEventsForDate(selectedMonthDate).map(event => {
                  const urgency = event.triagePriority || 'STANDARD ACTION';
                  const dotColor = urgency === 'CRITICAL RESCUE' ? 'bg-rose-500' : urgency === 'STANDARD ACTION' ? 'bg-amber-500' : 'bg-indigo-500';
                  return (
                    <div key={event.id} className="p-2 bg-white dark:bg-zinc-900/60 rounded-xl border border-zinc-150 dark:border-zinc-900/40 flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                          <span className="text-[11px] font-sans font-semibold text-zinc-800 dark:text-zinc-250 truncate leading-snug">
                            {event.summary}
                          </span>
                        </div>
                        {event.description && (
                          <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-sans mt-0.5 pl-3 truncate">
                            {event.description}
                          </p>
                        )}
                      </div>
                      <span className="text-[9px] font-mono text-zinc-400 shrink-0">
                        {formatEventTime(event.start.dateTime || event.start.date)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Access Token fallback selector */}
      <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-900/40 text-center">
        <button
          onClick={() => setShowTokenInput(!showTokenInput)}
          className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 font-sans underline"
        >
          {showTokenInput ? 'Hide access token controls' : 'Advanced: Paste Google OAuth Access Token manually'}
        </button>
      </div>

      {showTokenInput && (
        <div className="mt-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-xs text-left">
          <div className="flex gap-2 items-start text-amber-600 dark:text-amber-400 mb-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="font-sans text-[11px] leading-normal text-zinc-600 dark:text-zinc-400">
              For manual sandbox development, paste an OAuth token below to fetch your personal calendars securely.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="Google Access Token"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl font-mono text-[11px] focus:outline-none focus:border-indigo-500 text-zinc-800 dark:text-zinc-100"
            />
            <button
              onClick={saveManualToken}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-sans text-xs font-semibold hover:shadow cursor-pointer"
            >
              Link
            </button>
          </div>
        </div>
      )}

      {isCloudSync && (
        <button
          onClick={clearManualToken}
          className="mt-4 text-[10px] text-zinc-500 hover:text-rose-500 font-mono mx-auto block hover:underline cursor-pointer"
        >
          Disconnect Google Account
        </button>
      )}
    </div>
  );
}
