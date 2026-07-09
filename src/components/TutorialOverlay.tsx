import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BrainCircuit, 
  Calendar, 
  Music, 
  ShieldAlert, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Clock, 
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { synthManager } from '../utils/audioSynth';

interface TutorialOverlayProps {
  onComplete: () => void;
}

export default function TutorialOverlay({ onComplete }: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [previewTrack, setPreviewTrack] = useState<string | null>(null);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
      // Turn off any active synth preview when switching steps
      if (previewTrack) {
        synthManager.stop();
        setPreviewTrack(null);
      }
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      if (previewTrack) {
        synthManager.stop();
        setPreviewTrack(null);
      }
    }
  };

  const handleComplete = () => {
    localStorage.setItem('kairox_tutorial_completed', 'true');
    if (previewTrack) {
      synthManager.stop();
    }
    onComplete();
  };

  const togglePreview = (trackId: string) => {
    synthManager.resume();
    if (previewTrack === trackId) {
      synthManager.stop();
      setPreviewTrack(null);
    } else {
      synthManager.stop();
      if (trackId === 'lofi2') {
        synthManager.playLofi2();
      } else if (trackId === 'drone') {
        synthManager.playZenDrone();
      }
      setPreviewTrack(trackId);
    }
  };

  const TUTORIAL_STEPS = [
    {
      id: 'companion',
      title: 'Your AI Strategic Co-Pilot',
      subtitle: 'Personalized accountability & triage guidance',
      icon: <BrainCircuit className="w-6 h-6 text-indigo-500" />,
      themeColor: 'indigo',
      description: 'Meet Kairox companions designed to target your specific productivity obstacles. Break projects into daily mini-tasks, receive tactical schedules, or get firm direct coaching to blast through friction.',
      visual: (
        <div className="w-full h-44 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-150 dark:border-zinc-850 p-4 flex flex-col justify-between overflow-hidden relative font-sans">
          <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-[9px] font-mono text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
            ACTIVE CO-PILOT
          </div>
          <div className="space-y-2.5">
            <div className="flex gap-2 items-start max-w-[85%]">
              <span className="text-[10px] bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono py-0.5 px-1.5 rounded shrink-0">User</span>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/60 p-2 rounded-xl rounded-tl-none shadow-sm leading-snug">
                This project deadline is tomorrow and I am totally stuck. Help!
              </p>
            </div>
            <div className="flex gap-2 items-start max-w-[85%] ml-auto flex-row-reverse">
              <span className="text-[10px] bg-indigo-500/10 text-indigo-500 font-mono py-0.5 px-1.5 rounded shrink-0">Coach</span>
              <p className="text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 p-2 rounded-xl rounded-tr-none shadow-sm leading-snug">
                Stop looking at the mountain. Let's do 1 thing: isolate 1 table, design its schema in 10 mins. I am timing you. Go!
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'calendar',
      title: 'Google Calendar Risk Matrix',
      subtitle: 'Prevent overlap catastrophes in real-time',
      icon: <Calendar className="w-6 h-6 text-rose-500" />,
      themeColor: 'rose',
      description: 'Kairox automatically maps external appointments to calculate a continuous schedule "Risk Factor". If high-priority obligations overlap, high-stakes warning protocols are immediately deployed.',
      visual: (
        <div className="w-full h-44 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-150 dark:border-zinc-850 p-4 flex flex-col justify-between font-sans">
          <div className="flex justify-between items-center border-b border-zinc-200/50 dark:border-zinc-800/40 pb-2">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Schedule Collision Analyzer</span>
            <span className="text-[10px] font-mono text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> HIGH RISK
            </span>
          </div>
          <div className="space-y-2 py-2">
            <div className="flex justify-between items-center text-[11px] p-2 bg-rose-500/5 dark:bg-rose-950/20 border border-rose-200/30 dark:border-rose-900/20 rounded-xl">
              <div>
                <span className="font-semibold text-zinc-700 dark:text-zinc-300 block">DB Deployment Block</span>
                <span className="text-zinc-500 text-[10px]">10:00 AM - 11:30 AM (Focus Task)</span>
              </div>
              <span className="text-[10px] font-mono text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/10">Clash</span>
            </div>
            <div className="flex justify-between items-center text-[11px] p-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/40 dark:border-zinc-800/40 rounded-xl opacity-75">
              <div>
                <span className="font-semibold text-zinc-600 dark:text-zinc-400 block">GCal: Critical Client Sync</span>
                <span className="text-zinc-500 text-[10px]">10:30 AM - 11:00 AM (External)</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'music',
      title: 'Cognitive Synthesized Audio',
      subtitle: '100% offline procedural focus generators',
      icon: <Music className="w-6 h-6 text-sky-500" />,
      themeColor: 'sky',
      description: 'Stream beautiful procedural soundscapes like real-time synthesized Lofi, cosmic rain, and zen drones. Perfect for shutting out background ambient noise and triggering steady flow states.',
      visual: (
        <div className="w-full h-44 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-150 dark:border-zinc-850 p-4 flex flex-col justify-between font-sans">
          <div className="text-center">
            <span className="text-[10px] font-mono uppercase text-sky-500 tracking-wider font-bold">Interactive Audio Deck Preview</span>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">Tap below to preview a live, offline generated frequency directly in your browser!</p>
          </div>
          <div className="flex gap-3 justify-center py-2">
            <button
              onClick={() => togglePreview('lofi2')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border ${
                previewTrack === 'lofi2'
                  ? 'bg-sky-600 text-white border-sky-500 animate-pulse'
                  : 'bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              {previewTrack === 'lofi2' ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>Procedural Lo-Fi</span>
            </button>
            <button
              onClick={() => togglePreview('drone')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border ${
                previewTrack === 'drone'
                  ? 'bg-sky-600 text-white border-sky-500 animate-pulse'
                  : 'bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              {previewTrack === 'drone' ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>Cosmic Zen Drone</span>
            </button>
          </div>
          <div className="text-[9px] font-mono text-zinc-450 dark:text-zinc-500 text-center uppercase tracking-wider">
            {previewTrack ? '● SYNTH ACTIVE - Tap again to silence' : '○ TAP TO STREAM TEST WAVE'}
          </div>
        </div>
      )
    },
    {
      id: 'nuclear',
      title: 'The Nuclear Protocol',
      subtitle: 'Discipline wins when motivation fades',
      icon: <ShieldAlert className="w-6 h-6 text-amber-500" />,
      themeColor: 'amber',
      description: 'Unleash ultimate focus lockdowns. Enabling Nuclear Mode disables all non-essential UI features and custom settings while your work blocks are ticking down. Force yourself into deep focus.',
      visual: (
        <div className="w-full h-44 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-150 dark:border-zinc-850 p-4 flex flex-col justify-between font-sans overflow-hidden relative">
          <div className="absolute inset-0 bg-radial-gradient from-amber-500/5 via-transparent to-transparent pointer-events-none" />
          <div className="flex gap-2 items-center">
            <span className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg">
              <ShieldAlert className="w-4 h-4 animate-bounce" />
            </span>
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Anti-Procrastination Shields Active</span>
          </div>
          <div className="border border-amber-500/20 bg-amber-500/5 p-2.5 rounded-xl text-[11px] text-zinc-600 dark:text-zinc-400 text-center leading-relaxed font-sans">
            "UI Locked under Nuclear Protocol. Main stats and secondary customization cards will unlock when focus block successfully concludes."
          </div>
          <div className="flex justify-center">
            <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/15">
              Protocol: 25:00 Remaining
            </span>
          </div>
        </div>
      )
    }
  ];

  const activeColor = TUTORIAL_STEPS[currentStep].themeColor;

  return (
    <div className="relative w-full max-w-2xl mx-auto py-4 bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800/80 rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-300">
      
      {/* Step Header */}
      <div className="px-6 pt-6 pb-2 border-b border-zinc-100 dark:border-zinc-850 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 rounded-xl shrink-0">
            <Sparkles className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-xs font-mono font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">SYSTEM ONBOARDING</h3>
            <p className="text-[10px] text-zinc-400 font-mono">Step {currentStep + 1} of {TUTORIAL_STEPS.length}</p>
          </div>
        </div>

        {/* Skip button */}
        <button 
          onClick={handleComplete}
          className="text-xs font-sans text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 transition-colors cursor-pointer"
        >
          Skip Tutorial
        </button>
      </div>

      {/* Slide Content with AnimatePresence */}
      <div className="p-6 h-[410px] flex flex-col justify-between">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {/* Header description */}
            <div className="space-y-1.5 text-left">
              <div className="flex gap-2 items-center">
                <span className={`p-1.5 bg-${activeColor}-500/10 text-${activeColor}-500 rounded-lg shrink-0`}>
                  {TUTORIAL_STEPS[currentStep].icon}
                </span>
                <h4 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">
                  {TUTORIAL_STEPS[currentStep].title}
                </h4>
              </div>
              <h5 className="text-xs text-zinc-400 font-mono tracking-wide uppercase">
                {TUTORIAL_STEPS[currentStep].subtitle}
              </h5>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed pt-1">
                {TUTORIAL_STEPS[currentStep].description}
              </p>
            </div>

            {/* Simulated Live / Interactive Visual Feature */}
            <div className="pt-1">
              {TUTORIAL_STEPS[currentStep].visual}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation & Progress indicators */}
        <div className="flex items-center justify-between pt-6 border-t border-zinc-100 dark:border-zinc-850 mt-4">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-1 border transition-all ${
              currentStep === 0
                ? 'opacity-30 pointer-events-none border-zinc-100 dark:border-zinc-800 text-zinc-400'
                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {/* Progress dots */}
          <div className="flex gap-1.5">
            {TUTORIAL_STEPS.map((step, idx) => (
              <span
                key={step.id}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStep
                    ? 'w-6 bg-indigo-600 dark:bg-indigo-500'
                    : 'w-1.5 bg-zinc-200 dark:bg-zinc-800'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-500/10 active:scale-[0.97] transition-all flex items-center gap-1 cursor-pointer"
          >
            <span>{currentStep === TUTORIAL_STEPS.length - 1 ? 'Configure Companion' : 'Next'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
