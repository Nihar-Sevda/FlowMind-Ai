import React, { useState, useEffect, useRef } from 'react';
import { TimerMode } from '../types';
import { synthManager } from '../utils/audioSynth';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Eye, Flame, Moon, Sparkles, Music, Mic, MicOff, Settings, ShieldAlert, Sliders, ChevronDown, ChevronUp } from 'lucide-react';

interface FocusTimerProps {
  onSessionComplete?: (mode: TimerMode) => void;
  accentColor?: string;
  borderColor?: string;
  onNuclearLockStateChange?: (locked: boolean) => void;
}

const MODE_LABELS: Record<TimerMode, string> = {
  work: 'Work Session',
  shortBreak: 'Short Break',
  longBreak: 'Long Break',
};

export default function FocusTimer({ onSessionComplete, accentColor = 'bg-indigo-600', borderColor = 'border-indigo-500', onNuclearLockStateChange }: FocusTimerProps) {
  const [customTimes, setCustomTimes] = useState<Record<TimerMode, number>>(() => {
    const saved = localStorage.getItem('flowmind_custom_timer_modes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      work: 25 * 60,
      shortBreak: 5 * 60,
      longBreak: 15 * 60,
    };
  });

  const [nuclearEnabled, setNuclearEnabled] = useState<boolean>(() => {
    return localStorage.getItem('flowmind_nuclear_enabled') === 'true';
  });

  const [showSettings, setShowSettings] = useState<boolean>(false);

  const [mode, setMode] = useState<TimerMode>('work');
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const saved = localStorage.getItem('flowmind_custom_timer_modes');
    if (saved) {
      try {
        return JSON.parse(saved).work;
      } catch {}
    }
    return 25 * 60;
  });
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [ambientSound, setAmbientSound] = useState<'none' | 'rain' | 'thunderstorm' | 'drone' | 'brownnoise' | 'lofi' | 'lofi2'>('none');
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [voiceCommandsActive, setVoiceCommandsActive] = useState<boolean>(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [heardCommand, setHeardCommand] = useState<string>('');
  const [commandFeedback, setCommandFeedback] = useState<string>('');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('flowmind_custom_timer_modes', JSON.stringify(customTimes));
  }, [customTimes]);

  useEffect(() => {
    localStorage.setItem('flowmind_nuclear_enabled', String(nuclearEnabled));
  }, [nuclearEnabled]);

  const isNuclearActive = nuclearEnabled && isRunning && mode === 'work';

  useEffect(() => {
    onNuclearLockStateChange?.(isNuclearActive);
    return () => {
      onNuclearLockStateChange?.(false);
    };
  }, [isNuclearActive, onNuclearLockStateChange]);

  // Synchronise voice recognition lifecycle
  useEffect(() => {
    if (voiceCommandsActive) {
      // @ts-ignore
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setVoiceError("Your browser doesn't support the Web Speech API. Try Chrome or Safari.");
        setVoiceCommandsActive(false);
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const lastResultIndex = event.results.length - 1;
        const transcript = event.results[lastResultIndex][0].transcript.trim().toLowerCase();
        setHeardCommand(transcript);

        if (transcript.includes('start') || transcript.includes('flow') || transcript.includes('begin') || transcript.includes('session')) {
          setIsRunning(true);
          setCommandFeedback('Triggered: Start Session ⚡');
          setTimeout(() => setCommandFeedback(''), 3000);
        } else if (transcript.includes('pause') || transcript.includes('stop') || transcript.includes('hold')) {
          setIsRunning(false);
          setCommandFeedback('Triggered: Pause Focus ⏸️');
          setTimeout(() => setCommandFeedback(''), 3000);
        } else if (transcript.includes('reset') || transcript.includes('restart') || transcript.includes('clear')) {
          setIsRunning(false);
          setSecondsLeft(customTimes[mode]);
          setCommandFeedback('Triggered: Reset Timer 🔄');
          setTimeout(() => setCommandFeedback(''), 3000);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === 'not-allowed') {
          setVoiceError("Microphone permission was denied.");
          setVoiceCommandsActive(false);
        }
      };

      recognition.onend = () => {
        // Automatically restart listening if still enabled
        if (voiceCommandsActive && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.warn("Restart failed:", e);
          }
        }
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
        setVoiceError(null);
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
      }
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
        recognitionRef.current = null;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [voiceCommandsActive, mode]);

  // Synchronise timer initial seconds when mode changes
  useEffect(() => {
    setIsRunning(false);
    setSecondsLeft(customTimes[mode]);
  }, [mode, customTimes]);

  // Handle countdown logic
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            if (timerRef.current) clearInterval(timerRef.current);
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode]);

  // Synchronise synthesiser based on state
  useEffect(() => {
    if (!isRunning || isAudioMuted || ambientSound === 'none') {
      synthManager.stop();
    } else {
      if (ambientSound === 'rain') {
        synthManager.playRain();
      } else if (ambientSound === 'thunderstorm') {
        synthManager.playThunderstorm();
      } else if (ambientSound === 'drone') {
        synthManager.playZenDrone();
      } else if (ambientSound === 'brownnoise') {
        synthManager.playBrownNoise();
      } else if (ambientSound === 'lofi') {
        synthManager.playLofi();
      } else if (ambientSound === 'lofi2') {
        synthManager.playLofi2();
      }
    }
  }, [isRunning, ambientSound, isAudioMuted]);

  // Cleanup synthesizer on component unmount
  useEffect(() => {
    return () => {
      synthManager.stop();
    };
  }, []);

  // Keyboard shortcut: Spacebar to pause/resume
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const activeEl = document.activeElement;
        if (activeEl && (
          activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true'
        )) {
          return;
        }
        e.preventDefault();
        setIsRunning(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  const handleTimerComplete = () => {
    // Play a gentle built-in synth chime to signal session end
    try {
      // @ts-ignore
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3); // G5
      osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.45); // C6
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch {}

    if (onSessionComplete) {
      onSessionComplete(mode);
    }
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setSecondsLeft(customTimes[mode]);
  };

  const handleTimeChange = (modeKey: TimerMode, mins: number) => {
    const seconds = Math.max(1, Math.min(180, mins)) * 60;
    setCustomTimes(prev => ({ ...prev, [modeKey]: seconds }));
    if (mode === modeKey) {
      setSecondsLeft(seconds);
    }
  };

  const selectMode = (newMode: TimerMode) => {
    setMode(newMode);
  };

  const toggleMute = () => {
    setIsAudioMuted(!isAudioMuted);
  };

  // Format seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate percentage progress
  const totalSeconds = customTimes[mode];
  const progressPercent = ((totalSeconds - secondsLeft) / totalSeconds) * 100;

  return (
    <div id="pomodoro-focus-card" className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-lg transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-lg">
            <Flame className="w-5 h-5" />
          </div>
          <h3 className="font-sans font-semibold text-lg text-zinc-900 dark:text-zinc-50">
            Focus Space
          </h3>
        </div>
        
        {/* Ambient audio selection */}
        <div className="flex items-center gap-2 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 transition-all duration-300 shadow-sm hover:border-indigo-200 hover:bg-indigo-100/50">
          <Music className="w-4 h-4 text-indigo-500 animate-pulse" />
          <select
            id="ambient-sound-select"
            value={ambientSound}
            onChange={(e) => setAmbientSound(e.target.value as any)}
            className="text-xs bg-transparent border-none text-indigo-700 dark:text-indigo-300 focus:outline-none cursor-pointer font-sans font-semibold"
          >
            <option value="none" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">Silence</option>
            <option value="rain" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">Natural Rain</option>
            <option value="thunderstorm" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">Stormy Rain</option>
            <option value="drone" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">Zen Drone</option>
            <option value="brownnoise" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">Brown Noise</option>
            <option value="lofi" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">Lofi Beats</option>
            <option value="lofi2" className="bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">Lofi Beats 2</option>
          </select>

          {ambientSound !== 'none' && (
            <button
              onClick={toggleMute}
              className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded text-indigo-600 dark:text-indigo-400 transition-colors"
              title={isAudioMuted ? "Unmute ambience" : "Mute ambience"}
            >
              {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Mode Buttons */}
      <div className="flex gap-2 mb-8 bg-zinc-50 dark:bg-zinc-950 p-1.5 rounded-2xl border border-zinc-100 dark:border-zinc-850">
        {(['work', 'shortBreak', 'longBreak'] as TimerMode[]).map((m) => (
          <button
            key={m}
            id={`timer-mode-${m}`}
            onClick={() => selectMode(m)}
            className={`flex-1 py-2 text-xs font-sans font-medium rounded-xl transition-all duration-200 ${
              mode === m
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm border border-zinc-200/50 dark:border-zinc-700/50'
                : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Visual Timer Node */}
      <div className="flex flex-col items-center justify-center py-6 relative">
        {/* Circular progress container */}
        <div className="w-52 h-52 rounded-full border-[6px] border-zinc-100 dark:border-zinc-800 flex items-center justify-center relative overflow-hidden transition-all duration-300">
          {/* Animated fill-ring representation using concentric border effects */}
          <div 
            className="absolute inset-0 border-[6px] border-indigo-500 dark:border-indigo-400 rounded-full opacity-10"
            style={{ clipPath: `polygon(50% 50%, -50% -50%, ${progressPercent}% -50%, ${progressPercent}% 150%, -50% 150%)` }}
          />

          <div className="text-center z-10">
            <span className="font-mono text-4xl sm:text-5xl font-bold tracking-tight text-zinc-950 dark:text-white block">
              {formatTime(secondsLeft)}
            </span>
            <span className="text-[10px] uppercase tracking-widest font-sans font-semibold text-zinc-400 mt-1 block">
              {isRunning ? 'Flow State' : 'Paused'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center justify-center gap-4 mt-6">
        <button
          onClick={resetTimer}
          className="p-3 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer"
          title="Reset Timer"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <button
          id="btn-play-pause-timer"
          onClick={toggleTimer}
          className={`flex-1 max-w-[180px] py-3.5 rounded-2xl font-sans font-semibold flex items-center justify-center gap-2 shadow-md transition-all duration-200 active:scale-95 text-white cursor-pointer ${
            isRunning 
              ? 'bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90' 
              : `${accentColor} hover:opacity-90`
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-5 h-5 fill-current" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              Start focus
            </>
          )}
        </button>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-3 border rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer ${
            showSettings
              ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 border-indigo-200 dark:border-indigo-900'
              : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
          }`}
          title="Customize Focus Space"
        >
          <Settings className={`w-5 h-5 ${showSettings ? 'rotate-45' : ''} transition-transform duration-200`} />
        </button>
      </div>

      {/* Collapsible Customization and Nuclear Option settings panel */}
      {showSettings && (
        <div className="mt-6 p-4 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-150 dark:border-zinc-850 rounded-2xl space-y-4 animate-in slide-in-from-top-2 duration-200 text-left">
          <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-800 pb-2">
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-500" />
              Customize Focus Intervals
            </span>
            <span className="text-[10px] font-mono text-zinc-400 uppercase">Durations (Mins)</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[9px] font-mono text-zinc-400 uppercase mb-1">Focus</label>
              <input
                type="number"
                min="1"
                max="180"
                value={Math.round(customTimes.work / 60)}
                onChange={(e) => handleTimeChange('work', parseInt(e.target.value) || 25)}
                className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[9px] font-mono text-zinc-400 uppercase mb-1">Short Brk</label>
              <input
                type="number"
                min="1"
                max="180"
                value={Math.round(customTimes.shortBreak / 60)}
                onChange={(e) => handleTimeChange('shortBreak', parseInt(e.target.value) || 5)}
                className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[9px] font-mono text-zinc-400 uppercase mb-1">Long Brk</label>
              <input
                type="number"
                min="1"
                max="180"
                value={Math.round(customTimes.longBreak / 60)}
                onChange={(e) => handleTimeChange('longBreak', parseInt(e.target.value) || 15)}
                className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Nuclear Option Toggle */}
          <div className="flex items-center justify-between p-3 bg-red-50/20 dark:bg-red-950/5 border border-red-200/20 dark:border-red-950/20 rounded-xl">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-red-100/55 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg">
                <ShieldAlert className="w-4 h-4 text-red-500" />
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">Nuclear Option Lock</span>
                <span className="text-[10px] text-zinc-500 block leading-tight">Blocks tab switching during active Pomodoro work</span>
              </div>
            </div>
            <button
              onClick={() => setNuclearEnabled(!nuclearEnabled)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                nuclearEnabled ? 'bg-red-500' : 'bg-zinc-200 dark:bg-zinc-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  nuclearEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Comforting Voice-Activated session controls */}
      <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-850">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left">
            <h4 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
              <span className="flex h-2 w-2 relative">
                {voiceCommandsActive ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-400"></span>
                )}
              </span>
              Hands-Free Session Trigger
            </h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Activate the microphone to trigger flow states hands-free. Try saying: <strong className="text-indigo-600 dark:text-indigo-400 font-medium">"Start session"</strong>, <strong className="text-indigo-600 dark:text-indigo-400 font-medium">"Pause session"</strong>, or <strong className="text-indigo-600 dark:text-indigo-400 font-medium">"Reset timer"</strong>.
            </p>
          </div>

          <button
            onClick={() => setVoiceCommandsActive(!voiceCommandsActive)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold font-sans flex items-center gap-2 transition-all duration-300 active:scale-95 border cursor-pointer ${
              voiceCommandsActive
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40 shadow-sm'
                : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-900'
            }`}
          >
            {voiceCommandsActive ? (
              <>
                <Mic className="w-3.5 h-3.5 animate-pulse text-emerald-500" />
                Listening Active
              </>
            ) : (
              <>
                <MicOff className="w-3.5 h-3.5 text-zinc-400" />
                Hands-Free Off
              </>
            )}
          </button>
        </div>

        {/* Command indicator overlays */}
        {voiceCommandsActive && (
          <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2.5">
              <span className="text-xs">🎙️</span>
              <span className="text-[11px] font-mono font-medium text-zinc-500 dark:text-zinc-400">
                {heardCommand ? `Heard: "${heardCommand}"` : 'Awaiting audio cue...'}
              </span>
            </div>
            {commandFeedback ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200/40">
                {commandFeedback}
              </span>
            ) : (
              <span className="text-[10px] text-zinc-400 animate-pulse font-mono">
                Hands-Free On
              </span>
            )}
          </div>
        )}

        {voiceError && (
          <p className="text-[10px] text-rose-500 font-sans mt-2">
            ⚠️ {voiceError}
          </p>
        )}
      </div>

      {ambientSound !== 'none' && isRunning && !isAudioMuted && (
        <div className="mt-6 text-center animate-pulse">
          <p className="text-[11px] text-indigo-500 dark:text-indigo-400 font-sans font-medium flex items-center justify-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Procedural ambience active...
          </p>
        </div>
      )}
    </div>
  );
}
