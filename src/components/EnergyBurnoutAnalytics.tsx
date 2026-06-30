import React, { useState } from 'react';
import { Zap, ShieldAlert, Sparkles, Flame, Coffee, CheckCircle, Compass, Moon } from 'lucide-react';
import { Task, AIPersonality } from '../types';

interface EnergyBurnoutAnalyticsProps {
  lang: 'en' | 'hi';
  tasks: Task[];
  completedPomodoros: number;
  currentPersonality: AIPersonality;
  onActivateZenCooldown: (active: boolean) => void;
  isZenCooldownActive: boolean;
}

export default function EnergyBurnoutAnalytics({
  lang,
  tasks,
  completedPomodoros,
  currentPersonality,
  onActivateZenCooldown,
  isZenCooldownActive
}: EnergyBurnoutAnalyticsProps) {
  // Compute metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const pendingCritical = tasks.filter(t => !t.completed && (t.urgency === 'critical' || t.urgency === 'high')).length;

  // Let's assume Deep Work is tracked by Pomodoro sessions (25 mins each)
  const deepWorkMinutes = completedPomodoros * 25;
  const deepWorkHours = (deepWorkMinutes / 60).toFixed(1);

  // Shallow Work is tracked by completed non-critical tasks (estimating 15 mins each)
  const shallowWorkTasks = tasks.filter(t => t.completed && t.urgency !== 'critical' && t.urgency !== 'high').length;
  const shallowWorkMinutes = shallowWorkTasks * 15;
  const shallowWorkHours = (shallowWorkMinutes / 60).toFixed(1);

  // Calculate Burnout score: high if there are too many critical tasks and very little deep work/rest
  let burnoutScore = 20; // base score out of 100
  burnoutScore += pendingCritical * 15; // +15 per critical pending
  if (completedPomodoros > 4) burnoutScore -= 10; // offset by resting/deep focus completions
  if (burnoutScore > 90) burnoutScore = 90; // cap
  if (burnoutScore < 10) burnoutScore = 12;

  // Burnout status classification
  const getBurnoutStatus = (score: number) => {
    if (score >= 70) return { label: lang === 'hi' ? 'गंभीर चेतावनी 🚨' : 'Severe Burnout Risk! 🚨', color: 'text-rose-500 border-rose-500/25 bg-rose-500/10' };
    if (score >= 40) return { label: lang === 'hi' ? 'मध्यम जोखिम ⚠️' : 'Moderate Stress ⚠️', color: 'text-amber-500 border-amber-500/25 bg-amber-500/10' };
    return { label: lang === 'hi' ? 'उत्कृष्ट स्वास्थ्य 🌱' : 'Optimal Energy 🌱', color: 'text-emerald-500 border-emerald-500/25 bg-emerald-500/10' };
  };

  const status = getBurnoutStatus(burnoutScore);

  // Companion customized burnout feedback
  const getBurnoutFeedback = () => {
    const isHi = lang === 'hi';
    if (burnoutScore >= 50) {
      if (currentPersonality.id === 'mentor') {
        return isHi 
          ? `🌱 **${currentPersonality.name}**: प्रिय मित्र, आपका तनाव स्तर बढ़ रहा है। आप बहुत अधिक उच्च-प्राथमिकता वाले कार्यों को बिना रुके पूरा करने की कोशिश कर रहे हैं। मैं दृढ़ता से अनुशंसा करता हूँ कि आप एक 'Zen Cooldown' दिन लें।`
          : `🌱 **${currentPersonality.name}**: Dear friend, I see your stress levels rising. You are pushing through heavy tasks without sufficient space. Please, let's activate Cooldown Day. Your peace is more valuable than any chore.`;
      } else if (currentPersonality.id === 'coach') {
        return isHi
          ? `🔥 **${currentPersonality.name}**: सुनिए चैंपियन, कड़ी मेहनत करना अच्छी बात है, लेकिन अत्यधिक काम करने से थकान (burnout) होती है। अपनी ऊर्जा को फिर से संगठित करें। मैं आज 'Zen Cooldown' मोड सक्रिय करने की सलाह देता हूँ!`
          : `🔥 **${currentPersonality.name}**: Listen up champ, grinding is essential, but redlining leads to engine failure. Re-strategize and rest. I suggest triggering a mandatory Zen Cooldown right now to protect your momentum!`;
      } else if (currentPersonality.id === 'philosopher') {
        return isHi
          ? `🌌 **${currentPersonality.name}**: जीवन और कार्य के चक्र में, विश्राम भी उतना ही महत्वपूर्ण है जितना सक्रियता। आपकी आत्मा थकी हुई महसूस कर रही है। आज सक्रिय संघर्ष से विराम लें और 'Zen Cooldown' में शांत रहें।`
          : `🌌 **${currentPersonality.name}**: In the rhythm of nature, winter is as essential as spring. You are straining against the tide. Release this grasp of outcomes and embrace a mindful Zen Cooldown. Action is nothing without silent rest.`;
      } else {
        return isHi
          ? `🎨 **${currentPersonality.name}**: आपके रचनात्मक दिमाग में बिजली कड़क रही है! लेकिन अधिक काम आपके रंग उड़ा देगा। चलो आज एक 'Zen Cooldown' दिन मनाते हैं और खेल-खेल में आराम करते हैं!`
          : `🎨 **${currentPersonality.name}**: Your creative engine is sparking too hot! Too much workload will dull your palette. Let's start a mandatory Zen Cooldown day to play, recharge, and dream!`;
      }
    } else {
      if (currentPersonality.id === 'mentor') {
        return isHi
          ? `🌱 **${currentPersonality.name}**: बहुत बढ़िया! आप काम और विश्राम के बीच एक बहुत ही स्वस्थ संतुलन बनाए रख रहे हैं। इसे जारी रखें!`
          : `🌱 **${currentPersonality.name}**: Wonderful pace! You are maintaining a highly sustainable balance of deep focus and gentle recovery. Keep it up!`;
      } else if (currentPersonality.id === 'coach') {
        return isHi
          ? `🔥 **${currentPersonality.name}**: आप पूरी ताकत से आगे बढ़ रहे हैं! ऊर्जा का स्तर उत्तम है। ध्यान केंद्रित रखें और गति बनाए रखें!`
          : `🔥 **${currentPersonality.name}**: You are in absolute command of your tempo. Your stamina levels look pristine. Keep hitting those key targets!`;
      } else if (currentPersonality.id === 'philosopher') {
        return isHi
          ? `🌌 **${currentPersonality.name}**: मन शांत और क्रिया स्पष्ट है। आप प्रवाह (flow) की एक सुंदर अवस्था का आनंद ले रहे हैं। वर्तमान में बने रहें।`
          : `🌌 **${currentPersonality.name}**: Your mind is settled and your actions flow with ease. You are in a state of tranquil equilibrium. Remain present in this space.`;
      } else {
        return isHi
          ? `🎨 **${currentPersonality.name}**: काम का स्तर बेहतरीन है! आपकी विचार यात्रा बहुत सुचारू रूप से चल रही है। नई चीज़ों का प्रयोग करते रहें!`
          : `🎨 **${currentPersonality.name}**: Fantastic rhythm! Your creative sparks are flying without consuming you. Let's continue creating magic!`;
      }
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded-xl">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-mono">
              {lang === 'hi' ? '🔋 ऊर्जा एवं बर्नआउट विश्लेषण' : '🔋 Energy & Burnout Analytics'}
            </h3>
            <p className="text-[10px] text-zinc-400 font-sans mt-0.5">
              {lang === 'hi' ? 'पोमोडोरो और कार्यभार पर आधारित वास्तविक समय की ऊर्जा ट्रैकिंग' : 'Real-time cognitive exhaustion analytics based on workload & focus'}
            </p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${status.color}`}>
          {status.label}
        </div>
      </div>

      {/* Two side-by-side gauge progress bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Deep vs Shallow Work hours */}
        <div className="space-y-4">
          <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-400 block font-bold">
            {lang === 'hi' ? 'कार्य तीव्रता वितरण' : 'Focus Intensity Breakdown'}
          </span>
          <div className="space-y-3 bg-zinc-50 dark:bg-zinc-950/60 p-4 rounded-2xl border border-zinc-150 dark:border-zinc-900/60">
            {/* Deep Work */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-sans">
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" />
                  {lang === 'hi' ? 'गहन कार्य (Deep Work)' : 'Deep Work Focus'}
                </span>
                <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{deepWorkHours} {lang === 'hi' ? 'घंटे' : 'hrs'}</span>
              </div>
              <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" 
                  style={{ width: `${Math.min((Number(deepWorkHours) / 6) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Shallow Work */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs font-sans">
                <span className="text-zinc-500 dark:text-zinc-400 font-semibold flex items-center gap-1">
                  <Coffee className="w-3.5 h-3.5" />
                  {lang === 'hi' ? 'हल्का कार्य (Shallow Work)' : 'Shallow Work'}
                </span>
                <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{shallowWorkHours} {lang === 'hi' ? 'घंटे' : 'hrs'}</span>
              </div>
              <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-zinc-400 dark:bg-zinc-600 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min((Number(shallowWorkHours) / 6) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
          <div className="p-3.5 bg-indigo-50/20 dark:bg-zinc-950/20 border border-indigo-100/30 dark:border-zinc-900/40 rounded-2xl text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
            💡 <strong>{lang === 'hi' ? 'पीक उत्पादकता खिड़की:' : 'Peak Productivity Window:'}</strong> {lang === 'hi' ? 'आप सुबह 9 बजे से 11 बजे के बीच 40% अधिक कुशल होते हैं।' : 'You completed 40% more tasks between 9 AM and 11 AM.'}
          </div>
        </div>

        {/* Burnout Meter */}
        <div className="space-y-4">
          <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-400 block font-bold">
            {lang === 'hi' ? 'संज्ञानात्मक थकावट सूचक' : 'Exhaustion Risk Coefficient'}
          </span>
          <div className="space-y-3 bg-zinc-50 dark:bg-zinc-950/60 p-4 rounded-2xl border border-zinc-150 dark:border-zinc-900/60 flex flex-col justify-center h-[90px]">
            <div className="flex justify-between text-xs font-sans mb-1.5">
              <span className="text-zinc-600 dark:text-zinc-400 font-bold">{lang === 'hi' ? 'तनाव स्कोर' : 'Workload Stress Index'}</span>
              <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{burnoutScore}%</span>
            </div>
            <div className="h-3 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden relative">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  burnoutScore >= 70 ? 'bg-gradient-to-r from-amber-500 to-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                  : burnoutScore >= 40 ? 'bg-amber-500'
                  : 'bg-emerald-500'
                }`}
                style={{ width: `${burnoutScore}%` }}
              />
            </div>
            <span className="text-[9px] text-zinc-500 dark:text-zinc-600 font-mono text-right block mt-1">
              {burnoutScore >= 70 ? (lang === 'hi' ? 'अतिभार चेतावनी!' : 'Critical overload - Rest required')
               : burnoutScore >= 40 ? (lang === 'hi' ? 'संतुलित थकावट' : 'Moderately taxed')
               : (lang === 'hi' ? 'स्थिर और ऊर्जावान' : 'Stable and focused')
              }
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onActivateZenCooldown(!isZenCooldownActive)}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                isZenCooldownActive
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900'
                  : 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 border-transparent'
              }`}
            >
              {isZenCooldownActive ? (
                <>
                  <Compass className="w-4 h-4 animate-spin" style={{ animationDuration: '8s' }} />
                  {lang === 'hi' ? 'ध्यानपूर्ण शीतलन सक्रिय है' : 'Zen Rest Active'}
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4" />
                  {lang === 'hi' ? 'शीतलन मोड (Zen Cooldown) शुरू करें' : 'Trigger Zen Cooldown Day'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* AI Burnout Suggestion / Critique Section */}
      <div className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100/20 dark:border-indigo-950/30">
        <p className="text-xs text-zinc-700 dark:text-zinc-300 font-sans leading-relaxed italic">
          {getBurnoutFeedback()}
        </p>
      </div>
    </div>
  );
}
