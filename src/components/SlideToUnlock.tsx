import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';

interface SlideToUnlockProps {
  onUnlocked: () => void;
}

export default function SlideToUnlock({ onUnlocked }: SlideToUnlockProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const getContainerWidths = () => {
    if (!containerRef.current) return { maxSlideDistance: 200, containerWidth: 320 };
    const containerWidth = containerRef.current.clientWidth;
    // Track is p-1 (4px padding left/right), thumb is w-12 (48px)
    const maxSlideDistance = Math.max(100, containerWidth - 48 - 8);
    return { maxSlideDistance, containerWidth };
  };

  const handleStart = (clientX: number) => {
    if (isSuccess) return;
    setIsDragging(true);
    setStartX(clientX - currentX);
  };

  useEffect(() => {
    if (isDragging) {
      const handleMove = (e: MouseEvent | TouchEvent) => {
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const { maxSlideDistance } = getContainerWidths();
        const deltaX = Math.max(0, Math.min(clientX - startX, maxSlideDistance));
        setCurrentX(deltaX);

        if (deltaX >= maxSlideDistance * 0.95 && !isSuccess) {
          setIsSuccess(true);
          setIsDragging(false);
          setCurrentX(maxSlideDistance);
          onUnlocked();
        }
      };

      const handleEnd = () => {
        setIsDragging(false);
        if (!isSuccess) {
          // snap back with custom animation simulation
          setCurrentX(0);
        }
      };

      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleEnd);

      return () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleEnd);
        window.removeEventListener('touchmove', handleMove);
        window.removeEventListener('touchend', handleEnd);
      };
    }
  }, [isDragging, startX, isSuccess, onUnlocked]);

  // Handle window resize so slide boundaries don't break
  useEffect(() => {
    const handleResize = () => {
      if (!isSuccess) {
        setCurrentX(0);
      } else {
        const { maxSlideDistance } = getContainerWidths();
        setCurrentX(maxSlideDistance);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSuccess]);

  const { maxSlideDistance } = getContainerWidths();
  const slideProgress = maxSlideDistance > 0 ? (currentX / maxSlideDistance) * 100 : 0;

  return (
    <div 
      ref={containerRef}
      className="w-full max-w-md mx-auto h-14 bg-zinc-100 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-850 p-1 rounded-full relative flex items-center overflow-hidden shadow-inner select-none"
    >
      {/* Background glow fill based on position */}
      <div 
        className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-indigo-500/20 to-violet-500/25 transition-all rounded-l-full"
        style={{ width: `${currentX + 24}px` }}
      />
      
      {/* Centered track text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span 
          className="text-[10px] font-mono tracking-widest text-zinc-400 dark:text-zinc-500 uppercase animate-pulse select-none pl-6"
          style={{ opacity: Math.max(0, 1 - (slideProgress / 60)) }}
        >
          {isSuccess ? 'Flow Activated' : 'Slide to enter Kairox'}
        </span>
      </div>

      {/* Draggable thumb */}
      <div
        onMouseDown={(e) => handleStart(e.clientX)}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        className={`w-12 h-12 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg z-10 hover:scale-105 active:scale-95 transition-all bg-gradient-to-r from-indigo-600 to-violet-600 text-white`}
        style={{ 
          transform: `translateX(${currentX}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1), background-color 0.2s'
        }}
      >
        <ChevronRight className={`w-5 h-5 ${isDragging ? 'scale-110' : 'animate-pulse'}`} />
      </div>
    </div>
  );
}
