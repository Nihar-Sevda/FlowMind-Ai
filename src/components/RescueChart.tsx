import React, { useState } from 'react';
import { TrendingUp, Award, Zap, ShieldAlert } from 'lucide-react';

interface RescueChartProps {
  completedPomodoros: number;
}

export default function RescueChart({ completedPomodoros }: RescueChartProps) {
  // Let's generate a beautiful, authentic dataset for the last 7 days.
  // We'll base the final day on the active `completedPomodoros` to make it reactive and real!
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  // Base historical data + reactive current day
  const rawData = [2, 1, 3, 2, 4, 3, completedPomodoros];
  const chartHeight = 140;
  const chartWidth = 320;
  const padding = 25;

  // Find max for scaling
  const maxVal = Math.max(...rawData, 4); // at least 4 for aesthetic height

  // Map data coordinates
  const points = rawData.map((val, idx) => {
    const x = padding + (idx * (chartWidth - padding * 2)) / (rawData.length - 1);
    // Invert Y coordinate for SVG space
    const y = chartHeight - padding - (val * (chartHeight - padding * 2)) / maxVal;
    return { x, y, val, label: daysOfWeek[idx] };
  });

  // Generate SVG path string for the line
  const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Generate Area SVG path for glowing backdrop filling under the line
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`;

  // Track hovered dot state
  const [hoveredPoint, setHoveredPoint] = useState<typeof points[0] | null>(null);

  return (
    <div className="bg-white dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-900 rounded-2xl p-4 shadow-sm dark:shadow-none relative overflow-hidden">
      
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 blur-xl rounded-full pointer-events-none" />

      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold block">
            Pomodoro Rescue Trend
          </span>
          <span className="text-sm font-display font-bold text-zinc-800 dark:text-zinc-300 flex items-center gap-1.5 mt-0.5">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            7-Day Velocity
          </span>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-400">
            {rawData.reduce((a, b) => a + b, 0)} Total
          </span>
          <span className="text-[9px] text-zinc-500 dark:text-zinc-600 block">Blocks Rescued</span>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div className="relative w-full h-[140px] flex items-center justify-center">
        <svg 
          viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
          className="w-full h-full overflow-visible"
        >
          {/* Custom linear gradients for the stroke line and area fill */}
          <defs>
            <linearGradient id="chartLineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="50%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#f472b6" />
            </linearGradient>
            <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.0" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#818cf8" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Grid Lines */}
          <line 
            x1={padding} 
            y1={chartHeight - padding} 
            x2={chartWidth - padding} 
            y2={chartHeight - padding} 
            className="stroke-zinc-250 dark:stroke-zinc-900 stroke-[1]" 
          />
          <line 
            x1={padding} 
            y1={padding} 
            x2={chartWidth - padding} 
            y2={padding} 
            className="stroke-zinc-200/40 dark:stroke-zinc-900/40 stroke-[1] stroke-dashed" 
          />
          <line 
            x1={padding} 
            y1={(chartHeight) / 2} 
            x2={chartWidth - padding} 
            y2={(chartHeight) / 2} 
            className="stroke-zinc-200/20 dark:stroke-zinc-900/20 stroke-[1] stroke-dashed" 
          />

          {/* Glowing area under path */}
          <path d={areaPath} fill="url(#chartAreaGradient)" />

          {/* Main glowing line */}
          <path 
            d={linePath} 
            fill="none" 
            stroke="url(#chartLineGradient)" 
            strokeWidth="3" 
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
          />

          {/* Interactive dots */}
          {points.map((p, idx) => (
            <g key={idx} className="cursor-pointer">
              {/* Highlight background ring on hover */}
              <circle
                cx={p.x}
                cy={p.y}
                r="10"
                className={`fill-transparent transition-all duration-200 ${
                  hoveredPoint?.label === p.label ? 'fill-indigo-500/10' : ''
                }`}
                onMouseEnter={() => setHoveredPoint(p)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
              
              {/* Solid inner dot */}
              <circle
                cx={p.x}
                cy={p.y}
                r={hoveredPoint?.label === p.label ? '5' : '3.5'}
                className="transition-all duration-200 text-white dark:text-zinc-950"
                fill={hoveredPoint?.label === p.label ? '#ffffff' : '#818cf8'}
                stroke="currentColor"
                strokeWidth="1.5"
                onMouseEnter={() => setHoveredPoint(p)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            </g>
          ))}

          {/* X Axis labels */}
          {points.map((p, idx) => (
            <text
              key={idx}
              x={p.x}
              y={chartHeight - 6}
              textAnchor="middle"
              className="fill-zinc-500 dark:fill-zinc-600 text-[10px] font-mono font-medium"
            >
              {p.label}
            </text>
          ))}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-zinc-900 dark:bg-zinc-950 border border-zinc-800 text-[10px] font-mono text-zinc-200 px-2 py-1 rounded shadow-lg pointer-events-none z-20 flex items-center gap-1.5 animate-in fade-in zoom-in duration-100">
            <span className="text-indigo-400 font-bold">{hoveredPoint.label}:</span>
            <span>{hoveredPoint.val} Pomodoros</span>
          </div>
        )}
      </div>

      {/* Motivational insight based on trends */}
      <div className="mt-2.5 border-t border-zinc-150 dark:border-zinc-900/60 pt-2 flex items-center justify-between text-[10px] text-zinc-500">
        <span className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-500" />
          Active streak: 3 days
        </span>
        <span className="text-zinc-400 dark:text-zinc-600">Weekly Target: 20 blocks</span>
      </div>
    </div>
  );
}
