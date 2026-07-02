import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { synthManager } from './utils/audioSynth';
import { AIPersonality, Task, TimerMode } from './types';
import { AI_PERSONALITIES } from './data/personalities';
import PersonalityQuiz from './components/PersonalityQuiz';
import SlideToUnlock from './components/SlideToUnlock';
import FocusTimer from './components/FocusTimer';
import CalendarDashboard from './components/CalendarDashboard';
import AIOrbChat from './components/AIOrbChat';
import AIEnhancedNotes from './components/AIEnhancedNotes';
import RescueChart from './components/RescueChart';
import EnergyBurnoutAnalytics from './components/EnergyBurnoutAnalytics';
import { auth, googleSignIn, initAuth, logout, loginWithEmail, registerWithEmail } from './firebase';
import { User } from 'firebase/auth';
import { TRANSLATIONS, TranslationSet, TRANSLATE_URGENCY, USER_MODE_PREDICTIONS } from './data/translations';
import { LogOut, Bell, BellOff, Languages } from 'lucide-react';
import { 
  Compass, 
  Sparkles, 
  Check, 
  Plus, 
  Trash2, 
  Calendar, 
  Flame, 
  Moon, 
  Sun, 
  CheckCircle2, 
  Circle, 
  RefreshCw, 
  TrendingUp, 
  Clock, 
  HelpCircle, 
  Bot, 
  AlertCircle, 
  BrainCircuit,
  Settings,
  X,
  LayoutDashboard,
  ShieldAlert,
  Zap,
  CheckSquare,
  AlertTriangle,
  FileText,
  Copy,
  CheckSquare2,
  CalendarDays,
  PlayCircle,
  Notebook,
  ChevronLeft,
  ChevronRight,
  Music,
  HelpCircle as InfoIcon
} from 'lucide-react';

export default function App() {
  // Authentication states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authError, setAuthError] = useState<string | null>(null);

  // Theme state (persistent, defaults to dark eye-safe matte black)
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('flowmind_dark_mode');
    return saved ? saved === 'true' : true;
  });

  // Selected companion personality state
  const [currentPersonality, setCurrentPersonality] = useState<AIPersonality>(() => {
    const saved = localStorage.getItem('flowmind_selected_personality_id');
    const matched = AI_PERSONALITIES.find(p => p.id === saved);
    return matched || AI_PERSONALITIES[1]; // default to No-Nonsense Coach for crisis theme
  });

  // Check if onboarding diagnostic test is needed
  const [isOnboarding, setIsOnboarding] = useState<boolean>(() => {
    return !localStorage.getItem('flowmind_selected_personality_id');
  });
  const [onboardingStep, setOnboardingStep] = useState<'intro' | 'quiz'>('intro');

  // Custom Category Colors
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('flowmind_category_colors');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      'Engineering': '#3b82f6',
      'Crisis': '#ef4444',
      'Creative': '#ec4899',
      'Wellness Break': '#10b981',
      'AI Suggestion': '#8b5cf6',
      'Life': '#f97316',
      'Study': '#14b8a6',
    };
  });

  const [availableCategories, setAvailableCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('flowmind_available_categories');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return ['Engineering', 'Crisis', 'Creative', 'Wellness Break', 'AI Suggestion', 'Life', 'Study'];
  });

  const [activeColorEditingCategory, setActiveColorEditingCategory] = useState<string | null>(null);

  // Nuclear Option Lock State
  const [isNuclearLocked, setIsNuclearLocked] = useState<boolean>(false);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'planner' | 'focus' | 'calendar' | 'notes'>( 'dashboard' );

  // Safe tab switcher wrapper for Nuclear Option
  const handleTabChange = (tab: 'dashboard' | 'planner' | 'focus' | 'calendar' | 'notes') => {
    if (isNuclearLocked && activeTab === 'focus') {
      showToast(
        lang === 'hinglish'
          ? '🚨 NUCLEAR OPTION LOCK ACTIVE! Aap timer khatam hone se pehle doosre tab me nahi jaa sakte!'
          : '🚨 NUCLEAR OPTION LOCK ACTIVE! You cannot switch screens until the current focus session completes!'
      );
      return;
    }
    setActiveTab(tab);
  };

  useEffect(() => {
    localStorage.setItem('flowmind_category_colors', JSON.stringify(categoryColors));
  }, [categoryColors]);

  useEffect(() => {
    localStorage.setItem('flowmind_available_categories', JSON.stringify(availableCategories));
  }, [availableCategories]);

  // Sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('flowmind_sidebar_collapsed') === 'true';
  });

  // Active dynamic companion advice states
  const [activeAdvice, setActiveAdvice] = useState<string>('');
  const [loadingAdvice, setLoadingAdvice] = useState<boolean>(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const newVal = !prev;
      localStorage.setItem('flowmind_sidebar_collapsed', String(newVal));
      return newVal;
    });
  };

  // Task list state (persistent rescue targets)
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('flowmind_tasks');
    if (saved) {
      try { return JSON.parse(saved); } catch { return []; }
    }
    // High visual fidelity initial high-stakes targets
    return [
      { 
        id: 't1', 
        title: '🚀 Deploy Production Code Engine to Production Ingress', 
        completed: false, 
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().substring(0, 10), // tomorrow
        urgency: 'critical', 
        category: 'Engineering', 
        calendarSynced: false,
        triagePriority: 'CRITICAL RESCUE',
        priorityExplanation: 'Due within 24 hours with massive service dependency triggers.',
        survivalPlan: [
          '🔥 Isolate all workspace distractions and close social channels.',
          '⚡ Set up a 25-minute Pomodoro block to complete the build scripts.',
          '📝 Compile local configurations and check ingress route tables.'
        ]
      },
      { 
        id: 't2', 
        title: '📊 Review Quarterly High-Risk Security Audit Logs', 
        completed: false, 
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString().substring(0, 10), 
        urgency: 'high', 
        category: 'Crisis', 
        calendarSynced: false 
      },
      { 
        id: 't3', 
        title: '💡 Sketch visual layout for interactive client-side dashboard', 
        completed: true, 
        dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString().substring(0, 10), 
        urgency: 'low', 
        category: 'Creative', 
        calendarSynced: false 
      }
    ];
  });

  // Tracks checked-off individual survival steps for any task
  const [completedSurvivalSteps, setCompletedSurvivalSteps] = useState<Record<string, Record<string, boolean>>>(() => {
    const saved = localStorage.getItem('flowmind_survival_steps');
    if (saved) {
      try { return JSON.parse(saved); } catch { return {}; }
    }
    return {};
  });

  // Local productivity stats
  const [completedPomodoros, setCompletedPomodoros] = useState<number>(() => {
    return Number(localStorage.getItem('flowmind_pomodoros') || '4');
  });

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskUrgency, setNewTaskUrgency] = useState<'critical' | 'high' | 'medium' | 'low'>('high');
  const [newTaskCategory, setNewTaskCategory] = useState<string>('Engineering');
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() + 2);
    return date.toISOString().substring(0, 10);
  });

  // Loading state during AI Triage fetching
  const [triagingTaskId, setTriagingTaskId] = useState<string | null>(null);

  const [showQuizModal, setShowQuizModal] = useState<boolean>(false);
  const [celebratedTask, setCelebratedTask] = useState<Task | null>(null);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);
  const [greeting, setGreeting] = useState<string>('Initiate Rescue sequence');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [selectedTaskForFocus, setSelectedTaskForFocus] = useState<string>('');

  // 5-Minute Micro-Start results
  const [microStarts, setMicroStarts] = useState<Record<string, { action: string; encouragement: string; loading: boolean }>>({});

  const handleMicroStart = async (task: Task) => {
    // Set loading state for this task
    setMicroStarts(prev => ({
      ...prev,
      [task.id]: { action: '', encouragement: '', loading: true }
    }));

    try {
      const response = await fetch('/api/micro-start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          taskTitle: task.title,
          personality: currentPersonality,
          category: task.category,
          lang: lang
        })
      });

      if (!response.ok) throw new Error('Failed to fetch micro-start');

      const data = await response.json();
      setMicroStarts(prev => ({
        ...prev,
        [task.id]: {
          action: data.action || 'Just spend 5 minutes preparing your materials.',
          encouragement: data.encouragement || 'You got this!',
          loading: false
        }
      }));
    } catch (err) {
      console.error(err);
      setMicroStarts(prev => ({
        ...prev,
        [task.id]: {
          action: 'Open your primary workspace, set a 5-minute timer, and do just one tiny subtask.',
          encouragement: 'Starting is 95% of the battle. Break the ice now!',
          loading: false
        }
      }));
    }
  };

  // Language support ('en' | 'hinglish')
  const [lang, setLang] = useState<'en' | 'hinglish'>(() => {
    return (localStorage.getItem('flowmind_lang') as 'en' | 'hinglish') || 'en';
  });

  const handleToggleLang = () => {
    const nextLang = lang === 'en' ? 'hinglish' : 'en';
    setLang(nextLang);
    localStorage.setItem('flowmind_lang', nextLang);
  };

  // Browser-level exit interception hook
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isNuclearLocked && activeTab === 'focus') {
        const message = lang === 'hinglish'
          ? '🚨 WARNING: Nuclear Lock active hai! Agar aap abhi exit karenge toh aapka current focus session reset ho jayega!'
          : '🚨 WARNING: Nuclear Option Lock is active! Exiting or reloading now will interrupt your focus block and reset your streak!';
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isNuclearLocked, activeTab, lang]);

  // Track the previous user id to manage transitions
  const [prevUserId, setPrevUserId] = useState<string | null>(null);

  // Push notification state
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted' && localStorage.getItem('flowmind_notifications') === 'true';
    }
    return false;
  });

  // Bare Minimum Mode state
  const [bareMinimumMode, setBareMinimumMode] = useState<boolean>(() => {
    return localStorage.getItem('flowmind_bare_minimum_mode') === 'true';
  });

  // Translation helper
  const t = (key: keyof TranslationSet): string => {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS['en'][key];
  };

  // Auth state subscriber
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setNeedsAuth(false);
        setAuthChecking(false);
      },
      () => {
        if (auth.currentUser) {
          setCurrentUser(auth.currentUser);
          setNeedsAuth(false);
        } else {
          setCurrentUser(null);
          setNeedsAuth(true);
        }
        setAuthChecking(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Toast notifications
  const [activeToast, setActiveToast] = useState<{
    id: string;
    message: string;
    onUndo?: () => void;
  } | null>(null);

  const showToast = (message: string, onUndo?: () => void) => {
    const id = Math.random().toString();
    setActiveToast({ id, message, onUndo });
    setTimeout(() => {
      setActiveToast(prev => prev?.id === id ? null : prev);
    }, 5000);
  };

  // Zen Cooldown Day mode state
  const [isZenCooldownActive, setIsZenCooldownActive] = useState<boolean>(() => {
    return localStorage.getItem('flowmind_zen_cooldown') === 'true';
  });

  const handleToggleZenCooldown = (active: boolean) => {
    setIsZenCooldownActive(active);
    localStorage.setItem('flowmind_zen_cooldown', String(active));
    if (active) {
      showToast(lang === 'hinglish' ? "Zen Cooldown Rest Mode active ho gaya hai!" : "Zen Cooldown Rest Mode activated!", () => {
        setIsZenCooldownActive(false);
        localStorage.setItem('flowmind_zen_cooldown', 'false');
      });
    } else {
      synthManager.stop();
    }
  };

  // Keyboard shortcut: Esc to minimize / close modals
  useEffect(() => {
    const handleGlobalEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowQuizModal(false);
      }
    };
    window.addEventListener('keydown', handleGlobalEsc);
    return () => {
      window.removeEventListener('keydown', handleGlobalEsc);
    };
  }, [lang]);

  // 1. Sync theme class on mount/change
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('flowmind_dark_mode', String(darkMode));
  }, [darkMode]);

  // 2. User-specific task loading and saving
  useEffect(() => {
    const uid = currentUser ? currentUser.uid : 'guest';
    if (uid !== prevUserId) {
      const userTasksKey = currentUser ? `flowmind_tasks_${currentUser.uid}` : 'flowmind_tasks';
      const saved = localStorage.getItem(userTasksKey);
      if (saved) {
        try {
          setTasks(JSON.parse(saved));
        } catch {
          setTasks([]);
        }
      } else {
        // If a newly logged-in user, start with empty list []!
        if (currentUser) {
          setTasks([]);
        } else {
          // Guest defaults
          const guestSaved = localStorage.getItem('flowmind_tasks');
          if (guestSaved) {
            try { setTasks(JSON.parse(guestSaved)); } catch { setTasks([]); }
          }
        }
      }
      setPrevUserId(uid);
    }
  }, [currentUser, prevUserId]);

  // Sync tasks to correct key whenever tasks or currentUser changes
  useEffect(() => {
    const userTasksKey = currentUser ? `flowmind_tasks_${currentUser.uid}` : 'flowmind_tasks';
    localStorage.setItem(userTasksKey, JSON.stringify(tasks));
  }, [tasks, currentUser]);

  useEffect(() => {
    localStorage.setItem('flowmind_survival_steps', JSON.stringify(completedSurvivalSteps));
  }, [completedSurvivalSteps]);

  // Sync language selection
  useEffect(() => {
    localStorage.setItem('flowmind_lang', lang);
  }, [lang]);

  // Sync Bare Minimum Mode selection
  useEffect(() => {
    localStorage.setItem('flowmind_bare_minimum_mode', String(bareMinimumMode));
  }, [bareMinimumMode]);

  // Push notification permission request helper
  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        localStorage.setItem('flowmind_notifications', 'true');
        const title = lang === 'hinglish' ? '🔔 Notifications active hain!' : '🔔 Reminders Enabled!';
        const body = lang === 'hinglish'
          ? 'FlowMind ab aapko critical deadlines ke baare me update rakhega.'
          : 'FlowMind will now keep you accountable for critical deadlines.';
        try {
          new Notification(title, { body });
        } catch (e) {
          console.error('Notification constructor failed:', e);
        }
      } else {
        setNotificationsEnabled(false);
        localStorage.setItem('flowmind_notifications', 'false');
      }
    } else {
      alert(lang === 'hinglish' ? 'Yeh browser notifications support nahi karta.' : 'This browser does not support push notifications.');
    }
  };

  // Background check for pending critical deadlines
  useEffect(() => {
    if (!notificationsEnabled) return;

    const runCheck = () => {
      const pendingUrgent = tasks.filter(t => !t.completed && (t.urgency === 'critical' || t.urgency === 'high'));
      if (pendingUrgent.length > 0) {
        const primary = pendingUrgent[0];
        const title = lang === 'hinglish' ? '⚠️ Deadline Reminder' : '⚠️ Critical Deadline Pending';
        const body = lang === 'hinglish'
          ? `Aapka critical task pending hai: "${primary.title}"! Please ise check karein.`
          : `Do not postpone! Your high-stakes task is pending: "${primary.title}".`;
        
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(title, { body, tag: 'flowmind-alert' });
          } catch (e) {
            console.error('Failed to trigger background notification:', e);
          }
        }
      }
    };

    const checker = setInterval(runCheck, 60000); // Check every 60 seconds
    return () => clearInterval(checker);
  }, [tasks, notificationsEnabled, lang]);

  const handleEmailPasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      setAuthError("Email and password are required.");
      return;
    }
    setAuthError(null);
    setIsLoggingIn(true);
    try {
      if (authMode === 'login') {
        const user = await loginWithEmail(authEmail, authPassword);
        setCurrentUser(user);
        setNeedsAuth(false);
      } else {
        const user = await registerWithEmail(authEmail, authPassword);
        setCurrentUser(user);
        setNeedsAuth(false);
      }
    } catch (error: any) {
      console.error('Email Auth Error:', error);
      let errMsg = 'Authentication failed. Please check your credentials.';
      if (error.code === 'auth/operation-not-allowed') {
        errMsg = "Email & Password login is disabled on this Firebase project. Please use the recommended 'Sign In with Google' option below to access FlowMind instantly.";
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        errMsg = 'Invalid email or password.';
      } else if (error.code === 'auth/email-already-in-use') {
        errMsg = 'This email is already registered. Please login instead.';
      } else if (error.code === 'auth/weak-password') {
        errMsg = 'Password should be at least 6 characters.';
      } else if (error.code === 'auth/invalid-email') {
        errMsg = 'Please provide a valid email address.';
      } else {
        errMsg = error.message || errMsg;
      }
      setAuthError(errMsg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setCurrentUser(result.user);
        setNeedsAuth(false);
      }
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setCurrentUser(null);
      setNeedsAuth(true);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // 3. Dynamic Greeting & Real-time Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hrs = now.getHours();
      
      if (hrs < 12) setGreeting('Good morning, survivor');
      else if (hrs < 18) setGreeting('Good afternoon, focus');
      else setGreeting('Good evening, deep work');

      setCurrentTime(now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectPersonality = (p: AIPersonality) => {
    setCurrentPersonality(p);
    localStorage.setItem('flowmind_selected_personality_id', p.id);
    setIsOnboarding(false);
    setShowQuizModal(false);
    setActiveAdvice('');
  };

  // 4. Task Planner Handlers
  const handleAddTask = (e?: React.FormEvent, customTitle?: string) => {
    if (e) e.preventDefault();
    const title = customTitle || newTaskTitle;
    if (!title.trim()) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: title.trim(),
      completed: false,
      dueDate: customTitle ? new Date().toISOString().substring(0, 10) : newTaskDueDate,
      urgency: customTitle ? 'high' : newTaskUrgency,
      category: customTitle ? 'AI Suggestion' : newTaskCategory,
      calendarSynced: false
    };

    setTasks(prev => [newTask, ...prev]);
    if (!customTitle) {
      setNewTaskTitle('');
    }
  };

  const handleAddMultipleTasks = (newTasksList: Omit<Task, 'id' | 'completed' | 'calendarSynced'>[]) => {
    const formatted = newTasksList.map((t, idx) => ({
      ...t,
      id: `split-task-${Date.now()}-${idx}`,
      completed: false,
      calendarSynced: false
    }));
    setTasks(prev => [...formatted, ...prev]);
  };

  const handleToggleTask = (id: string) => {
    setTasks(prev => {
      return prev.map(t => {
        if (t.id === id) {
          const nextCompleted = !t.completed;
          if (nextCompleted && (t.urgency === 'critical' || t.triagePriority === 'CRITICAL RESCUE')) {
            // Left and right side confetti fountains
            confetti({
              particleCount: 65,
              spread: 70,
              origin: { x: 0.1, y: 0.85 },
              colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b']
            });
            confetti({
              particleCount: 65,
              spread: 70,
              origin: { x: 0.9, y: 0.85 },
              colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b']
            });

            // Delayed central rainbow sparkle explosion
            setTimeout(() => {
              confetti({
                particleCount: 110,
                angle: 90,
                spread: 130,
                origin: { x: 0.5, y: 0.4 },
                colors: ['#ff007f', '#7f00ff', '#00f0ff', '#ff00aa', '#ffff00', '#10b981']
              });
            }, 180);

            // Synthesize our custom acoustic pentatonic chime scale
            synthManager.playCelebrationChime();

            // Cache task & show visual celebration popup
            setCelebratedTask(t);
            setShowCelebration(true);
          }
          return { ...t, completed: nextCompleted };
        }
        return t;
      });
    });
  };

  const handleDeleteTask = (id: string) => {
    const taskToDelete = tasks.find(t => t.id === id);
    if (!taskToDelete) return;

    setTasks(prev => prev.filter(t => t.id !== id));

    showToast(
      lang === 'hinglish' ? `Task "${taskToDelete.title}" delete ho gaya hai.` : `Deleted task "${taskToDelete.title}".`,
      () => {
        setTasks(prev => [...prev, taskToDelete]);
        showToast(lang === 'hinglish' ? "Task successfully restore ho gaya!" : "Task restored successfully!");
      }
    );
  };

  // 5. Trigger Real-time AI Triage through Backend API
  const handleAITriageTask = async (task: Task) => {
    setTriagingTaskId(task.id);
    try {
      const response = await fetch('/api/triage-deadline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: task.title,
          dueDate: task.dueDate,
          urgency: task.urgency,
          companionPersonality: currentPersonality.name,
          companionSystemInstruction: currentPersonality.systemInstruction
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
           alert("Invalid Gemini API Key. Please check your API key in the settings.");
        }
        throw new Error('Triage failure response');
      }

      const result = await response.json();
      
      setTasks(prev => prev.map(t => {
        if (t.id === task.id) {
          return {
            ...t,
            triagePriority: result.triagePriority,
            survivalPlan: result.survivalPlan,
            priorityExplanation: result.priorityExplanation
          };
        }
        return t;
      }));

    } catch (err) {
      console.warn("Failed to complete real-time triage. Simulating fallback design:", err);
      // Perfect high-fidelity client simulation fallback
      setTasks(prev => prev.map(t => {
        if (t.id === task.id) {
          return {
            ...t,
            triagePriority: task.urgency === 'critical' || task.urgency === 'high' ? 'CRITICAL RESCUE' : 'STANDARD ACTION',
            priorityExplanation: 'Local threat classification: time proximity threshold warning.',
            survivalPlan: [
              `🔥 Isolate workspace & close non-essential tabs.`,
              `⚡ Set an immediate 15-minute challenge to start the draft.`,
              `🚫 Lock down mobile device in other room.`
            ]
          };
        }
        return t;
      }));
    } finally {
      setTriagingTaskId(null);
    }
  };

  // Toggle sub-checklist steps generated by AI
  const handleToggleSurvivalStep = (taskId: string, stepIndex: number) => {
    setCompletedSurvivalSteps(prev => {
      const taskSteps = prev[taskId] || {};
      const updated = {
        ...prev,
        [taskId]: {
          ...taskSteps,
          [stepIndex]: !taskSteps[stepIndex]
        }
      };
      return updated;
    });
  };

  // Handle Google Calendar sync for any high-stakes task
  const handleSyncTaskToCalendar = async (task: Task) => {
    try {
      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('gcal_access_token') || ''}`
        },
        body: JSON.stringify({
          summary: `🔥 RESCUE BLOCK: ${task.title}`,
          description: `Scheduled via FlowMind. Priority: ${task.triagePriority || 'HIGH'}. Explanation: ${task.priorityExplanation || 'No description'}`,
          startTime: new Date(Date.now() + 1000 * 60 * 10).toISOString(), // start in 10 mins
          endTime: new Date(Date.now() + 1000 * 60 * 35).toISOString() // end in 35 mins (25min block)
        })
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, calendarSynced: true } : t));
      alert(`Synchronized "${task.title}" to Google Calendar successfully!`);
    } catch {
      // Simulate/fallback
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, calendarSynced: true } : t));
      alert(`Simulated calendar sync successful! Timelines updated.`);
    }
  };

  const handleFocusSessionComplete = (mode: TimerMode) => {
    if (mode === 'work') {
      const nextPomodoros = completedPomodoros + 1;
      setCompletedPomodoros(nextPomodoros);
      localStorage.setItem('flowmind_pomodoros', String(nextPomodoros));
      
      // Personalized bonus suggestors based on companion
      const suggestions: Record<string, string> = {
        mentor: "🌱 Mindful stretching & deep breath suggested by Mentor",
        coach: "🔥 Hydrate & draft your next high-intensity focus block",
        philosopher: "🌌 Stoic silence reflection: catalog lessons learned",
        creative: "🎨 Fast lateral doodle or write a wacky task header"
      };
      
      const newWellnessTask: Task = {
        id: `task-${Date.now()}`,
        title: suggestions[currentPersonality.id] || "Recovery pause",
        completed: false,
        dueDate: new Date().toISOString().substring(0, 10),
        urgency: 'low',
        category: 'Wellness Break',
        calendarSynced: false
      };
      
      setTasks(prev => [newWellnessTask, ...prev]);
    }
  };

  // Launch any task into active focus timer
  const handleLaunchFocusForTask = (task: Task) => {
    setSelectedTaskForFocus(task.title);
    handleTabChange('focus');
  };

  // Calculate day difference for countdowns
  const getDaysRemainingText = (dateString: string) => {
    const diffTime = new Date(dateString).getTime() - new Date().setHours(0,0,0,0);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Due Today ⏳';
    if (diffDays === 1) return 'Due Tomorrow ⚡';
    if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)}d 🚨`;
    return `${diffDays} days left`;
  };

  // Dynamic personality-based color configurations
  const accentColor = currentPersonality.id === 'mentor' ? 'bg-emerald-500 hover:bg-emerald-600' 
    : currentPersonality.id === 'coach' ? 'bg-amber-500 hover:bg-amber-600'
    : currentPersonality.id === 'philosopher' ? 'bg-indigo-500 hover:bg-indigo-600'
    : 'bg-fuchsia-500 hover:bg-fuchsia-600';

  const borderColor = currentPersonality.id === 'mentor' ? 'border-emerald-500/20 dark:border-emerald-800/40'
    : currentPersonality.id === 'coach' ? 'border-amber-500/20 dark:border-amber-800/40'
    : currentPersonality.id === 'philosopher' ? 'border-indigo-500/20 dark:border-indigo-800/40'
    : 'border-fuchsia-500/20 dark:border-fuchsia-800/40';

  const textColor = currentPersonality.id === 'mentor' ? 'text-emerald-500 dark:text-emerald-400'
    : currentPersonality.id === 'coach' ? 'text-amber-500 dark:text-amber-400'
    : currentPersonality.id === 'philosopher' ? 'text-indigo-500 dark:text-indigo-400'
    : 'text-fuchsia-500 dark:text-fuchsia-400';

  const glowAccent = currentPersonality.id === 'mentor' ? 'shadow-emerald-500/10' 
    : currentPersonality.id === 'coach' ? 'shadow-amber-500/10'
    : currentPersonality.id === 'philosopher' ? 'shadow-indigo-500/10'
    : 'shadow-fuchsia-500/10';

  // Customized proactive companion quotes based on selected guide
  const getCompanionProactiveAdvice = () => {
    switch (currentPersonality.id) {
      case 'mentor':
        return "🌱 Procrastination is often just anxiety in disguise. Let us break down your high-stakes deadlines with patience and quiet steps today.";
      case 'coach':
        return "🔥 Excuses don't ship code. Identify your highest-threat deadline below, trigger the AI Triage, and do NOT leave your desk until Step 1 is crushed.";
      case 'philosopher':
        return "🌌 The fear of starting is always heavier than the burden of executing. Align your intent, shut out the noisy margins, and practice deep presence.";
      case 'creative':
        return "🎨 Break the rigid rules of your schedule. Turn this deadline panic into a playful, lateral game. Let us explore unique shortcuts!";
      default:
        return "";
    }
  };

  // Customized companion praise messages when a critical task is successfully completed
  const getCompanionCelebrationMessage = (taskTitle: string) => {
    switch (currentPersonality.id) {
      case 'mentor':
        return `🌱 You did it! You navigated the high-stakes threat "${taskTitle}" with steady grace. I'm so incredibly proud of you! Now, take a deep breath, stretch your arms, and let the relief wash over you. Setbacks are history, progress is real.`;
      case 'coach':
        return `🔥 BOOM! Direct hit! "${taskTitle}" has been completely pulverized. That is how we conquer friction and resistance! Pure discipline and execution beats procrastination every single day. Let's ride this wave and smash the next target immediately!`;
      case 'philosopher':
        return `🌌 Complete stillness achieved. By completing "${taskTitle}", you have quieted the chaotic noise of your mind. The path of mindful presence and purposeful action is your superpower. Dwell in this triumph—it was beautifully earned.`;
      case 'creative':
        return `🎨 Kaboom! What an absolute masterclass in lateral problem-solving! You unlocked the solution to "${taskTitle}" and cleared the obstacle. That was brilliant, imaginative execution—let's keep this magical, playful momentum rolling!`;
      default:
        return `✨ Critical Rescue Completed! Excellent work in resolving "${taskTitle}". Keep up the amazing work!`;
    }
  };

  // Fetch live interactive AI companion active advice
  const fetchCompanionAdvice = async () => {
    setLoadingAdvice(true);
    try {
      const response = await fetch('/api/companion-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalityId: currentPersonality.id,
          personalityName: currentPersonality.name,
          systemInstruction: currentPersonality.systemInstruction,
          tasks: tasks,
          lang: lang
        })
      });
      if (!response.ok) {
        if (response.status === 401) {
           alert("Invalid Gemini API Key. Please check your API key in the settings.");
        }
        throw new Error("Failed to fetch advice");
      }
      const data = await response.json();
      if (data.advice) {
        setActiveAdvice(data.advice);
      }
    } catch (err) {
      console.error("Error fetching companion advice:", err);
    } finally {
      setLoadingAdvice(false);
    }
  };

  // AI Predictive Risk Engine Analytics Calculator
  const getRiskAssessment = () => {
    const pending = tasks.filter(t => !t.completed);
    let score = 0;
    pending.forEach(t => {
      if (t.urgency === 'critical') score += 4;
      else if (t.urgency === 'high') score += 2;
      else if (t.urgency === 'medium') score += 1;
      
      const dueDate = new Date(t.dueDate);
      const today = new Date();
      today.setHours(0,0,0,0);
      dueDate.setHours(0,0,0,0);
      if (dueDate.getTime() <= today.getTime()) {
        score += 3; // overdue or due today
      }
    });

    let level: 'low' | 'medium' | 'critical' = 'low';
    let statusText = t('riskLow');
    let recommendationText = t('recommendationLow');
    let userModeType = USER_MODE_PREDICTIONS[lang]['low'];
    let badgeColor = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    let glowColor = 'bg-emerald-500';

    if (score >= 8) {
      level = 'critical';
      statusText = t('riskCritical');
      recommendationText = t('recommendationCritical');
      userModeType = USER_MODE_PREDICTIONS[lang]['critical'];
      badgeColor = 'bg-rose-500/10 text-rose-500 border-rose-500/20 animate-pulse';
      glowColor = 'bg-rose-500';
    } else if (score >= 4) {
      level = 'medium';
      statusText = t('riskMedium');
      recommendationText = t('recommendationMedium');
      userModeType = USER_MODE_PREDICTIONS[lang]['medium'];
      badgeColor = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      glowColor = 'bg-amber-500';
    }

    return { score, level, statusText, recommendationText, userModeType, badgeColor, glowColor };
  };

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf9f5] dark:bg-zinc-950 text-zinc-800 dark:text-zinc-250">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-mono text-sm text-zinc-500 animate-pulse">Initializing FlowMind Rescue Hub...</p>
        </div>
      </div>
    );
  }

  if (needsAuth) {
    return (
      <div className="min-h-screen bg-[#faf9f5] dark:bg-zinc-950 text-zinc-800 dark:text-zinc-150 flex flex-col justify-center items-center transition-colors duration-300 relative overflow-hidden font-sans">
        {/* Dynamic atmospheric background colors */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[160px] opacity-10 pointer-events-none bg-indigo-500" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[140px] opacity-10 pointer-events-none bg-purple-500" />

        <div className="w-full max-w-md p-8 bg-white/70 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800/80 rounded-3xl shadow-xl backdrop-blur-xl relative z-10 transition-all text-center">
          <div className="p-3 w-14 h-14 mx-auto rounded-2xl text-white shadow-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center mb-6">
            <BrainCircuit className="w-8 h-8" />
          </div>
          
          <h1 className="font-display font-extrabold text-2xl tracking-tight text-zinc-950 dark:text-white mb-1">
            FlowMind AI Hub
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 max-w-xs mx-auto">
            Your high-stakes, crisis-resistant visual productivity and cognitive triage dashboard.
          </p>

          {/* Toggle Login / Register */}
          <div className="bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl mb-6 flex gap-1 border border-zinc-200/50 dark:border-zinc-900">
            <button
              onClick={() => { setAuthMode('login'); setAuthError(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                authMode === 'login' 
                  ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-sm font-bold' 
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthMode('register'); setAuthError(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                authMode === 'register' 
                  ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-sm font-bold' 
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleEmailPasswordAuth} className="space-y-4 text-left">
            {authError && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl text-xs flex gap-2 items-start">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-mono uppercase text-zinc-500 dark:text-zinc-400 mb-1.5 font-bold">
                Email Address
              </label>
              <input
                type="email"
                placeholder="developer@flowmind.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                required
                className="w-full px-4 py-3 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-zinc-500 dark:text-zinc-400 mb-1.5 font-bold">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
                className="w-full px-4 py-3 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 px-5 mt-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg hover:shadow-indigo-500/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoggingIn ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>{authMode === 'login' ? 'Sign In' : 'Create Account'}</span>
              )}
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-400 dark:text-zinc-500 font-mono text-[9px] font-bold tracking-wider">
                Or Recommended Login
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full py-3 px-5 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 disabled:opacity-50 text-zinc-700 dark:text-zinc-200 font-semibold rounded-xl border border-zinc-250 dark:border-zinc-800 shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            <span className="text-xs">Sign In with Google</span>
          </button>

          <div className="mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800/80">
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 max-w-xs mx-auto leading-relaxed">
              Once logged in, you can seamlessly authorize and link Google Calendar deadlines directly inside the Calendar Dashboard.
            </p>
          </div>
          
          <div className="absolute top-4 right-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-750 transition-all cursor-pointer"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f5] dark:bg-zinc-950 text-zinc-800 dark:text-zinc-150 flex transition-colors duration-300 relative overflow-x-hidden font-sans">
      
      {/* Dynamic atmospheric background colors (matte black UI signature style) */}
      <div className={`absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[180px] opacity-10 dark:opacity-15 pointer-events-none transition-all duration-1000 bg-gradient-to-tr ${currentPersonality.bgGradientClass}`} />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-[160px] opacity-5 pointer-events-none transition-all duration-1000 bg-indigo-500" />

      {/* 1. LEFT SIDEBAR NAVIGATION BAR (Responsive: sidebar on desktop, bottom bar on mobile) */}
      <aside className={`${sidebarCollapsed ? 'w-20' : 'w-64'} border-r border-zinc-200/80 dark:border-zinc-900 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md hidden md:flex flex-col fixed inset-y-0 left-0 z-30 transition-all duration-300`}>
        
        {/* Top Logo */}
        <div className={`p-4 flex ${sidebarCollapsed ? 'flex-col gap-3 justify-center' : 'items-center justify-between'} border-b border-zinc-100 dark:border-zinc-900`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl text-white shadow-lg bg-gradient-to-tr ${currentPersonality.bgGradientClass}`}>
              <BrainCircuit className="w-5 h-5" />
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="font-display font-extrabold text-base tracking-tight text-zinc-900 dark:text-white flex items-center gap-1">
                  FlowMind
                  <span className="text-[8px] font-mono font-bold bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-500 px-1 py-0.5 rounded border border-zinc-200 dark:border-zinc-800">
                    AI
                  </span>
                </h1>
              </div>
            )}
          </div>

          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-500 dark:text-zinc-400 transition-all cursor-pointer shadow-sm bg-white dark:bg-zinc-950"
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Selected Companion Snapshot Card */}
        {sidebarCollapsed ? (
          <div className="m-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/65 dark:border-zinc-850 flex items-center justify-center relative overflow-hidden group" title={`${currentPersonality.name}`}>
            <span className="text-2xl filter drop-shadow group-hover:scale-110 transition-transform">{currentPersonality.emoji}</span>
            <div className={`absolute bottom-0 right-0 left-0 h-0.5 bg-gradient-to-r ${currentPersonality.bgGradientClass}`} />
          </div>
        ) : (
          <div className="m-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/65 dark:border-zinc-850 flex items-center gap-3 relative overflow-hidden group">
            <span className="text-3xl filter drop-shadow group-hover:scale-110 transition-transform">{currentPersonality.emoji}</span>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-display font-bold text-zinc-800 dark:text-zinc-200 block break-words">{currentPersonality.name}</span>
            </div>
            <div className={`absolute bottom-0 right-0 top-0 w-0.5 bg-gradient-to-b ${currentPersonality.bgGradientClass}`} />
          </div>
        )}

        {/* Main Navigation Links */}
        <nav className="flex-1 px-4 space-y-1.5 py-4">
          <button
            onClick={() => handleTabChange('dashboard')}
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3.5 py-2.5'} text-xs font-medium rounded-xl transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-850 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-zinc-850 dark:hover:text-zinc-200'
            }`}
            title={sidebarCollapsed ? t('workspaceOverview') : undefined}
          >
            <LayoutDashboard className="w-4 h-4 text-zinc-400" />
            {!sidebarCollapsed && <span>{t('workspaceOverview')}</span>}
          </button>

          <button
            onClick={() => handleTabChange('planner')}
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3.5 py-2.5'} text-xs font-medium rounded-xl transition-all cursor-pointer ${
              activeTab === 'planner'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-850 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-zinc-850 dark:hover:text-zinc-200'
            }`}
            title={sidebarCollapsed ? t('deadlinePlanner') : undefined}
          >
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            {!sidebarCollapsed && <span>{t('deadlinePlanner')}</span>}
            {!sidebarCollapsed && tasks.filter(t => !t.completed && t.urgency === 'critical').length > 0 && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            )}
            {sidebarCollapsed && tasks.filter(t => !t.completed && t.urgency === 'critical').length > 0 && (
              <span className="absolute top-2 right-4 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => handleTabChange('focus')}
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3.5 py-2.5'} text-xs font-medium rounded-xl transition-all cursor-pointer ${
              activeTab === 'focus'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-850 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-zinc-850 dark:hover:text-zinc-200'
            }`}
            title={sidebarCollapsed ? t('focusSpace') : undefined}
          >
            <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
            {!sidebarCollapsed && <span>{t('focusSpace')}</span>}
          </button>

          <button
            onClick={() => handleTabChange('calendar')}
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3.5 py-2.5'} text-xs font-medium rounded-xl transition-all cursor-pointer ${
              activeTab === 'calendar'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-850 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-zinc-850 dark:hover:text-zinc-200'
            }`}
            title={sidebarCollapsed ? t('calendarTimeline') : undefined}
          >
            <Calendar className="w-4 h-4 text-indigo-400" />
            {!sidebarCollapsed && <span>{t('calendarTimeline')}</span>}
          </button>

          <button
            onClick={() => handleTabChange('notes')}
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3.5 py-2.5'} text-xs font-medium rounded-xl transition-all cursor-pointer ${
              activeTab === 'notes'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-850 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-zinc-850 dark:hover:text-zinc-200'
            }`}
            title={sidebarCollapsed ? t('quickNotes') : undefined}
          >
            <Notebook className="w-4 h-4 text-emerald-400" />
            {!sidebarCollapsed && <span>{t('quickNotes')}</span>}
          </button>


        </nav>

        {/* Sidebar Footer Controls */}
        <div className={`p-4 border-t border-zinc-100 dark:border-zinc-900 ${sidebarCollapsed ? 'space-y-3' : 'space-y-2'}`}>
          
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => setShowQuizModal(true)}
                className="p-2 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-600 dark:text-zinc-300 rounded-xl border border-zinc-200 dark:border-zinc-800 transition-all cursor-pointer shadow-sm"
                title={t('changeCompanionQuiz')}
              >
                <Compass className="w-4 h-4 text-indigo-400" />
              </button>

              <button
                onClick={handleToggleLang}
                className="w-8 h-8 flex items-center justify-center text-[10px] font-mono font-bold bg-zinc-100 dark:bg-zinc-950 text-indigo-600 dark:text-indigo-400 border border-zinc-200 dark:border-zinc-900 rounded-xl transition-all cursor-pointer shadow-sm"
                title="Change Language / Hinglish"
              >
                {lang === 'en' ? 'EN' : 'HIN'}
              </button>

              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 bg-zinc-100 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-xl border border-zinc-200 dark:border-zinc-900 transition-all cursor-pointer"
                title={t('darkMode')}
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              <button
                onClick={requestNotificationPermission}
                className="p-2 bg-zinc-100 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-900 transition-all cursor-pointer"
                title={t('enableReminders')}
              >
                {notificationsEnabled ? (
                  <Bell className="w-4 h-4 text-emerald-500" />
                ) : (
                  <BellOff className="w-4 h-4 text-zinc-400" />
                )}
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowQuizModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-600 dark:text-zinc-300 rounded-xl border border-zinc-200 dark:border-zinc-800 text-[11px] transition-all cursor-pointer font-sans font-semibold"
              >
                <Compass className="w-3.5 h-3.5 text-indigo-400" />
                {t('changeCompanionQuiz')}
              </button>

              <div className="flex items-center justify-between p-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl">
                <span className="text-[10px] text-zinc-500 pl-2 font-mono flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-indigo-500" />
                  Language
                </span>
                <button
                  onClick={handleToggleLang}
                  className="px-2 py-0.5 text-[9px] font-mono font-bold bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 border border-zinc-250 dark:border-zinc-800 rounded-lg transition-all cursor-pointer shadow-sm"
                >
                  {lang === 'en' ? 'EN' : 'Hinglish'}
                </button>
              </div>

              <div className="flex items-center justify-between p-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl">
                <span className="text-[10px] text-zinc-500 pl-2 font-mono">{t('darkMode')}</span>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-all"
                >
                  {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                </button>
              </div>

              <button
                onClick={requestNotificationPermission}
                className="w-full flex items-center justify-between p-1 px-2 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-900 transition-all cursor-pointer"
              >
                <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1.5">
                  {notificationsEnabled ? (
                    <Bell className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <BellOff className="w-3.5 h-3.5 text-zinc-400" />
                  )}
                  {t('enableReminders')}
                </span>
                <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  notificationsEnabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                }`}>
                  {notificationsEnabled ? 'ON' : 'OFF'}
                </span>
              </button>
            </>
          )}

          <div className="text-center pt-2 border-t border-zinc-100 dark:border-zinc-900/60 mt-2">
            {!sidebarCollapsed ? (
              <a 
                href="mailto:niharsevda04@gmail.com" 
                className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
              >
                {t('createdBy')}
              </a>
            ) : (
              <span className="text-[9px] font-mono text-zinc-400">FM</span>
            )}
          </div>

          {currentUser && (
            sidebarCollapsed ? (
              <div className="flex flex-col items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-900/60 mt-2">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt={currentUser.displayName || ''} className="w-7 h-7 rounded-full border border-zinc-300 dark:border-zinc-750" referrerPolicy="no-referrer" title={currentUser.displayName || currentUser.email || ''} />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-[10px] uppercase shadow-sm" title={currentUser.displayName || currentUser.email || ''}>
                    {currentUser.email?.charAt(0) || 'U'}
                  </div>
                )}
                <button onClick={handleLogout} className="p-1 text-zinc-400 hover:text-rose-500 rounded-lg transition-all cursor-pointer" title="Sign Out">
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2 border-t border-zinc-100 dark:border-zinc-900/60 mt-2">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt={currentUser.displayName || ''} className="w-6 h-6 rounded-full border border-zinc-300 dark:border-zinc-750" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-[10px] uppercase shadow-sm">
                    {currentUser.email?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium text-zinc-800 dark:text-zinc-200 truncate">{currentUser.displayName || currentUser.email?.split('@')[0]}</p>
                  <p className="text-[8px] text-zinc-400 dark:text-zinc-500 truncate">{currentUser.email}</p>
                </div>
                <button onClick={handleLogout} className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-zinc-400 hover:text-rose-500 rounded-lg transition-all cursor-pointer" title="Sign Out">
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          )}
        </div>
      </aside>

      {/* Desktop sidebar spacer */}
      <div className={`hidden md:block ${sidebarCollapsed ? 'w-20' : 'w-64'} flex-shrink-0 transition-all duration-300`} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-h-screen">
        
        {/* Top bar with system time & quick diagnostics */}
        <header className="h-16 border-b border-zinc-200/80 dark:border-zinc-900 flex items-center justify-between px-6 sm:px-8 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3 md:hidden">
            <div className={`p-1.5 rounded-lg text-white bg-gradient-to-tr ${currentPersonality.bgGradientClass}`}>
              <BrainCircuit className="w-4 h-4" />
            </div>
            <h1 className="font-display font-bold text-sm tracking-tight text-zinc-900 dark:text-white">FlowMind</h1>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-mono">GMT Status:</span>
            <span className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-300">ONLINE</span>
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          </div>

          <div className="flex items-center gap-4">
            {currentUser && (
              <div className="flex items-center gap-2 md:hidden">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt={currentUser.displayName || ''} className="w-6 h-6 rounded-full border border-zinc-300 dark:border-zinc-750" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-[10px] uppercase shadow-sm">
                    {currentUser.email?.charAt(0) || 'U'}
                  </div>
                )}
                <button onClick={handleLogout} className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-zinc-400 hover:text-rose-500 rounded-lg transition-all cursor-pointer" title="Sign Out">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}





            <div className="text-right hidden md:block">
              <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider block">Crisis Triage Clock</span>
              <span className="text-xs text-zinc-800 dark:text-zinc-300 font-mono font-bold">{currentTime || 'Locked...'}</span>
            </div>
            
            {/* Quick Diagnostic Quiz button for smaller viewports */}
            <button
              onClick={() => setShowQuizModal(true)}
              className="p-2 border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-xl transition-all block md:hidden"
            >
              <Compass className="w-4.5 h-4.5" />
            </button>
          </div>
        </header>

        {/* CORE SCENARIO RENDERING BLOCK */}
        <main className="flex-1 p-6 sm:p-8 max-w-6xl w-full mx-auto">
          
          {isOnboarding ? (
            onboardingStep === 'intro' ? (
              <div className="max-w-3xl mx-auto py-8">
                {/* Visual Intro Banner */}
                <div className="text-center mb-10">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 dark:text-indigo-400 mb-5 relative group">
                    <div className="absolute inset-0 rounded-2xl bg-indigo-500/10 blur-xl opacity-50 group-hover:opacity-100 transition-opacity animate-pulse" />
                    <Sparkles className="w-7 h-7 relative" />
                  </div>
                  <h2 className="font-sans font-black text-4xl sm:text-5xl text-zinc-900 dark:text-white tracking-tight mb-3">
                    Meet <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-500 bg-clip-text text-transparent">FlowMind</span>
                  </h2>
                  <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto leading-relaxed">
                    A professional, high-fidelity productivity companion designed to completely eliminate task resistance, break anxiety loops, and guarantee you never miss a deadline.
                  </p>
                </div>

                {/* Features list/grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                  <div className="p-6 bg-white dark:bg-zinc-900/55 border border-zinc-250/70 dark:border-zinc-850 rounded-2xl shadow-sm relative group hover:border-indigo-500/40 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 flex items-center justify-center mb-4 font-mono font-bold text-xs">
                      01
                    </div>
                    <h3 className="font-sans font-bold text-base text-zinc-900 dark:text-zinc-100 mb-1.5">
                      Deadline Security
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      AI Triage calculates high-stakes risk matrices, highlights critical targets, and ensures you stay ahead of every schedule.
                    </p>
                  </div>

                  <div className="p-6 bg-white dark:bg-zinc-900/55 border border-zinc-250/70 dark:border-zinc-850 rounded-2xl shadow-sm relative group hover:border-indigo-500/40 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 dark:text-indigo-400 flex items-center justify-center mb-4 font-mono font-bold text-xs">
                      02
                    </div>
                    <h3 className="font-sans font-bold text-base text-zinc-900 dark:text-zinc-100 mb-1.5">
                      AI Companion Personas
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Whether you need firm accountability, nurturing support, zen mindfulness, or creative brainstorming.
                    </p>
                  </div>

                  <div className="p-6 bg-white dark:bg-zinc-900/55 border border-zinc-250/70 dark:border-zinc-850 rounded-2xl shadow-sm relative group hover:border-indigo-500/40 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400 flex items-center justify-center mb-4 font-mono font-bold text-xs">
                      03
                    </div>
                    <h3 className="font-sans font-bold text-base text-zinc-900 dark:text-zinc-100 mb-1.5">
                      Micro-Step Splitting
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Conquer procrastination. Automatically decompose overwhelming projects into 3 tiny, bite-sized daily achievements.
                    </p>
                  </div>
                </div>

                {/* Tactical Slide to Unlock / Metaphorical Slider */}
                <div className="space-y-4 text-center mt-6">
                  <div className="max-w-md mx-auto">
                    <SlideToUnlock onUnlocked={() => setOnboardingStep('quiz')} />
                  </div>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono tracking-wider uppercase">
                    Slide to activate focus & select companion
                  </p>
                </div>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto py-8">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4 animate-pulse">
                    <Compass className="w-6 h-6" />
                  </div>
                  <h2 className="font-display font-extrabold text-3xl text-zinc-900 dark:text-white tracking-tight mb-2">
                    Select Your Companion
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                    Every work style is unique. Complete this brief diagnostic to select an AI partner tailored to secure your deadlines.
                  </p>
                </div>
                <PersonalityQuiz onSelectPersonality={handleSelectPersonality} />
              </div>
            )
          ) : (
            <div className="space-y-6">
              
              {/* TAB CONTAINER FOR MOBILE VIEWPORTS */}
              <div className="flex md:hidden gap-1 p-1 bg-white/60 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-900 rounded-2xl mb-2 overflow-x-auto">
                <button
                  onClick={() => handleTabChange('dashboard')}
                  className={`flex-1 py-2 text-[11px] font-sans rounded-xl font-medium whitespace-nowrap transition-all ${
                    activeTab === 'dashboard' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => handleTabChange('planner')}
                  className={`flex-1 py-2 text-[11px] font-sans rounded-xl font-medium whitespace-nowrap transition-all ${
                    activeTab === 'planner' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500'
                  }`}
                >
                  Planner
                </button>
                <button
                  onClick={() => handleTabChange('focus')}
                  className={`flex-1 py-2 text-[11px] font-sans rounded-xl font-medium whitespace-nowrap transition-all ${
                    activeTab === 'focus' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500'
                  }`}
                >
                  Focus Space
                </button>
                <button
                  onClick={() => handleTabChange('calendar')}
                  className={`flex-1 py-2 text-[11px] font-sans rounded-xl font-medium whitespace-nowrap transition-all ${
                    activeTab === 'calendar' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500'
                  }`}
                >
                  Calendar
                </button>
                <button
                  onClick={() => handleTabChange('notes')}
                  className={`flex-1 py-2 text-[11px] font-sans rounded-xl font-medium whitespace-nowrap transition-all ${
                    activeTab === 'notes' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500'
                  }`}
                >
                  Notes & AI Splitter
                </button>
              </div>

              {/* -------------------- VIEW 1: DASHBOARD OVERVIEW -------------------- */}
              <div style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}>
                <div className="space-y-6 animate-in fade-in duration-200">
                  
                  {/* Proactive Guardian Banner */}
                  <div className="flex flex-col gap-4">
                    <div className={`p-5 rounded-3xl border border-zinc-200/80 dark:border-zinc-900 bg-white/60 dark:bg-zinc-900/20 shadow-sm dark:shadow-inner relative overflow-hidden transition-all duration-300 flex flex-col md:flex-row gap-5 items-start sm:items-center justify-between`}>
                      <div className="flex items-center gap-4 flex-1">
                        <span className="text-5xl filter drop-shadow animate-bounce shrink-0" style={{ animationDuration: '4s' }}>
                          {currentPersonality.emoji}
                        </span>
                        <div>
                          <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-mono font-bold block mb-0.5">
                            Personal Proactive Insight
                          </span>
                          <h2 className="font-display font-extrabold text-base text-zinc-900 dark:text-zinc-100 mb-1">
                            {currentPersonality.name} suggests:
                          </h2>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 font-sans leading-relaxed max-w-xl">
                            {getCompanionProactiveAdvice()}
                          </p>
                          
                          {/* Live Dynamic Advice Button Trigger */}
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                              onClick={fetchCompanionAdvice}
                              disabled={loadingAdvice}
                              className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-850 text-zinc-800 dark:text-zinc-200 text-[11px] font-semibold rounded-lg border border-zinc-200/60 dark:border-zinc-800/80 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
                            >
                              <Sparkles className={`w-3.5 h-3.5 text-indigo-500 ${loadingAdvice ? 'animate-spin' : ''}`} />
                              {loadingAdvice 
                                ? (lang === 'hinglish' ? 'Brainstorming chal rahi hai...' : 'Brainstorming Active Advice...') 
                                : activeAdvice 
                                  ? (lang === 'hinglish' ? '🧠 Naya Action Plan sochein' : '🧠 Brainstorm New Action Plan')
                                  : (lang === 'hinglish' ? '💡 Live Brainstorm Session' : '💡 Live Tactical Brainstorm Session')
                              }
                            </button>
                            {activeAdvice && (
                              <button
                                onClick={() => setActiveAdvice('')}
                                className="px-3 py-1.5 text-[11px] text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-200 font-semibold cursor-pointer"
                              >
                                {lang === 'hinglish' ? 'Chhupayein' : 'Reset / Hide'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleTabChange('planner')}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all flex items-center gap-1.5 cursor-pointer self-stretch md:self-auto justify-center ${accentColor}`}
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Triage Planner
                      </button>
                    </div>

                    {/* Active Brainstorm Display Section */}
                    {activeAdvice && (
                      <div className="p-5 rounded-3xl border border-indigo-500/10 dark:border-indigo-500/25 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 dark:from-indigo-500/10 dark:to-purple-500/10 shadow-lg relative overflow-hidden transition-all duration-300 animate-in slide-in-from-top-4">
                        <div className="flex items-start gap-3.5">
                          <div className={`p-2 rounded-xl text-white shadow-md bg-gradient-to-tr ${currentPersonality.bgGradientClass} shrink-0`}>
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <span className="text-[9px] uppercase tracking-wider font-mono font-extrabold text-indigo-500 dark:text-indigo-400 block mb-1">
                              {currentPersonality.name}'s Custom Active Brainstorm Session
                            </span>
                            <div className="text-xs text-zinc-700 dark:text-zinc-300 font-sans leading-relaxed whitespace-pre-line prose prose-zinc dark:prose-invert">
                              {activeAdvice}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Micro stats dashboard row */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-zinc-900/30 border border-zinc-200/80 dark:border-zinc-900 p-4 rounded-2xl shadow-sm dark:shadow-none">
                      <span className="text-[9px] font-mono uppercase text-zinc-500 block mb-1">Total Targets</span>
                      <span className="text-2xl font-mono font-bold text-zinc-800 dark:text-zinc-200">{tasks.length}</span>
                      <span className="text-[9px] text-zinc-500 dark:text-zinc-600 block mt-0.5">Deadline objectives</span>
                    </div>

                    <div className="bg-white dark:bg-zinc-900/30 border border-zinc-200/80 dark:border-zinc-900 p-4 rounded-2xl shadow-sm dark:shadow-none">
                      <span className="text-[9px] font-mono uppercase text-zinc-500 block mb-1">Pending Criticals</span>
                      <span className="text-2xl font-mono font-bold text-rose-500 dark:text-rose-400">
                        {tasks.filter(t => !t.completed && (t.urgency === 'critical' || t.urgency === 'high')).length}
                      </span>
                      <span className="text-[9px] text-rose-500/40 dark:text-rose-500/40 block mt-0.5">Urgent interventions</span>
                    </div>

                    <div className="bg-white dark:bg-zinc-900/30 border border-zinc-200/80 dark:border-zinc-900 p-4 rounded-2xl shadow-sm dark:shadow-none">
                      <span className="text-[9px] font-mono uppercase text-zinc-500 block mb-1">Rescued Pomodoros</span>
                      <span className="text-2xl font-mono font-bold text-indigo-600 dark:text-indigo-400">{completedPomodoros}</span>
                      <span className="text-[9px] text-zinc-500 dark:text-zinc-600 block mt-0.5">Completed intervals</span>
                    </div>

                    <div className="bg-white dark:bg-zinc-900/30 border border-zinc-200/80 dark:border-zinc-900 p-4 rounded-2xl shadow-sm dark:shadow-none">
                      <span className="text-[9px] font-mono uppercase text-zinc-500 block mb-1">Completion rate</span>
                      <span className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {tasks.length > 0 ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) : 0}%
                      </span>
                      <span className="text-[9px] text-zinc-500 dark:text-zinc-600 block mt-0.5">Efficiency rating</span>
                    </div>
                  </div>

                  {/* AI Predictive Risk Engine Section */}
                  {(() => {
                    const risk = getRiskAssessment();
                    return (
                      <div className="p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-900 bg-white dark:bg-zinc-900/30 shadow-sm flex flex-col md:flex-row gap-6 items-stretch justify-between relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Decorative side glow representing current risk threat */}
                        <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${risk.glowColor}`} />
                        
                        <div className="flex-1 space-y-3.5">
                          <div className="flex items-center gap-2.5">
                            <BrainCircuit className="w-5 h-5 text-indigo-500 animate-pulse" />
                            <h3 className="font-display font-extrabold text-xs text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-mono">
                              {t('predictiveRiskEngine')}
                            </h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${risk.badgeColor}`}>
                              {risk.statusText}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 bg-zinc-50 dark:bg-zinc-950/60 p-4 rounded-2xl border border-zinc-150 dark:border-zinc-900/60">
                            <div>
                              <span className="text-[9px] uppercase font-mono text-zinc-400 block mb-0.5">{t('userTypePrediction')}</span>
                              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{risk.userModeType}</span>
                            </div>
                            <div>
                              <span className="text-[9px] uppercase font-mono text-zinc-400 block mb-0.5">{t('riskLevel')}</span>
                              <span className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200">{risk.score} / 20</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-between gap-4 border-t md:border-t-0 md:border-l border-zinc-150 dark:border-zinc-900/60 pt-4 md:pt-0 md:pl-6">
                          <div>
                            <span className="text-[9px] uppercase font-mono text-zinc-400 block mb-1">{t('recommendation')}</span>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans font-medium">
                              {risk.recommendationText}
                            </p>
                          </div>

                          <div className="flex items-center justify-between p-3.5 bg-indigo-50/40 dark:bg-zinc-950/40 rounded-2xl border border-indigo-100/40 dark:border-zinc-900/40">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-zinc-850 dark:text-zinc-200">{t('bareMinimumMode')}</span>
                              <span className="text-[10px] text-zinc-400 font-mono mt-0.5">
                                {lang === 'hinglish' ? 'Sirf critical aur high priority goals ko show karein.' : 'Filter out low priorities to focus.'}
                              </span>
                            </div>
                            <button
                              onClick={() => setBareMinimumMode(!bareMinimumMode)}
                              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                bareMinimumMode ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-800'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  bareMinimumMode ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Energy & Burnout Analytics section */}
                  <EnergyBurnoutAnalytics
                    lang={lang}
                    tasks={tasks}
                    completedPomodoros={completedPomodoros}
                    currentPersonality={currentPersonality}
                    onActivateZenCooldown={handleToggleZenCooldown}
                    isZenCooldownActive={isZenCooldownActive}
                  />

                  {/* Core layout grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* SVG Chart display */}
                    <div className="lg:col-span-2">
                      <RescueChart completedPomodoros={completedPomodoros} />
                    </div>

                    {/* Quick focus trigger & companion card */}
                    <div className="bg-white dark:bg-zinc-900/30 border border-zinc-200/80 dark:border-zinc-900 p-5 rounded-3xl shadow-sm dark:shadow-none flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-3.5">
                          <Bot className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                          <h3 className="font-display font-bold text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            Companion Profile
                          </h3>
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                          Your companion {currentPersonality.name} is armed with a tailored toolkit. Want to chat or switch personas? Simply use the bottom chat launcher or diagnostics.
                        </p>
                      </div>

                      <div className="space-y-2 border-t border-zinc-100 dark:border-zinc-900/60 pt-4">
                        <button
                          onClick={() => handleTabChange('focus')}
                          className="w-full py-2.5 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-850 text-xs text-zinc-750 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans"
                        >
                          <PlayCircle className="w-4 h-4 text-amber-500" />
                          Launch Focus Space
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* -------------------- VIEW 2: DEADLINE PLANNER -------------------- */}
              <div style={{ display: activeTab === 'planner' ? 'block' : 'none' }}>
                <div className="space-y-6 animate-in fade-in duration-200">
                  
                  {/* Action plan form */}
                  <div className="bg-white dark:bg-zinc-900/30 border border-zinc-200/80 dark:border-zinc-900 p-6 rounded-3xl shadow-sm dark:shadow-none">
                    <div className="flex items-center gap-2 mb-4">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <h3 className="font-display font-bold text-sm text-zinc-900 dark:text-zinc-200">
                        Log High-Stakes Deadline Target
                      </h3>
                    </div>

                    <form onSubmit={handleAddTask} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
                      <div className="md:col-span-2">
                        <label className="block text-[9px] font-mono text-zinc-500 uppercase mb-1">Target Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Complete high-priority engineering deployment"
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          required
                          className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-800 dark:text-zinc-100"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-mono text-zinc-500 uppercase mb-1">Urgency Threat</label>
                        <select
                          value={newTaskUrgency}
                          onChange={(e) => setNewTaskUrgency(e.target.value as any)}
                          className="w-full px-3 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-800 dark:text-zinc-300"
                        >
                          <option value="critical">🔴 Critical Rescue</option>
                          <option value="high">🟠 High Priority</option>
                          <option value="medium">🟡 Medium Focus</option>
                          <option value="low">🟢 Flexible Depth</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-mono text-zinc-500 uppercase mb-1">Category</label>
                        <select
                          value={newTaskCategory}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '__new__') {
                              const newCat = prompt(lang === 'hinglish' ? 'Naya Category naam likhein:' : 'Enter new category name:');
                              if (newCat && newCat.trim()) {
                                const trimmed = newCat.trim();
                                if (!availableCategories.includes(trimmed)) {
                                  setAvailableCategories(prev => [...prev, trimmed]);
                                }
                                setNewTaskCategory(trimmed);
                              }
                            } else {
                              setNewTaskCategory(val);
                            }
                          }}
                          className="w-full px-3 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-800 dark:text-zinc-350"
                        >
                          {availableCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                          <option value="__new__">+ New Category...</option>
                        </select>
                      </div>

                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-[9px] font-mono text-zinc-500 uppercase mb-1">Due Date</label>
                          <input
                            type="date"
                            value={newTaskDueDate}
                            onChange={(e) => setNewTaskDueDate(e.target.value)}
                            required
                            className="w-full px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-800 dark:text-zinc-350 font-mono"
                          />
                        </div>
                        <button
                          type="submit"
                          className={`px-4 py-2 rounded-xl text-white font-semibold shadow hover:opacity-95 transition-all self-end flex items-center justify-center cursor-pointer ${accentColor}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Active targets stack */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider font-bold">
                        Pending Deadline Rescue Targets ({tasks.filter(t => !t.completed).length})
                      </span>
                    </div>

                    {(() => {
                      const displayedTasks = bareMinimumMode
                        ? tasks.filter(t => t.urgency === 'critical' || t.urgency === 'high')
                        : tasks;
                      const hiddenCount = tasks.length - displayedTasks.length;

                      return (
                        <>
                          {bareMinimumMode && hiddenCount > 0 && (
                            <div className="p-4 rounded-3xl border border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                              <div className="flex items-center gap-2.5">
                                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 animate-bounce" style={{ animationDuration: '3s' }} />
                                <div>
                                  <span className="font-bold">
                                    {lang === 'hinglish' ? '⚠️ Bare Minimum Mode Active!' : '⚠️ Bare Minimum Mode Active!'}
                                  </span>
                                  <span className="ml-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                                    {lang === 'hinglish'
                                      ? `Low priority ke ${hiddenCount} tasks hide ho gaye hain taaki aap relax rahain. Sirf critical work par focus karein!`
                                      : `We filtered out ${hiddenCount} low-priority goals to keep you focused only on critical targets.`}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => setBareMinimumMode(false)}
                                className="px-3 py-1 text-[10px] font-bold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl transition-all self-end sm:self-auto cursor-pointer"
                              >
                                {lang === 'hinglish' ? 'Sare Tasks Show Karein' : 'Show All Tasks'}
                              </button>
                            </div>
                          )}

                          {displayedTasks.length === 0 ? (
                            <div className="text-center py-16 bg-zinc-900/10 border border-dashed border-zinc-900 rounded-3xl text-zinc-500">
                              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500/40" />
                              <p className="text-xs font-sans">
                                {lang === 'hinglish' ? 'Sare tasks poore ho gaye hain. Boht badiya!' : 'No threat targets listed. Excellent work!'}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <AnimatePresence mode="popLayout">
                                {displayedTasks.map((task, index) => {
                                  const targetSteps = completedSurvivalSteps[task.id] || {};
                                  const stepCount = task.survivalPlan?.length || 0;
                                  const completedCount = Object.values(targetSteps).filter(Boolean).length;

                                  return (
                                    <motion.div
                                      key={task.id}
                                      layout
                                      initial={{ opacity: 0, y: 15 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.95 }}
                                      transition={{ duration: 0.25, delay: index * 0.05 }}
                                      className={`p-5 rounded-3xl border transition-all relative overflow-hidden bg-white dark:bg-zinc-900/30 border-zinc-200/80 dark:border-zinc-900 shadow-sm dark:shadow-none ${
                                        task.completed ? 'opacity-60 saturate-50' : ''
                                      }`}
                                    >
                                      {/* Decorative color tag */}
                                      <div className={`absolute top-0 bottom-0 left-0 w-1 ${
                                        task.urgency === 'critical' ? 'bg-rose-500' 
                                          : task.urgency === 'high' ? 'bg-amber-500' 
                                          : task.urgency === 'medium' ? 'bg-indigo-500' 
                                          : 'bg-emerald-500'
                                      }`} />

                                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                        <div className="flex items-start gap-3.5">
                                          {/* Toggle master complete */}
                                          <button
                                            onClick={() => handleToggleTask(task.id)}
                                            className="mt-0.5 text-zinc-500 hover:text-indigo-400 transition-colors cursor-pointer"
                                          >
                                            {task.completed ? (
                                              <CheckCircle2 className="w-5 h-5 text-indigo-500 fill-indigo-500/10" />
                                            ) : (
                                              <Circle className="w-5 h-5 text-zinc-400 dark:text-zinc-700 hover:text-zinc-600 dark:hover:text-zinc-500" />
                                            )}
                                          </button>

                                          <div className="space-y-1">
                                            <h4 className={`font-display font-bold text-sm text-zinc-800 dark:text-zinc-200 ${task.completed ? 'line-through text-zinc-400 dark:text-zinc-500' : ''}`}>
                                              {task.title}
                                            </h4>
                                            
                                            <div className="flex flex-wrap items-center gap-2">
                                              <span 
                                                onClick={() => {
                                                  setActiveColorEditingCategory(task.category);
                                                }}
                                                style={{ 
                                                  backgroundColor: `${categoryColors[task.category] || '#71717a'}1c`, 
                                                  color: categoryColors[task.category] || '#71717a',
                                                  borderColor: `${categoryColors[task.category] || '#71717a'}3a`
                                                }}
                                                className="text-[10px] font-mono px-2 py-0.5 rounded border cursor-pointer hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
                                                title="Click to customize category color"
                                              >
                                                <span 
                                                  className="w-1.5 h-1.5 rounded-full shrink-0" 
                                                  style={{ backgroundColor: categoryColors[task.category] || '#71717a' }} 
                                                />
                                                {task.category}
                                              </span>

                                              <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3 text-zinc-400 dark:text-zinc-600" />
                                                {getDaysRemainingText(task.dueDate)}
                                              </span>
                                            </div>

                                            {/* 5-Minute Micro-Start dynamic helper layout */}
                                            {microStarts[task.id] && (
                                              <div className="mt-2.5 p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/5 dark:from-amber-500/5 dark:to-orange-500/0 border border-amber-500/20 text-xs text-zinc-800 dark:text-zinc-300 animate-in fade-in slide-in-from-top-1 max-w-md">
                                                {microStarts[task.id].loading ? (
                                                  <div className="flex items-center gap-2 py-1 text-[11px] font-mono text-amber-600 dark:text-amber-400">
                                                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                                                    AI is mapping the lowest-friction start step...
                                                  </div>
                                                ) : (
                                                  <div className="space-y-1">
                                                    <div className="flex items-start gap-1.5">
                                                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                                      <div>
                                                        <p className="font-sans font-bold text-zinc-900 dark:text-zinc-100 text-[11px]">
                                                          5-Minute Micro-Start:
                                                        </p>
                                                        <p className="font-sans text-zinc-700 dark:text-zinc-300 text-[11px] mt-0.5 leading-normal">
                                                          {microStarts[task.id].action}
                                                        </p>
                                                      </div>
                                                    </div>
                                                    {microStarts[task.id].encouragement && (
                                                      <p className="text-[10px] text-zinc-500 italic pl-5">
                                                        "{microStarts[task.id].encouragement}"
                                                      </p>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* Task Action items */}
                                        <div className="flex flex-wrap gap-2 self-start md:self-auto pl-8 md:pl-0">
                                          <button
                                            onClick={() => handleMicroStart(task)}
                                            className="px-2.5 py-1.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border border-amber-500/20 rounded-xl text-[10px] text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 transition-all flex items-center gap-1 cursor-pointer"
                                            title="Generate a 5-minute low-friction micro-action to start this task"
                                          >
                                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                            Help me start
                                          </button>

                                          <button
                                            onClick={() => handleLaunchFocusForTask(task)}
                                            className="px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl text-[10px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                                            title="Import to active focus timer session"
                                          >
                                            <PlayCircle className="w-3.5 h-3.5 text-amber-500" />
                                            Focus Lock
                                          </button>

                                          <button
                                            onClick={() => handleSyncTaskToCalendar(task)}
                                            className={`px-2.5 py-1.5 border rounded-xl text-[10px] transition-all flex items-center gap-1 cursor-pointer ${
                                              task.calendarSynced 
                                                ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold' 
                                                : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                                            }`}
                                          >
                                            <CalendarDays className="w-3.5 h-3.5 text-indigo-400" />
                                            {task.calendarSynced ? 'Synced Schedule' : 'Schedule Sync'}
                                          </button>

                                          <button
                                            onClick={() => handleDeleteTask(task.id)}
                                            className="p-1.5 bg-zinc-50 dark:bg-zinc-950 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 border border-zinc-200 dark:border-zinc-900 rounded-xl transition-all cursor-pointer"
                                            title="Remove target"
                                          >
                                            <Trash2 className="w-3.5 h-3.5 text-zinc-500" />
                                          </button>
                                        </div>
                                      </div>

                                      {/* AI Triage Display block */}
                                      <div className="mt-4 border-t border-zinc-100 dark:border-zinc-900/60 pt-4 pl-8">
                                        {!task.survivalPlan ? (
                                          <div className="flex items-center justify-between gap-4">
                                            <p className="text-[11px] text-zinc-500">
                                              No tactical plan generated yet. Let your AI Companion analyze this target.
                                            </p>
                                            <button
                                              onClick={() => handleAITriageTask(task)}
                                              disabled={triagingTaskId === task.id}
                                              className="px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 rounded-xl transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                            >
                                              <Bot className="w-3.5 h-3.5" />
                                              {triagingTaskId === task.id ? 'Analyzing threat...' : 'AI Triage Target'}
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="space-y-3 animate-in fade-in duration-200">
                                            <div className="flex items-center justify-between gap-3">
                                              <div className="flex items-center gap-1.5">
                                                <span className="text-xs">🤖</span>
                                                <p className="text-[10px] font-mono font-bold text-zinc-500 dark:text-zinc-400">
                                                  Triage Status:{' '}
                                                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                                                    task.triagePriority === 'CRITICAL RESCUE' ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 font-bold' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 font-bold'
                                                  }`}>
                                                    {task.triagePriority}
                                                  </span>
                                                </p>
                                              </div>
                                              <button
                                                onClick={() => handleAITriageTask(task)}
                                                className="text-[9px] font-mono text-zinc-500 hover:text-zinc-800 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                                                title="Re-run triage content"
                                              >
                                                <RefreshCw className="w-2.5 h-2.5" />
                                                Re-triage
                                              </button>
                                            </div>

                                            <div className="p-3 bg-zinc-50/60 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-900 rounded-2xl">
                                              <p className="text-[11px] text-zinc-700 dark:text-zinc-300 font-sans leading-relaxed mb-2.5 flex items-start gap-1">
                                                <InfoIcon className="w-3 h-3 text-zinc-400 dark:text-zinc-500 flex-shrink-0 mt-0.5" />
                                                <span>
                                                  <strong>{currentPersonality.name} assessment:</strong> {task.priorityExplanation}
                                                </span>
                                              </p>

                                              {/* Sub checklist steps */}
                                              <div className="space-y-1.5 border-t border-zinc-150 dark:border-zinc-900/60 pt-2">
                                                <p className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 mb-1.5">
                                                  Survival Checklist ({completedCount}/{stepCount} completed):
                                                </p>
                                                {task.survivalPlan.map((step, idx) => {
                                                  const isStepCompleted = !!targetSteps[idx];
                                                  return (
                                                    <button
                                                      key={idx}
                                                      onClick={() => handleToggleSurvivalStep(task.id, idx)}
                                                      className="w-full text-left p-2 bg-white dark:bg-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-900 border border-zinc-150 dark:border-zinc-900 hover:border-zinc-250 dark:hover:border-zinc-800 rounded-xl transition-all flex items-center gap-3 cursor-pointer group/step"
                                                    >
                                                      <div className="flex-shrink-0">
                                                        {isStepCompleted ? (
                                                          <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 fill-emerald-400/10" />
                                                        ) : (
                                                          <div className="w-4 h-4 rounded-full border border-zinc-300 dark:border-zinc-750 group-hover/step:border-indigo-400 transition-colors" />
                                                        )}
                                                      </div>
                                                      <span className={`text-[11px] font-sans ${isStepCompleted ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-700 dark:text-zinc-300 font-medium'}`}>
                                                        {step}
                                                      </span>
                                                    </button>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </motion.div>
                                  );
                                })}
                              </AnimatePresence>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                </div>
              </div>

              {/* -------------------- VIEW 3: FOCUS SPACE -------------------- */}
              <div style={{ display: activeTab === 'focus' ? 'block' : 'none' }}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
                  
                  {/* Big Focus session launcher card */}
                  {selectedTaskForFocus && (
                    <div className="lg:col-span-3 p-4 bg-zinc-900/40 border border-zinc-900 rounded-2xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
                        <span className="text-xs font-sans text-zinc-400">
                          Active Focus Target Lock: <strong className="text-zinc-200">"{selectedTaskForFocus}"</strong>
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedTaskForFocus('')}
                        className="text-[10px] font-mono text-zinc-500 hover:text-white"
                      >
                        Reset Lock
                      </button>
                    </div>
                  )}

                  <div className="lg:col-span-2">
                    <FocusTimer 
                      onSessionComplete={handleFocusSessionComplete}
                      accentColor={accentColor}
                      borderColor={borderColor}
                      onNuclearLockStateChange={setIsNuclearLocked}
                    />
                  </div>

                  <div className="space-y-6">
                    <div className="bg-zinc-900/30 border border-zinc-900 p-5 rounded-3xl">
                      <h4 className="font-display font-bold text-xs text-zinc-400 uppercase tracking-wider mb-2.5">
                        Focus Ambient Frequency Info
                      </h4>
                      <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                        Natural soundscapes block external sensory triggers and lock your brain into alpha wave generation. Toggle Natural Rain, Ocean Waves, or Zen Drone directly in the Focus Timer audio controls.
                      </p>
                    </div>

                    {/* SVG Chart display within focus tab for convenience */}
                    <div className="relative">
                      <RescueChart completedPomodoros={completedPomodoros} />
                      <button 
                        onClick={() => {
                          setCompletedPomodoros(0);
                          localStorage.setItem('flowmind_pomodoros', '0');
                        }}
                        className="mt-3 text-[11px] font-medium font-sans text-zinc-500 hover:text-zinc-300 w-full text-center transition-colors px-3 py-1.5 border border-zinc-800 rounded-lg bg-zinc-900/30 hover:bg-zinc-800/50"
                      >
                        Reset Pomodoro Counts
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* -------------------- VIEW 4: GOOGLE CALENDAR TIMELINE -------------------- */}
              <div style={{ display: activeTab === 'calendar' ? 'block' : 'none' }}>
                <div className="max-w-4xl mx-auto animate-in fade-in duration-200">
                  <CalendarDashboard 
                    accentColor={accentColor}
                    borderColor={borderColor}
                    textColor={textColor}
                  />
                </div>
              </div>

              {/* -------------------- VIEW 5: QUICK NOTES & AI SPLITTER -------------------- */}
              <div style={{ display: activeTab === 'notes' ? 'block' : 'none' }}>
                <div className="max-w-4xl mx-auto animate-in fade-in duration-200">
                  <AIEnhancedNotes 
                    lang={lang}
                    t={t}
                    onAddMultipleTasks={handleAddMultipleTasks}
                    currentPersonality={currentPersonality}
                  />
                </div>
              </div>

            </div>
          )}

        </main>
      </div>

      {/* Floating AI Companion Orb and Streaming Chat Interface */}
      {!isOnboarding && (
        <AIOrbChat 
          currentPersonality={currentPersonality}
          onChangePersonality={handleSelectPersonality}
          onAddTaskFromAI={(title) => {
            // Save suggestor
            const newTask: Task = {
              id: `task-${Date.now()}`,
              title: title.trim(),
              completed: false,
              dueDate: new Date().toISOString().substring(0, 10),
              urgency: 'high',
              category: 'AI Suggestion',
              calendarSynced: false
            };
            setTasks(prev => [newTask, ...prev]);
            handleTabChange('planner');
            alert(`Saved target "${title}" to your planner targets!`);
          }}
          accentColor={accentColor}
        />
      )}

      {/* Diagnostic Quiz Modal */}
      {showQuizModal && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-2xl relative">
            <button
              onClick={() => setShowQuizModal(false)}
              className="absolute -top-12 right-0 p-2 text-white hover:text-rose-400 flex items-center gap-1 text-xs transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
              Close
            </button>
            <PersonalityQuiz 
              onSelectPersonality={handleSelectPersonality}
              onClose={() => setShowQuizModal(false)}
            />
          </div>
        </div>
      )}

      {/* Task Completion Celebration Modal */}
      {showCelebration && celebratedTask && (
        <div className="fixed inset-0 bg-zinc-950/60 dark:bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-300">
          <div className={`w-full max-w-lg bg-[#faf9f5] dark:bg-zinc-900 border-2 ${currentPersonality.borderColorClass} p-8 rounded-3xl shadow-2xl relative overflow-hidden text-center transition-all duration-300`}>
            
            {/* Subtle background abstract glow matching character theme */}
            <div className={`absolute -top-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-20 bg-gradient-to-br ${currentPersonality.bgGradientClass}`} />
            <div className={`absolute -bottom-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 bg-gradient-to-br ${currentPersonality.bgGradientClass}`} />

            {/* Sparkly corner elements */}
            <Sparkles className={`w-8 h-8 absolute top-6 left-6 opacity-30 animate-pulse ${textColor}`} />
            <Sparkles className={`w-8 h-8 absolute bottom-6 right-6 opacity-30 animate-pulse ${textColor}`} />

            <div className="relative z-10 space-y-6">
              {/* Giant Bouncing Emoji */}
              <div className="flex justify-center">
                <span className="text-7xl filter drop-shadow-lg select-none inline-block animate-bounce" style={{ animationDuration: '2.5s' }}>
                  {currentPersonality.emoji}
                </span>
              </div>

              {/* Celebration Title */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-bold block">
                  Critical Rescue Accomplished
                </span>
                <h3 className="text-2xl font-display font-extrabold text-zinc-900 dark:text-white tracking-tight">
                  Target Secured!
                </h3>
              </div>

              {/* The completed task title with strikethrough visual flair */}
              <div className="py-2.5 px-4 bg-zinc-100 dark:bg-zinc-950/40 border border-zinc-200/50 dark:border-zinc-800 rounded-2xl max-w-md mx-auto">
                <p className="text-xs font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                  SECURED TASK OBJECTIVE:
                </p>
                <p className="text-sm font-sans font-bold text-zinc-850 dark:text-zinc-200 line-through decoration-emerald-500 decoration-2">
                  {celebratedTask.title}
                </p>
              </div>

              {/* Personalized Praise Message */}
              <div className="p-5 rounded-2xl bg-white dark:bg-zinc-950/20 border border-zinc-150 dark:border-zinc-900 shadow-inner max-w-md mx-auto">
                <p className="text-xs text-zinc-600 dark:text-zinc-300 font-sans leading-relaxed text-left">
                  {getCompanionCelebrationMessage(celebratedTask.title)}
                </p>
              </div>

              {/* Companion validation label */}
              <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                Praise generated by your companion <strong>{currentPersonality.name}</strong>
              </p>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    setShowCelebration(false);
                    setCelebratedTask(null);
                  }}
                  className={`w-full max-w-xs py-3 rounded-2xl font-semibold text-xs text-white shadow-lg cursor-pointer hover:shadow-xl active:scale-95 transition-all bg-gradient-to-r ${currentPersonality.bgGradientClass}`}
                >
                  Continue Flow State
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Zen Cooldown Rest Mode Fullscreen Overlay */}
      {isZenCooldownActive && (
        <div className="fixed inset-0 bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 z-50 overflow-y-auto animate-in fade-in duration-500">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/15 via-zinc-950 to-zinc-950 pointer-events-none" />
          
          <div className="max-w-xl w-full text-center space-y-8 z-10">
            <div className="space-y-2">
              <span className="text-[10px] font-mono tracking-widest text-emerald-400 font-extrabold uppercase">
                {lang === 'hinglish' ? '• Active Mindful Rest Protocol •' : '• Active Mindful Rest Protocol •'}
              </span>
              <h2 className="font-display font-black text-3xl md:text-4xl text-white tracking-tight">
                {lang === 'hinglish' ? 'Zen Cooldown Day' : 'Zen Cooldown Day'}
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed max-w-md mx-auto">
                {lang === 'hinglish' ? 'Aapki energy limited hai. Aaj stress free rahiye, breathe karein aur goals ko thoda rest dejiye.' : 'Your energy is a finite resource. Today, let go of the pressure to complete, and cultivate mindful space.'}
              </p>
            </div>

            {/* Breathing Sphere */}
            <div className="flex flex-col items-center justify-center py-6">
              <div className="w-40 h-40 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center relative animate-pulse" style={{ animationDuration: '6s' }}>
                <div className="w-28 h-28 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center animate-ping" style={{ animationDuration: '6s' }} />
                <div className="absolute text-center text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-wider">
                  {lang === 'hinglish' ? 'Saans lein... aur chhodein...' : 'Breathe In... Out...'}
                </div>
              </div>
            </div>

            {/* Zen Philosophy Quotes Card */}
            <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl max-w-md mx-auto space-y-3 shadow-xl">
              <Moon className="w-5 h-5 mx-auto text-emerald-400 animate-bounce" style={{ animationDuration: '4s' }} />
              <p className="text-xs text-zinc-300 font-sans italic leading-relaxed">
                {currentPersonality.id === 'philosopher'
                  ? (lang === 'hinglish' ? '“Waqt ek behne wali nadi hai jo sirf abhi (present) me behti hai. Kinare par baithkar paani ka maza lein, tairne ki jaldi mat karein.”' : '“Do not speed up to catch the horizon. The horizon is already within you. Resting is as noble as striving.”')
                  : (lang === 'hinglish' ? '“Aaj koi to-do list nahi hai. Sirf apni shaant consciousness hai. Checklist ko sone dein taaki soul wake up ho sake.”' : '“Today, there are no tasks. Only pure, tranquil awareness. Let your checklist sleep so your spirit can wake.”')
                }
              </p>
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono block">
                — {currentPersonality.name}
              </span>
            </div>

            {/* Ambient Controls */}
            <div className="space-y-2">
              <span className="text-[9px] uppercase font-mono tracking-widest text-zinc-500 block">
                {lang === 'hinglish' ? 'Sunein aur relax karein:' : 'Soothing Ambience Generator:'}
              </span>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => synthManager.playZenDrone()}
                  className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-850 text-[10px] font-semibold rounded-xl border border-zinc-800 text-zinc-300 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  Zen Drone
                </button>
                <button
                  onClick={() => synthManager.playLofi2()}
                  className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-850 text-[10px] font-semibold rounded-xl border border-zinc-800 text-zinc-300 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Music className="w-3.5 h-3.5 text-sky-400" />
                  Lofi Beats 2
                </button>
                <button
                  onClick={() => synthManager.stop()}
                  className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-850 text-[10px] font-semibold rounded-xl border border-zinc-800 text-zinc-400 transition-all cursor-pointer"
                >
                  Mute
                </button>
              </div>
            </div>

            <div>
              <button
                onClick={() => handleToggleZenCooldown(false)}
                className="px-6 py-3 bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-bold rounded-2xl transition-all cursor-pointer shadow-lg inline-flex items-center gap-2"
              >
                <Sun className="w-4 h-4 text-amber-500" />
                {lang === 'hinglish' ? 'Workspace par wapas chalein' : 'Resume Active Workspace'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Non-intrusive Toast Notifications at the bottom */}
      {activeToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur shadow-xl animate-in slide-in-from-bottom-5 duration-200 flex items-center gap-4 text-xs font-sans max-w-sm w-[90vw] justify-between">
          <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span>{activeToast.message}</span>
          </div>
          {activeToast.onUndo && (
            <button
              onClick={() => {
                activeToast.onUndo?.();
                setActiveToast(null);
              }}
              className="px-2.5 py-1 text-[10px] font-mono font-extrabold uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/15 rounded-lg hover:bg-indigo-500/25 transition-all cursor-pointer shrink-0"
            >
              {lang === 'hinglish' ? 'Wapas lein (Undo)' : 'Undo'}
            </button>
          )}
        </div>
      )}

      {/* Category Custom Color Customizer Modal */}
      {activeColorEditingCategory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] max-w-sm w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200"
          >
            <button 
              onClick={() => setActiveColorEditingCategory(null)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-display font-bold text-base text-zinc-900 dark:text-white mb-2">
              {lang === 'hinglish' ? 'Category Color Customize Karein' : 'Customize Category Color'}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              {lang === 'hinglish' 
                ? `Category "${activeColorEditingCategory}" ke liye apna manpasand color choose karein.` 
                : `Set a custom color for the category "${activeColorEditingCategory}" to keep things organized.`}
            </p>

            {/* Presets Grid */}
            <div className="grid grid-cols-6 gap-2 mb-4">
              {[
                '#3b82f6', // Blue
                '#ef4444', // Red
                '#ec4899', // Pink
                '#10b981', // Green
                '#8b5cf6', // Purple
                '#f97316', // Orange
                '#14b8a6', // Teal
                '#f59e0b', // Amber
                '#06b6d4', // Cyan
                '#84cc16', // Lime
                '#6366f1', // Indigo
                '#a855f7', // Purple-bright
              ].map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    setCategoryColors(prev => ({
                      ...prev,
                      [activeColorEditingCategory]: color
                    }));
                  }}
                  className="w-full h-8 rounded-xl border border-white/20 relative shadow-sm cursor-pointer transition-transform hover:scale-110 active:scale-95"
                  style={{ backgroundColor: color }}
                >
                  {categoryColors[activeColorEditingCategory] === color && (
                    <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <div className="space-y-2 mb-6">
              <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">
                Custom HEX Code:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={categoryColors[activeColorEditingCategory] || '#71717a'}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCategoryColors(prev => ({
                      ...prev,
                      [activeColorEditingCategory]: val
                    }));
                  }}
                  className="flex-1 px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 text-zinc-800 dark:text-zinc-100 font-mono"
                  placeholder="#FFFFFF"
                />
                <input
                  type="color"
                  value={categoryColors[activeColorEditingCategory] || '#71717a'}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCategoryColors(prev => ({
                      ...prev,
                      [activeColorEditingCategory]: val
                    }));
                  }}
                  className="w-10 h-8 rounded-xl bg-transparent border-0 cursor-pointer overflow-hidden shrink-0"
                />
              </div>
            </div>

            <button
              onClick={() => setActiveColorEditingCategory(null)}
              className="w-full py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold rounded-xl shadow hover:opacity-90 transition-opacity cursor-pointer"
            >
              {lang === 'hinglish' ? 'Ho Gaya' : 'Done'}
            </button>
          </div>
        </div>
      )}


    </div>
  );
}
