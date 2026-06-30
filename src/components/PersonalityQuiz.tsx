import React, { useState } from 'react';
import { DIAGNOSTIC_QUIZ, AI_PERSONALITIES } from '../data/personalities';
import { AIPersonality } from '../types';
import { Compass, Sparkles, Check, ArrowRight, RotateCcw, ListFilter, HelpCircle } from 'lucide-react';

interface PersonalityQuizProps {
  onSelectPersonality: (personality: AIPersonality) => void;
  onClose?: () => void;
}

export default function PersonalityQuiz({ onSelectPersonality, onClose }: PersonalityQuizProps) {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<AIPersonality | null>(null);
  const [isManualMode, setIsManualMode] = useState<boolean>(false);

  const handleAnswer = (personalityId: string) => {
    const nextAnswers = [...answers, personalityId];
    setAnswers(nextAnswers);

    if (currentStep < DIAGNOSTIC_QUIZ.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Calculate matching personality (majority vote)
      const counts: Record<string, number> = {};
      let maxCount = 0;
      let matchedId = AI_PERSONALITIES[0].id;

      nextAnswers.forEach(id => {
        counts[id] = (counts[id] || 0) + 1;
        if (counts[id] > maxCount) {
          maxCount = counts[id];
          matchedId = id;
        }
      });

      const finalMatch = AI_PERSONALITIES.find(p => p.id === matchedId) || AI_PERSONALITIES[0];
      setResult(finalMatch);
    }
  };

  const restartQuiz = () => {
    setCurrentStep(0);
    setAnswers([]);
    setResult(null);
    setIsManualMode(false);
  };

  const currentQuestion = DIAGNOSTIC_QUIZ[currentStep];
  const progressPercent = Math.round(((currentStep) / DIAGNOSTIC_QUIZ.length) * 100);

  return (
    <div id="personality-quiz-card" className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xl overflow-hidden transition-all duration-300">
      <div className="p-6 sm:p-8">
        {isManualMode ? (
          <div>
            {/* Manual Selection Mode */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-500">
                  <ListFilter className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-sans font-semibold text-lg text-zinc-900 dark:text-zinc-50">
                    Select Your Companion Manually
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Browse the distinct focus companions and choose your match
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsManualMode(false)}
                className="text-xs font-mono font-medium text-indigo-500 hover:text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100/50 px-3 py-1.5 rounded-full transition-all flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Take Quiz instead
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {AI_PERSONALITIES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelectPersonality(p)}
                  className="text-left p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/10 dark:hover:border-indigo-800/80 transition-all duration-200 group relative overflow-hidden flex flex-col justify-between h-48 active:scale-[0.99] cursor-pointer"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl filter drop-shadow group-hover:scale-110 transition-transform">{p.emoji}</span>
                      <div>
                        <h4 className="font-sans font-bold text-sm text-zinc-800 dark:text-zinc-200">
                          {p.name}
                        </h4>
                        <span className="text-[10px] text-indigo-500 font-serif italic block">
                          "{p.tagline}"
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-3 leading-relaxed mt-1">
                      {p.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-sans font-semibold text-indigo-500 mt-2">
                    <span>Initialize Companion</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div className={`absolute bottom-0 right-0 left-0 h-0.5 bg-gradient-to-r ${p.bgGradientClass}`} />
                </button>
              ))}
            </div>

            {onClose && (
              <button 
                onClick={onClose}
                className="mt-6 text-xs text-zinc-400 hover:text-zinc-650 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors mx-auto block underline underline-offset-4 cursor-pointer"
              >
                Cancel and Go Back
              </button>
            )}
          </div>
        ) : !result ? (
          <div>
            {/* Diagnostic Quiz Mode */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-500">
                  <Compass className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-sans font-semibold text-lg text-zinc-900 dark:text-zinc-50">
                    AI Personality Diagnostic
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Find the companion tailored to your unique work style
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-medium text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full">
                Question {currentStep + 1} of {DIAGNOSTIC_QUIZ.length}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full mb-8 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-300" 
                style={{ width: `${progressPercent || 5}%` }}
              />
            </div>

            {/* Question Text */}
            <div className="mb-8">
              <h4 className="font-sans font-medium text-base sm:text-lg text-zinc-800 dark:text-zinc-100 leading-relaxed">
                {currentQuestion.text}
              </h4>
            </div>

            {/* Options */}
            <div className="space-y-3.5">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  id={`quiz-option-${index}`}
                  onClick={() => handleAnswer(option.personalityId)}
                  className="w-full text-left p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 dark:hover:border-indigo-800/80 transition-all duration-200 group flex items-start gap-4 active:scale-[0.99] cursor-pointer"
                >
                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-mono font-bold text-zinc-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-200">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="text-sm sm:text-base font-sans text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors duration-200">
                    {option.text}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-4 items-center justify-center">
              <button 
                onClick={() => setIsManualMode(true)}
                className="text-xs text-indigo-500 hover:text-indigo-650 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors underline underline-offset-4 cursor-pointer font-medium"
              >
                Skip quiz and choose manually
              </button>
              {onClose && (
                <span className="hidden sm:inline text-zinc-300 dark:text-zinc-700">|</span>
              )}
              {onClose && (
                <button 
                  onClick={onClose}
                  className="text-xs text-zinc-400 hover:text-zinc-650 dark:text-zinc-500 dark:hover:text-zinc-350 transition-colors underline underline-offset-4 cursor-pointer"
                >
                  Cancel and close
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 mb-6 relative">
              <div className="absolute inset-0 rounded-full border border-indigo-200 dark:border-indigo-800/60 animate-ping opacity-20" />
              <Sparkles className="w-10 h-10 animate-bounce" />
            </div>

            <h3 className="font-sans font-bold text-2xl text-zinc-900 dark:text-zinc-50 mb-1">
              Your Match Found!
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
              Based on your workflow insights, your optimal companion is:
            </p>

            {/* Match Reveal Card */}
            <div className="max-w-md mx-auto p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 mb-8 text-left shadow-sm">
              <div className="flex items-center gap-4 mb-3">
                <span className="text-4xl">{result.emoji}</span>
                <div>
                  <h4 className="font-sans font-bold text-lg text-zinc-900 dark:text-zinc-100">
                    {result.name}
                  </h4>
                  <p className="text-xs font-serif italic text-indigo-500 font-medium">
                    "{result.tagline}"
                  </p>
                </div>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                {result.description}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
              <button
                id="btn-confirm-personality"
                onClick={() => onSelectPersonality(result)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-sans font-medium rounded-2xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all duration-200 cursor-pointer"
              >
                <Check className="w-5 h-5" />
                Initialize Companion
              </button>
              <button
                onClick={restartQuiz}
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl font-sans font-medium text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Retake Quiz
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
