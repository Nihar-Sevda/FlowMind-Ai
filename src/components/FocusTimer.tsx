import React, { useState, useEffect, useRef } from 'react';
import { TimerMode } from '../types';
import { synthManager } from '../utils/audioSynth';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Eye, Flame, Moon, Sparkles, Music, Mic, MicOff, Settings, ShieldAlert, Sliders, ChevronDown, ChevronUp, Download, X, Youtube, Check, ExternalLink, Radio } from 'lucide-react';

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

function getYouTubeId(urlOrId: string): string {
  if (!urlOrId) return '';
  const trimmed = urlOrId.trim();
  if (trimmed.length === 11 && !trimmed.includes('/') && !trimmed.includes('?')) {
    return trimmed;
  }
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = trimmed.match(regExp);
  return (match && match[2].length === 11) ? match[2] : trimmed;
}

function parseYouTubeCustomSource(input: string): { id: string; type: 'video' | 'playlist' } {
  if (!input) return { id: '', type: 'video' };
  const trimmed = input.trim();
  
  const playlistMatch = trimmed.match(/[&?]list=([^&#\?]+)/);
  if (playlistMatch) {
    return { id: playlistMatch[1], type: 'playlist' };
  }
  
  if (trimmed.startsWith('PL') && trimmed.length >= 18) {
    return { id: trimmed, type: 'playlist' };
  }
  
  const videoId = getYouTubeId(trimmed);
  return { id: videoId, type: 'video' };
}

const AMBIENT_TRACKS = [
  { id: 'yt-lofigirl', name: 'Lofi Girl Live', searchQuery: 'lofi girl live', desc: 'Chill lofi hip-hop beats, perfect for calming workflow', icon: '👧', category: 'YouTube' },
  { id: 'yt-rainy-jazz', name: 'Rainy Cafe Piano', searchQuery: 'rainy cafe piano jazz 10 hours', desc: 'Relaxing piano jazz lounge with warm fireplace sounds', icon: '🎹', category: 'YouTube' },
  { id: 'yt-synthwave', name: 'Synthwave Focus', searchQuery: 'synthwave focus beats coding', desc: 'Rhythmic outrun & synth tracks perfect for coding flow', icon: '👾', category: 'YouTube' },
  { id: 'yt-classical', name: 'Classical Study', searchQuery: 'classical music for studying brain power', desc: 'Symphonies and concertos for academic deep focus', icon: '🎻', category: 'YouTube' },
  { id: 'yt-nature', name: 'Nature Ambience', searchQuery: 'nature ambience forest river', desc: 'Peaceful birds, running streams, and rustling leaves', icon: '🌲', category: 'YouTube' },
  { id: 'yt-space', name: 'Cosmic Ambient', searchQuery: 'cosmic ambient healing space music', desc: 'Slow ethereal cosmic synth pads and meditation drones', icon: '🚀', category: 'YouTube' },
  { id: 'custom-yt', name: 'Custom YouTube Stream', desc: 'Load and play any YouTube stream, track, mix or playlist directly!', icon: '🔗', category: 'YouTube', isCustom: true },
  { id: 'lofi2', name: 'Midnight Coffee Shop', desc: 'Chill beats, sequenced Rhodes chords & tape hiss (82 BPM)', icon: '☕', category: 'Synthetic' },
  { id: 'lofi', name: 'Warm Dusty Vinyl', desc: 'Nostalgic lofi crackles with a deep triangle pad', icon: '📻', category: 'Synthetic' },
  { id: 'rain', name: 'Whispering Forest Rain', desc: 'Sizzling rain, dripping droplets, and gentle distant thunder', icon: '🌧️', category: 'Synthetic' },
  { id: 'thunderstorm', name: 'Electric Summer Storm', desc: 'Heavy downpour with procedural winds and rolling sub-bass thunder', icon: '⚡', category: 'Synthetic' },
  { id: 'drone', name: 'Deep Space Zen Drone', desc: 'Detuned chorus harmonic sine waves for deep meditation', icon: '🌌', category: 'Synthetic' },
  { id: 'brownnoise', name: 'Muffled Waterfall', desc: 'Soothing pink/brown noise to block out distractions', icon: '🌊', category: 'Synthetic' },
];

export default function FocusTimer({ onSessionComplete, accentColor = 'bg-indigo-600', borderColor = 'border-indigo-500', onNuclearLockStateChange }: FocusTimerProps) {
  const [customTimes, setCustomTimes] = useState<Record<TimerMode, number>>(() => {
    const saved = localStorage.getItem('kairos_custom_timer_modes');
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
    return localStorage.getItem('kairos_nuclear_enabled') === 'true';
  });

  const [showSettings, setShowSettings] = useState<boolean>(false);

  const [mode, setMode] = useState<TimerMode>('work');
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const saved = localStorage.getItem('kairos_custom_timer_modes');
    if (saved) {
      try {
        return JSON.parse(saved).work;
      } catch {}
    }
    return 25 * 60;
  });
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [ambientSound, setAmbientSound] = useState<string>('none');
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [musicPlaying, setMusicPlaying] = useState<boolean>(false);
  const [autoPlayWithTimer, setAutoPlayWithTimer] = useState<boolean>(true);
  const [ambientVolume, setAmbientVolume] = useState<number>(() => {
    return Math.round(synthManager.getVolume() * 100);
  });
  const [showMusicDeck, setShowMusicDeck] = useState<boolean>(false);
  const [showAmbienceModal, setShowAmbienceModal] = useState<boolean>(false);
  
  const [customYoutubeId, setCustomYoutubeId] = useState<string>(() => {
    return localStorage.getItem('kairos_custom_yt_id') || '3S_W_ZkK6uU';
  });
  const [customYoutubeType, setCustomYoutubeType] = useState<'video' | 'playlist'>(() => {
    return (localStorage.getItem('kairos_custom_yt_type') as 'video' | 'playlist') || 'video';
  });
  const [customYoutubeInput, setCustomYoutubeInput] = useState<string>(() => {
    return localStorage.getItem('kairos_custom_yt_id') || '3S_W_ZkK6uU';
  });

  const [activeVideoId, setActiveVideoId] = useState<string>('');
  const [activeVideoTitle, setActiveVideoTitle] = useState<string>('');
  const [activeVideoChannel, setActiveVideoChannel] = useState<string>('');
  const [activeVideoThumbnail, setActiveVideoThumbnail] = useState<string>('');
  const [isLoadingMusic, setIsLoadingMusic] = useState<boolean>(false);
  const [musicError, setMusicError] = useState<string | null>(null);
  const [resolvedYoutubeTracks, setResolvedYoutubeTracks] = useState<Record<string, { videoId: string; title: string; channelName: string; thumbnail: string }>>({});

  const ytPlayerRef = useRef<HTMLIFrameElement | null>(null);
  const [voiceCommandsActive, setVoiceCommandsActive] = useState<boolean>(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [heardCommand, setHeardCommand] = useState<string>('');
  const [commandFeedback, setCommandFeedback] = useState<string>('');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('kairos_custom_timer_modes', JSON.stringify(customTimes));
  }, [customTimes]);

  useEffect(() => {
    localStorage.setItem('kairos_nuclear_enabled', String(nuclearEnabled));
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

  // Synchronise volume level
  useEffect(() => {
    synthManager.setVolume(ambientVolume / 100);
  }, [ambientVolume]);

  const shouldPlayMusic = (musicPlaying || (autoPlayWithTimer && isRunning)) && !isAudioMuted && ambientSound !== 'none';
  const isYoutubeTrack = ambientSound.startsWith('yt-') || ambientSound === 'custom-yt';
  
  const isYoutubePlaylist = ambientSound === 'custom-yt' && customYoutubeType === 'playlist';

  const activeEmbedUrl = (() => {
    if (ambientSound === 'custom-yt') {
      if (customYoutubeType === 'playlist') {
        return `https://www.youtube.com/embed/videoseries?list=${customYoutubeId}&enablejsapi=1&autoplay=1&loop=1&controls=1&mute=${isAudioMuted ? 1 : 0}`;
      }
      return `https://www.youtube.com/embed/${customYoutubeId}?enablejsapi=1&autoplay=1&loop=1&playlist=${customYoutubeId}&controls=1&mute=${isAudioMuted ? 1 : 0}`;
    }
    return `https://www.youtube.com/embed/${activeVideoId}?enablejsapi=1&autoplay=1&loop=1&playlist=${activeVideoId}&controls=1&mute=${isAudioMuted ? 1 : 0}`;
  })();

  // Synchronize dynamic YouTube category data
  useEffect(() => {
    if (ambientSound === 'none') {
      setActiveVideoId('');
      setActiveVideoTitle('');
      setActiveVideoChannel('');
      setActiveVideoThumbnail('');
      return;
    }

    if (ambientSound === 'custom-yt') {
      setActiveVideoId(customYoutubeId);
      setActiveVideoTitle('Custom Stream');
      setActiveVideoChannel('User Selected Link');
      setActiveVideoThumbnail(`https://img.youtube.com/vi/${customYoutubeId}/hqdefault.jpg`);
      setMusicError(null);
      return;
    }

    const category = AMBIENT_TRACKS.find(c => c.id === ambientSound);
    if (category && (category as any).searchQuery) {
      // Check if we already have this cached/resolved
      if (resolvedYoutubeTracks[ambientSound]) {
        const cached = resolvedYoutubeTracks[ambientSound];
        setActiveVideoId(cached.videoId);
        setActiveVideoTitle(cached.title);
        setActiveVideoChannel(cached.channelName);
        setActiveVideoThumbnail(cached.thumbnail);
        setMusicError(null);
        return;
      }

      setIsLoadingMusic(true);
      setMusicError(null);
      
      const controller = new AbortController();
      const signal = controller.signal;

      fetch(`/api/youtube-search?query=${encodeURIComponent((category as any).searchQuery)}`, { signal })
        .then(res => {
          if (!res.ok) throw new Error(`Server returned error ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (data && data.videoId) {
            setActiveVideoId(data.videoId);
            setActiveVideoTitle(data.title);
            setActiveVideoChannel(data.channelName);
            setActiveVideoThumbnail(data.thumbnail);
            
            // Cache the result
            setResolvedYoutubeTracks(prev => ({
              ...prev,
              [ambientSound]: {
                videoId: data.videoId,
                title: data.title,
                channelName: data.channelName,
                thumbnail: data.thumbnail
              }
            }));
          } else {
            throw new Error("Invalid response format");
          }
        })
        .catch(err => {
          if (err.name !== 'AbortError') {
            console.error("Failed to load dynamic soundtrack", err);
            setMusicError("Failed to search or fetch this YouTube category. Please try again or paste a custom link.");
          }
        })
        .finally(() => {
          setIsLoadingMusic(false);
        });

      return () => controller.abort();
    }
  }, [ambientSound, customYoutubeId]);

  // Handle Load Custom Stream Button Action
  const handleLoadCustomStream = () => {
    if (!customYoutubeInput.trim()) return;
    const parsed = parseYouTubeCustomSource(customYoutubeInput);
    if (parsed.id) {
      setCustomYoutubeId(parsed.id);
      setCustomYoutubeType(parsed.type);
      localStorage.setItem('kairos_custom_yt_id', parsed.id);
      localStorage.setItem('kairos_custom_yt_type', parsed.type);
      
      setAmbientSound('custom-yt');
      setMusicPlaying(true);
      setMusicError(null);
    } else {
      setMusicError("Invalid YouTube URL or ID entered.");
    }
  };

  // Synchronise synthesiser based on state
  useEffect(() => {
    if (!shouldPlayMusic || isYoutubeTrack) {
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
  }, [shouldPlayMusic, ambientSound, isYoutubeTrack]);

  // Synchronize YouTube volume and state
  useEffect(() => {
    if (isYoutubeTrack && shouldPlayMusic && ytPlayerRef.current) {
      const timer = setTimeout(() => {
        if (ytPlayerRef.current && ytPlayerRef.current.contentWindow) {
          const targetVolume = isAudioMuted ? 0 : ambientVolume;
          try {
            ytPlayerRef.current.contentWindow.postMessage(
              JSON.stringify({
                event: 'command',
                func: 'setVolume',
                args: [targetVolume],
              }),
              '*'
            );
          } catch (e) {
            console.warn("Failed to send volume command", e);
          }
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [ambientVolume, isAudioMuted, ambientSound, shouldPlayMusic, isYoutubeTrack]);

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
        synthManager.resume();
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
    synthManager.resume();
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
        
        {/* Currently Playing Track Status */}
        {shouldPlayMusic && ambientSound !== 'none' ? (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 rounded-full text-[10px] font-sans font-medium text-indigo-600 dark:text-indigo-400 animate-pulse">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></span>
            <span>Streaming: {AMBIENT_TRACKS.find(t => t.id === ambientSound)?.name}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-full text-[10px] font-sans font-medium text-zinc-400 dark:text-zinc-500">
            <span>Silence</span>
          </div>
        )}
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
      <div className="flex items-center justify-between gap-3 mt-6">
        {/* Left Side: Settings Button */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-3.5 border rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer ${
            showSettings
              ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 border-indigo-200 dark:border-indigo-900'
              : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
          }`}
          title="Customize Focus Space"
        >
          <Settings className={`w-5 h-5 ${showSettings ? 'rotate-45' : ''} transition-transform duration-200`} />
        </button>

        {/* Center: Play/Pause and Reset buttons (broken from the big pause button) */}
        <div className="flex items-center gap-2 flex-1 max-w-[240px]">
          {/* Play / Pause */}
          <button
            id="btn-play-pause-timer"
            onClick={toggleTimer}
            className={`flex-1 py-3.5 rounded-2xl font-sans font-semibold flex items-center justify-center gap-2 shadow-md transition-all duration-200 active:scale-95 text-white cursor-pointer text-xs sm:text-sm ${
              isRunning 
                ? 'bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90' 
                : `${accentColor} hover:opacity-90`
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current pl-0.5" />
                <span>Start</span>
              </>
            )}
          </button>

          {/* Reset Button */}
          <button
            onClick={resetTimer}
            className="p-3.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer"
            title="Reset Timer"
          >
            <RotateCcw className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Right Side: Music Ambient Deck Button Overlay */}
        <button
          onClick={() => setShowMusicDeck(!showMusicDeck)}
          className={`p-3.5 border rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer flex items-center justify-center relative ${
            showMusicDeck || shouldPlayMusic
              ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 border-indigo-200 dark:border-indigo-900'
              : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
          }`}
          title="Toggle Ambient Music Deck"
        >
          <Music className={`w-5 h-5 ${shouldPlayMusic ? 'animate-bounce text-indigo-500' : ''}`} />
          {shouldPlayMusic && !isAudioMuted && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
            </span>
          )}
        </button>
      </div>

      {/* Integrated Advanced Music Space Deck */}
      {showMusicDeck && (
        <div id="ambient-music-deck" className="mt-6 p-5 bg-gradient-to-tr from-indigo-50/50 to-purple-50/30 dark:from-indigo-950/20 dark:to-purple-950/10 border border-indigo-100/80 dark:border-indigo-900/40 rounded-3xl space-y-4 animate-in slide-in-from-top-2 duration-300 text-left">
          <div className="flex items-center justify-between border-b border-indigo-100/60 dark:border-indigo-900/40 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-500/10 text-indigo-500 rounded-lg">
                <Music className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 leading-none">Focus Ambient Deck</h4>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 leading-none">Integrated procedural sound generators</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAmbienceModal(true)}
                className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-[10px] font-bold shadow-md transition-all duration-200 active:scale-95 cursor-pointer border border-indigo-400/20"
              >
                <Sparkles className="w-3 h-3 animate-pulse text-indigo-200" />
                <span>Ambience Station</span>
              </button>
              <span className="hidden sm:inline-block text-[9px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100/40 dark:border-indigo-900/30 px-1.5 py-0.5 rounded uppercase">
                Synthesized live
              </span>
            </div>
          </div>

          {/* Quick Play Controls & Volume Bar */}
          <div className="bg-white/80 dark:bg-zinc-950/60 border border-zinc-150 dark:border-zinc-850 p-3.5 rounded-2xl flex flex-col sm:flex-row items-center gap-4 justify-between shadow-sm">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => {
                  synthManager.resume();
                  if (ambientSound === 'none') {
                    setAmbientSound('lofi2'); // select a default
                  }
                  setMusicPlaying(!musicPlaying);
                }}
                className={`p-3 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-[0.96] cursor-pointer shadow-sm ${
                  shouldPlayMusic
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
                title={shouldPlayMusic ? "Pause music" : "Play music"}
              >
                {shouldPlayMusic ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current pl-0.5" />}
              </button>
              <div className="text-left">
                <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 block font-semibold">
                  {shouldPlayMusic ? 'Now Streaming' : 'Deck Standby'}
                </span>
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">
                  {ambientSound === 'none' ? 'Silence Selected' : AMBIENT_TRACKS.find(t => t.id === ambientSound)?.name}
                </span>
              </div>
            </div>

            {/* Volume Control Slider */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto sm:min-w-[150px]">
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-500 dark:text-zinc-400 transition-colors cursor-pointer"
                title={isAudioMuted ? "Unmute sound" : "Mute sound"}
              >
                {isAudioMuted || ambientVolume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-500" />
                ) : (
                  <Volume2 className="w-4 h-4 text-indigo-500" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={isAudioMuted ? 0 : ambientVolume}
                onChange={(e) => {
                  setAmbientVolume(parseInt(e.target.value));
                  if (isAudioMuted) setIsAudioMuted(false);
                }}
                className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none focus:ring-0"
              />
              <span className="text-[10px] font-mono font-bold text-zinc-400 min-w-[24px] text-right">
                {isAudioMuted ? '0%' : `${ambientVolume}%`}
              </span>
            </div>
          </div>

          {/* YouTube Video Player Visualizer Widget */}
          {isYoutubeTrack && (
            <div className="relative overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-200/50 dark:border-zinc-850 shadow-md">
              <div className="text-[10px] font-mono text-zinc-550 dark:text-zinc-400 p-2.5 border-b border-zinc-150 dark:border-zinc-850 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
                <span className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full bg-red-500 ${shouldPlayMusic ? 'animate-ping' : ''}`} />
                  YouTube Safe Audio Stream
                </span>
                <span className="opacity-75 font-bold">
                  {shouldPlayMusic ? 'ACTIVE STREAM' : 'PAUSED'}
                </span>
              </div>
              <div className="relative aspect-video w-full max-h-[160px] flex items-center justify-center bg-zinc-900">
                {shouldPlayMusic ? (
                  <iframe
                    ref={ytPlayerRef}
                    className="w-full h-full absolute inset-0 rounded-b-2xl"
                    src={`https://www.youtube.com/embed/${activeVideoId}?enablejsapi=1&autoplay=1&loop=1&playlist=${activeVideoId}&controls=1&mute=${isAudioMuted ? 1 : 0}`}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    title="YouTube Focus Music Player"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 p-4 text-center">
                    <Music className="w-7 h-7 mb-2 text-indigo-500 animate-pulse" />
                    <span className="text-xs font-semibold text-zinc-350">{AMBIENT_TRACKS.find(t => t.id === ambientSound)?.name}</span>
                    <span className="text-[10px] text-zinc-550 mt-1">Press the Play button above to start the stream</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Custom YouTube Link Input */}
          {ambientSound === 'custom-yt' && (
            <div className="p-3 bg-white/60 dark:bg-zinc-950/40 border border-zinc-150 dark:border-zinc-850 rounded-2xl space-y-2 animate-in slide-in-from-top-1 duration-200">
              <label className="block text-[10px] font-mono text-zinc-500 uppercase font-semibold">
                Custom YouTube Video URL or ID
              </label>
              <input
                type="text"
                placeholder="e.g. https://www.youtube.com/watch?v=3S_W_ZkK6uU"
                value={customYoutubeInput}
                onChange={(e) => {
                  setCustomYoutubeInput(e.target.value);
                  const parsedId = getYouTubeId(e.target.value);
                  if (parsedId && parsedId.length === 11) {
                    setCustomYoutubeId(parsedId);
                    localStorage.setItem('kairos_custom_yt_id', parsedId);
                  }
                }}
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-850 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <p className="text-[9px] text-zinc-400 leading-normal">
                Paste any YouTube URL or 11-character video ID. We will load the audio and video visualizer safely for your focus session.
              </p>
            </div>
          )}

          {/* Track Selection List */}
          <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
            <button
              onClick={() => {
                setAmbientSound('none');
                setMusicPlaying(false);
              }}
              className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all duration-200 cursor-pointer ${
                ambientSound === 'none'
                  ? 'bg-white dark:bg-zinc-900 border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'bg-white/50 dark:bg-zinc-950/20 border-zinc-200/50 dark:border-zinc-850 text-zinc-650 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-950/40'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-sm">📴</span>
                <div>
                  <span className="text-xs font-semibold block">Silence / Mute Music</span>
                  <span className="text-[10px] text-zinc-450 block leading-tight">No background synth tracks</span>
                </div>
              </div>
              {ambientSound === 'none' && <span className="text-[10px] uppercase font-mono font-bold text-indigo-500">Active</span>}
            </button>

            {AMBIENT_TRACKS.map((track) => {
              const isSelected = ambientSound === track.id;
              const isCustomTrack = (track as any).isCustom;
              return (
                <button
                  key={track.id}
                  onClick={() => {
                    synthManager.resume();
                    setAmbientSound(track.id as any);
                    // Turn on music playing automatically when changing track
                    setMusicPlaying(true);
                  }}
                  className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-medium'
                      : isCustomTrack
                      ? 'bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border-purple-300 dark:border-purple-900 text-purple-700 dark:text-purple-300 hover:from-purple-500/25 hover:to-indigo-500/25 shadow-xs'
                      : 'bg-white/50 dark:bg-zinc-950/20 border-zinc-200/50 dark:border-zinc-850 text-zinc-650 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-950/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`text-sm p-1.5 rounded-lg ${isCustomTrack ? 'bg-purple-100 dark:bg-purple-950 text-purple-600' : 'bg-zinc-100 dark:bg-zinc-850/50'}`}>{track.icon}</span>
                    <div className="max-w-[75%] sm:max-w-none">
                      <span className="text-xs font-semibold block text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                        {track.name}
                        <span className={`text-[8px] px-1 py-0.2 rounded font-semibold ${isCustomTrack ? 'bg-purple-500 text-white animate-pulse' : 'bg-zinc-100 dark:bg-zinc-805 text-zinc-500 dark:text-zinc-400 font-normal'}`}>
                          {isCustomTrack ? '⭐ UNLIMITED OPTION' : track.category}
                        </span>
                      </span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block leading-tight truncate sm:whitespace-normal">
                        {track.desc}
                      </span>
                    </div>
                  </div>
                  {isSelected ? (
                    <span className="text-[10px] uppercase font-mono font-bold text-indigo-500 animate-pulse flex items-center gap-1 shrink-0">
                      Playing
                    </span>
                  ) : isCustomTrack ? (
                    <span className="text-[9px] uppercase font-mono font-bold text-purple-500 shrink-0">
                      Paste Link
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Autoplay Preferences */}
          <div className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-150 dark:border-zinc-850 rounded-xl">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
              Auto-play music when focus session starts
            </span>
            <button
              onClick={() => setAutoPlayWithTimer(!autoPlayWithTimer)}
              className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                autoPlayWithTimer ? 'bg-indigo-500' : 'bg-zinc-200 dark:bg-zinc-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  autoPlayWithTimer ? 'translate-x-3.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      )}

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

          {/* Export Data Section */}
          <div className="flex items-center justify-between p-3 bg-indigo-50/20 dark:bg-indigo-950/5 border border-indigo-200/20 dark:border-indigo-950/20 rounded-xl">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-100/55 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <Download className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">Export Productivity Data</span>
                <span className="text-[10px] text-zinc-500 block leading-tight">Download task backlog and companion stats as JSON</span>
              </div>
            </div>
            <button
              onClick={() => {
                // Read from localStorage to export
                const tasksSaved = localStorage.getItem('kairos_tasks') || '[]';
                const pomodorosSaved = localStorage.getItem('kairos_pomodoros') || '0';
                const stepsSaved = localStorage.getItem('kairos_survival_steps') || '{}';
                const langSaved = localStorage.getItem('kairos_lang') || 'en';
                const bareSaved = localStorage.getItem('kairos_bare_minimum_mode') || 'false';
                
                let tasksArr = [];
                try { tasksArr = JSON.parse(tasksSaved); } catch {}
                let stepsObj = {};
                try { stepsObj = JSON.parse(stepsSaved); } catch {}
                
                const stats = {
                  completedPomodoros: parseInt(pomodorosSaved),
                  totalTasks: tasksArr.length,
                  completedTasks: tasksArr.filter((t: any) => t.completed).length,
                  activeTasks: tasksArr.filter((t: any) => !t.completed).length,
                  urgencyDistribution: {
                    critical: tasksArr.filter((t: any) => t.urgency === 'critical').length,
                    high: tasksArr.filter((t: any) => t.urgency === 'high').length,
                    medium: tasksArr.filter((t: any) => t.urgency === 'medium').length,
                    low: tasksArr.filter((t: any) => t.urgency === 'low').length,
                  }
                };

                const exportPayload = {
                  app: "Kairox Focus & Productivity Companion",
                  exportDate: new Date().toISOString(),
                  productivityStats: stats,
                  tasks: tasksArr,
                  survivalSteps: stepsObj,
                  languagePreference: langSaved,
                  bareMinimumModePreference: bareSaved === 'true'
                };

                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
                  JSON.stringify(exportPayload, null, 2)
                );
                const downloadAnchor = document.createElement('a');
                downloadAnchor.setAttribute("href", dataStr);
                downloadAnchor.setAttribute("download", `kairox_export_${new Date().toISOString().substring(0, 10)}.json`);
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
              }}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-sans font-bold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
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

      {shouldPlayMusic && (
        <div className="mt-6 text-center animate-pulse">
          <p className="text-[11px] text-indigo-500 dark:text-indigo-400 font-sans font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:underline text-xs" onClick={() => setShowAmbienceModal(true)}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Active ambience: {AMBIENT_TRACKS.find(t => t.id === ambientSound)?.name || 'Streaming'} (Click to adjust)
          </p>
        </div>
      )}

      {/* 🌌 Focus Ambience Station Modal */}
      {showAmbienceModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 my-8">
            {/* Header */}
            <div className="p-6 border-b border-zinc-800 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-zinc-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                  <Radio className="w-5 h-5 animate-pulse text-indigo-400" />
                </span>
                <div className="text-left">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    🌌 Focus Ambience Station
                  </h3>
                  <p className="text-xs text-zinc-400">Curated high-quality audio streams to reinforce your deep-work habit</p>
                </div>
              </div>
              <button
                onClick={() => setShowAmbienceModal(false)}
                className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto text-left">
              {/* 🛠️ Explicit Source Control Deck */}
              <div className="bg-gradient-to-tr from-indigo-950/80 to-purple-950/50 border border-indigo-500/30 p-5 rounded-2xl space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Select Source Dropdown */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-mono uppercase text-indigo-300 font-bold tracking-wider">
                      Select Audio Source
                    </label>
                    <div className="relative">
                      <select
                        value={ambientSound}
                        onChange={(e) => {
                          synthManager.resume();
                          setAmbientSound(e.target.value);
                          setMusicPlaying(true);
                        }}
                        className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold appearance-none cursor-pointer"
                      >
                        <option value="none">🔇 None / Silence</option>
                        
                        <optgroup label="🌐 Live YouTube Streams (Dynamic Search)">
                          {AMBIENT_TRACKS.filter(t => t.category === 'YouTube' && !t.isCustom).map(t => (
                            <option key={t.id} value={t.id}>
                              {t.icon} {t.name}
                            </option>
                          ))}
                        </optgroup>
                        
                        <optgroup label="🎵 Local Audio Synthesizers">
                          {AMBIENT_TRACKS.filter(t => t.category === 'Synthetic').map(t => (
                            <option key={t.id} value={t.id}>
                              {t.icon} {t.name}
                            </option>
                          ))}
                        </optgroup>
                        
                        <optgroup label="⚙️ Custom Source">
                          <option value="custom-yt">🔗 Custom YouTube Video or Playlist</option>
                        </optgroup>
                      </select>
                      <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-3.5 pointer-events-none" />
                    </div>
                  </div>

                  {/* Play / Pause Toggle & Volume Slider */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-mono uppercase text-indigo-300 font-bold tracking-wider">
                      Audio Controls
                    </label>
                    <div className="flex items-center gap-3 bg-zinc-950 p-2 rounded-xl border border-zinc-800 h-[42px]">
                      {/* Play/Pause Button */}
                      <button
                        onClick={() => {
                          synthManager.resume();
                          if (ambientSound === 'none') {
                            setAmbientSound('yt-lofigirl');
                          }
                          setMusicPlaying(!musicPlaying);
                        }}
                        className={`p-1.5 rounded-lg flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer ${
                          shouldPlayMusic
                            ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                        }`}
                        title={shouldPlayMusic ? "Pause Ambience" : "Play Ambience"}
                      >
                        {shouldPlayMusic ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current pl-0.5" />}
                      </button>

                      {/* Divider */}
                      <div className="w-px h-5 bg-zinc-850" />

                      {/* Volume controls */}
                      <button
                        onClick={toggleMute}
                        className="p-1 rounded hover:bg-zinc-850 text-zinc-400 transition-colors"
                        title={isAudioMuted ? "Unmute" : "Mute"}
                      >
                        {isAudioMuted || ambientVolume === 0 ? (
                          <VolumeX className="w-4 h-4 text-rose-400" />
                        ) : (
                          <Volume2 className="w-4 h-4 text-indigo-400" />
                        )}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={isAudioMuted ? 0 : ambientVolume}
                        onChange={(e) => {
                          setAmbientVolume(parseInt(e.target.value));
                          if (isAudioMuted) setIsAudioMuted(false);
                        }}
                        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none focus:ring-0"
                      />
                      <span className="text-[10px] font-mono font-bold text-zinc-400 min-w-[32px] text-right pr-1">
                        {isAudioMuted ? '0%' : `${ambientVolume}%`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Focus Session Integration Toggle */}
                <div className="flex items-center justify-between p-3 bg-zinc-900/40 border border-zinc-800/60 rounded-xl">
                  <div className="text-left max-w-[80%]">
                    <span className="text-xs font-bold text-zinc-200 block">Focus Session Integration</span>
                    <span className="text-[10px] text-zinc-400 leading-tight block mt-0.5">
                      ⚡ Automatically resume/pause music when a Pomodoro focus timer starts or pauses to lock in your flow.
                    </span>
                  </div>
                  <button
                    onClick={() => setAutoPlayWithTimer(!autoPlayWithTimer)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      autoPlayWithTimer ? 'bg-indigo-500' : 'bg-zinc-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        autoPlayWithTimer ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Dynamic YouTube Fetch Status Card */}
              {isLoadingMusic && (
                <div className="flex flex-col items-center justify-center bg-zinc-950 border border-zinc-800 rounded-2xl p-8 text-center animate-pulse">
                  <Radio className="w-8 h-8 text-indigo-400 animate-bounce mb-2" />
                  <p className="text-xs font-bold text-white">Searching YouTube Stream...</p>
                  <p className="text-[10px] text-zinc-400 mt-1">Retrieving the most relevant, high-quality audio source</p>
                </div>
              )}

              {musicError && !isLoadingMusic && (
                <div className="bg-rose-950/20 border border-rose-500/20 rounded-2xl p-5 text-center space-y-2">
                  <p className="text-xs font-semibold text-rose-400">⚠️ {musicError}</p>
                  <button
                    onClick={() => {
                      // Trigger a retry by cycling state
                      const current = ambientSound;
                      setAmbientSound('none');
                      setTimeout(() => setAmbientSound(current), 50);
                    }}
                    className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                  >
                    Retry Search
                  </button>
                </div>
              )}

              {/* Embedded Player & Active Video Meta Metadata Display */}
              {isYoutubeTrack && !isLoadingMusic && !musicError && activeVideoId && (
                <div className="space-y-4">
                  {/* YouTube Video Details */}
                  <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                    <img
                      src={activeVideoThumbnail || `https://img.youtube.com/vi/${activeVideoId}/hqdefault.jpg`}
                      alt={activeVideoTitle}
                      referrerPolicy="no-referrer"
                      className="w-24 h-18 sm:w-32 sm:h-24 rounded-xl object-cover border border-zinc-800 shadow-md shrink-0"
                    />
                    <div className="flex-1 text-center sm:text-left space-y-1.5 min-w-0">
                      <div className="flex items-center justify-center sm:justify-start gap-1.5">
                        <span className="text-[9px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded-md font-mono font-bold uppercase tracking-wider">
                          YouTube Result
                        </span>
                        <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded-md font-mono font-bold uppercase tracking-wider">
                          Active Stream
                        </span>
                      </div>
                      <h5 className="text-xs font-bold text-white truncate max-w-full">
                        {activeVideoTitle || 'Searching Stream...'}
                      </h5>
                      <p className="text-[11px] text-zinc-400 truncate">
                        Channel: <strong className="text-zinc-300">{activeVideoChannel || 'YouTube Live'}</strong>
                      </p>
                      <p className="text-[10px] text-emerald-400 font-medium">
                        ✓ Stream parsed and loaded successfully
                      </p>
                    </div>
                  </div>

                  {/* Visualizer Frame */}
                  <div className="relative overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800 shadow-md">
                    <div className="text-[10px] font-mono text-zinc-400 p-2.5 border-b border-zinc-850 flex items-center justify-between bg-zinc-900/50">
                      <span className="flex items-center gap-1.5">
                        <Youtube className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                        Live YouTube Embedded Player
                      </span>
                      <span className="text-[10px] font-mono text-indigo-400 font-bold">
                        {shouldPlayMusic ? 'BUFFERING / STREAMING' : 'PAUSED'}
                      </span>
                    </div>
                    <div className="relative aspect-video w-full max-h-[180px] flex items-center justify-center bg-zinc-900">
                      {shouldPlayMusic ? (
                        <iframe
                          ref={ytPlayerRef}
                          className="w-full h-full absolute inset-0"
                          src={activeEmbedUrl}
                          allow="autoplay; encrypted-media; picture-in-picture"
                          title="YouTube Focus Player"
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 p-4 text-center">
                          <Music className="w-8 h-8 mb-2 text-indigo-400 animate-pulse" />
                          <span className="text-xs font-semibold text-zinc-200">
                            {ambientSound === 'custom-yt' ? 'Custom YouTube Stream' : (AMBIENT_TRACKS.find(t => t.id === ambientSound)?.name || 'Silence')}
                          </span>
                          <span className="text-[10px] text-zinc-500 mt-1">Press Play above to resume background audio</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 🔗 Load Custom YouTube Stream or Playlist */}
              <div className="bg-gradient-to-r from-purple-950/40 to-indigo-950/40 border border-purple-500/20 p-5 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⭐</span>
                    <h4 className="text-xs uppercase font-mono tracking-wider text-purple-300 font-bold">Custom YouTube Stream Options</h4>
                  </div>
                  <span className="text-[9px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-bold">VIDEO OR PLAYLIST</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Enter any YouTube Video ID, Playlist ID, or the full watch/playlist URL below to load your custom focus track instantly:
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Enter URL or ID (e.g., PL... or DWcJYXZfrOI)"
                    value={customYoutubeInput}
                    onChange={(e) => setCustomYoutubeInput(e.target.value)}
                    className="flex-1 px-4 py-2.5 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-purple-500 font-mono focus:ring-1 focus:ring-purple-500/30"
                  />
                  <button 
                    onClick={handleLoadCustomStream}
                    className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold rounded-xl transition-all duration-150 text-xs cursor-pointer shadow-md flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Load Custom Stream
                  </button>
                </div>
                {customYoutubeId && (
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                    <span>Active Custom Source: <strong className="text-purple-300">{customYoutubeId}</strong> ({customYoutubeType === 'playlist' ? 'Playlist' : 'Single Video'})</span>
                  </div>
                )}
              </div>

              {/* Music Playlists Grid */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono uppercase text-zinc-400 tracking-wider">Soundtrack Directory</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {AMBIENT_TRACKS.map((track) => {
                    const isSelected = ambientSound === track.id;
                    const isCustomTrack = (track as any).isCustom;
                    return (
                      <button
                        key={track.id}
                        onClick={() => {
                          synthManager.resume();
                          setAmbientSound(track.id);
                          setMusicPlaying(true);
                        }}
                        className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-md'
                            : isCustomTrack
                            ? 'bg-purple-950/20 border-purple-900/50 text-purple-300 hover:bg-purple-950/30'
                            : 'bg-zinc-950/40 border-zinc-800/80 text-zinc-300 hover:bg-zinc-850/60'
                        }`}
                      >
                        <span className={`text-base p-2 rounded-xl shrink-0 ${isCustomTrack ? 'bg-purple-900/40 text-purple-300' : isSelected ? 'bg-indigo-500/20 text-indigo-300' : 'bg-zinc-800 text-zinc-400'}`}>
                          {track.icon}
                        </span>
                        <div className="space-y-1 overflow-hidden min-w-0">
                          <span className="text-xs font-bold block truncate flex items-center gap-1 text-white">
                            {track.name}
                            {isSelected && <Check className="w-3 h-3 text-indigo-400 shrink-0" />}
                          </span>
                          <span className="text-[10px] text-zinc-400 block leading-tight line-clamp-2">
                            {track.desc}
                          </span>
                          <span className="inline-block text-[8px] font-mono px-1 rounded bg-zinc-800 text-zinc-500 font-semibold">
                            {track.category}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
              <span>Auto-pauses when study session is paused.</span>
              <button
                onClick={() => setShowAmbienceModal(false)}
                className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-all duration-150 cursor-pointer text-xs"
              >
                Close Station
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
