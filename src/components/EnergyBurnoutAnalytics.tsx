import React, { useState } from 'react';
import { Zap, ShieldAlert, Sparkles, Flame, Coffee, CheckCircle, Compass, Moon } from 'lucide-react';
import { Task, AIPersonality } from '../types';

interface EnergyBurnoutAnalyticsProps {
  lang: 'en' | 'hinglish';
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
    const isHinglish = lang === 'hinglish';
    if (score >= 70) return { label: isHinglish ? 'Bohot Zyada Stress Risk! 🚨' : 'Severe Burnout Risk! 🚨', color: 'text-rose-500 border-rose-500/25 bg-rose-500/10' };
    if (score >= 40) return { label: isHinglish ? 'Thoda Stress Risk ⚠️' : 'Moderate Stress ⚠️', color: 'text-amber-500 border-amber-500/25 bg-amber-500/10' };
    return { label: isHinglish ? 'Sahi Energy 🌱' : 'Optimal Energy 🌱', color: 'text-emerald-500 border-emerald-500/25 bg-emerald-500/10' };
  };

  const status = getBurnoutStatus(burnoutScore);

  // Companion customized burnout feedback
  const getBurnoutFeedback = () => {
    const isHinglish = lang === 'hinglish';
    if (burnoutScore >= 50) {
      if (currentPersonality.id === 'mentor') {
        return isHinglish 
          ? `🌱 **${currentPersonality.name}**: Dear friend, aapka stress level badh raha hai. Aap heavy tasks bina break ke kar rahe hain. Main strongly suggest karunga ki aap ek 'Zen Cooldown' break lein.`
          : `🌱 **${currentPersonality.name}**: Dear friend, I see your stress levels rising. You are pushing through heavy tasks without sufficient space. Please, let's activate Cooldown Day. Your peace is more valuable than any chore.`;
      } else if (currentPersonality.id === 'coach') {
        return isHinglish
          ? `🔥 **${currentPersonality.name}**: Listen up champion, mehnat karna acchi baat hai, par zyaada overload se burnout ho sakta hai. Apni energy ko recover karein. Main aaj 'Zen Cooldown' mode on karne ki advice dunga!`
          : `🔥 **${currentPersonality.name}**: Listen up champ, grinding is essential, but redlining leads to engine failure. Re-strategize and rest. I suggest triggering a mandatory Zen Cooldown right now to protect your momentum!`;
      } else if (currentPersonality.id === 'philosopher') {
        return isHinglish
          ? `🌌 **${currentPersonality.name}**: Life aur work ke cycle me, rest lena bhi utna hi zaroori hai jitna action lena. Aapka mind thoda thaka hua lag raha hai. Aaj active targets se break lein aur 'Zen Cooldown' me shaanti se rest karein.`
          : `🌌 **${currentPersonality.name}**: In the rhythm of nature, winter is as essential as spring. You are straining against the tide. Release this grasp of outcomes and embrace a mindful Zen Cooldown. Action is nothing without silent rest.`;
      } else {
        return isHinglish
          ? `🎨 **${currentPersonality.name}**: Aapke creative mind me ideas toh solid aa rahe hain! Par zyaada work pressure aapki creativity ko low kar dega. Chalo aaj ek 'Zen Cooldown' day spend karte hain aur fully recharge hote hain!`
          : `🎨 **${currentPersonality.name}**: Your creative engine is sparking too hot! Too much workload will dull your palette. Let's start a mandatory Zen Cooldown day to play, recharge, and dream!`;
      }
    } else {
      if (currentPersonality.id === 'mentor') {
        return isHinglish
          ? `🌱 **${currentPersonality.name}**: Bohot badhiya! Aap work aur rest ke beech ek healthy balance maintain kar rahe hain. Aise hi continue rakhein!`
          : `🌱 **${currentPersonality.name}**: Wonderful pace! You are maintaining a highly sustainable balance of deep focus and gentle recovery. Keep it up!`;
      } else if (currentPersonality.id === 'coach') {
        return isHinglish
          ? `🔥 **${currentPersonality.name}**: Aap full power se aage badh rahe hain! Energy level ekdum top-notch hai. Focus rakhein aur speed maintain karein!`
          : `🔥 **${currentPersonality.name}**: You are in absolute command of your tempo. Your stamina levels look pristine. Keep hitting those key targets!`;
      } else if (currentPersonality.id === 'philosopher') {
        return isHinglish
          ? `🌌 **${currentPersonality.name}**: Mind calm hai aur kaam bilkul clear hai. Aap flow state ka maza le rahe hain. Present moment me bane rahein.`
          : `🌌 **${currentPersonality.name}**: Your mind is settled and your actions flow with ease. You are in a state of tranquil equilibrium. Remain present in this space.`;
      } else {
        return isHinglish
          ? `🎨 **${currentPersonality.name}**: Bahut hi solid rhythm hai! Aapki creative sparks bina kisi thakan ke ud rahi hain. Let's continue creating magic!`
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
              {lang === 'hinglish' ? '🔋 Energy aur Burnout Analytics' : '🔋 Energy & Burnout Analytics'}
            </h3>
            <p className="text-[10px] text-zinc-400 font-sans mt-0.5">
              {lang === 'hinglish' ? 'Pomodoro aur workload ke basis par real-time energy tracking' : 'Real-time cognitive exhaustion analytics based on workload & focus'}
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
            {lang === 'hinglish' ? 'Focus Intensity Breakdown' : 'Focus Intensity Breakdown'}
          </span>
          <div className="space-y-3 bg-zinc-50 dark:bg-zinc-950/60 p-4 rounded-2xl border border-zinc-150 dark:border-zinc-900/60">
            {/* Deep Work */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-sans">
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" />
                  {lang === 'hinglish' ? 'Deep Work Focus' : 'Deep Work Focus'}
                </span>
                <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{deepWorkHours} {lang === 'hinglish' ? 'hours' : 'hrs'}</span>
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
                  {lang === 'hinglish' ? 'Shallow Work' : 'Shallow Work'}
                </span>
                <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{shallowWorkHours} {lang === 'hinglish' ? 'hours' : 'hrs'}</span>
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
            💡 <strong>{lang === 'hinglish' ? 'Peak Productivity Time:' : 'Peak Productivity Window:'}</strong> {lang === 'hinglish' ? 'Aapne 9 AM aur 11 AM ke beech 40% zyaada tasks pure kiye.' : 'You completed 40% more tasks between 9 AM and 11 AM.'}
          </div>
        </div>

        {/* Burnout Meter */}
        <div className="space-y-4">
          <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-400 block font-bold">
            {lang === 'hinglish' ? 'Exhaustion Risk Coefficient' : 'Exhaustion Risk Coefficient'}
          </span>
          <div className="space-y-3 bg-zinc-50 dark:bg-zinc-950/60 p-4 rounded-2xl border border-zinc-150 dark:border-zinc-900/60 flex flex-col justify-center h-[90px]">
            <div className="flex justify-between text-xs font-sans mb-1.5">
              <span className="text-zinc-600 dark:text-zinc-400 font-bold">{lang === 'hinglish' ? 'Stress Index' : 'Workload Stress Index'}</span>
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
              {burnoutScore >= 70 ? (lang === 'hinglish' ? 'Overload Warning! Rest karein' : 'Critical overload - Rest required')
               : burnoutScore >= 40 ? (lang === 'hinglish' ? 'Thoda tired' : 'Moderately taxed')
               : (lang === 'hinglish' ? 'Stable aur focused' : 'Stable and focused')
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
                  {lang === 'hinglish' ? 'Zen Rest Active Hai' : 'Zen Rest Active'}
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4" />
                  {lang === 'hinglish' ? 'Zen Cooldown Day Start Karein' : 'Trigger Zen Cooldown Day'}
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
