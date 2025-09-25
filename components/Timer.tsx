'use client';

import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, X } from 'lucide-react';
import CircleMinuteSelector from './CircleMinuteSelector';

type TimerState = 'set' | 'running' | 'paused' | 'completed';

interface TimerProps {
  className?: string;
}

export default function Timer({ className = '' }: TimerProps) {
  const [state, setState] = useState<TimerState>('set');
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  // UI is constrained to 400x150 (minus top bar); avoid extra elements that could cause overflow

  // Track window focus/blur
  useEffect(() => {
    const onFocus = () => setIsFocused(true);
    const onBlur = () => setIsFocused(false);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    // initialize
    if (document.hasFocus()) setIsFocused(true);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // Timer countdown effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (state === 'running' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setState('completed');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state, timeLeft]);

  const recomputeTimeLeft = useCallback((h: number, m: number) => {
    setTimeLeft(h * 3600 + m * 60);
  }, []);

  const handleHourSelect = useCallback((selectedHour: number) => {
    setHours(selectedHour);
    recomputeTimeLeft(selectedHour, minutes);
  }, [minutes, recomputeTimeLeft]);

  const handleMinuteSelect = useCallback((selectedMinute: number) => {
    setMinutes(selectedMinute);
    recomputeTimeLeft(hours, selectedMinute);
  }, [hours, recomputeTimeLeft]);

  const handlePlay = useCallback(() => {
    if (hours > 0 || minutes > 0) {
      setState('running');
    }
  }, [hours, minutes]);

  const handlePause = useCallback(() => {
    setState('paused');
  }, []);

  const handleReset = useCallback(() => {
    setState('set');
    recomputeTimeLeft(hours, minutes);
  }, [hours, minutes, recomputeTimeLeft]);

  const handleStop = useCallback(() => {
    setState('set');
    setHours(0);
    setMinutes(0);
    setTimeLeft(0);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatHMS = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs <= 0) {
      return `${mins.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };


  const renderSelectors = () => (
    <div className="flex items-center gap-2">
      <CircleMinuteSelector value={hours} onChange={handleHourSelect} size={90} steps={6} unitLabel="hrs" />
      <CircleMinuteSelector value={minutes} onChange={handleMinuteSelect} size={90} steps={60} unitLabel="min" />
    </div>
  );

  const renderSetTimerState = () => (
    <div className="h-full w-full flex">
      {/* Left content area (fills remaining space) */}
      <div className="flex-1 h-full flex items-center justify-center">
        <div className="w-full h-full flex items-center justify-center">
          {renderSelectors()}
        </div>
      </div>
      {/* Right controls area (max 20%) */}
      <div className="h-full flex flex-col items-end justify-center pr-[15px] max-w-[20%] flex-shrink-0">
        <button
          onClick={handlePlay}
          disabled={hours === 0 && minutes === 0}
          className={`flex items-center justify-center w-12 h-12 rounded-full transition-colors ${
            hours > 0 || minutes > 0
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
        >
          <Play className="w-5 h-5 ml-0.5" />
        </button>
      </div>
    </div>
  );

  const renderActiveState = (variant: 'running' | 'paused') => (
    <div className="h-full w-full flex">
      {/* Left countdown area: fills remaining space (appears ~80% when focused) */}
      <div className="flex-1 h-full flex items-center justify-center">
        {(() => {
          const showHours = timeLeft >= 3600;
          const minPx = showHours ? 24 : 28;
          // Tighter caps when hours are visible to avoid horizontal overflow
          const vw = showHours
            ? (!isFocused ? 18 : 16)
            : (!isFocused ? 28 : 24);
          const maxPx = showHours
            ? (!isFocused ? 190 : 130)
            : (!isFocused ? 260 : 180);
          const fontSize = `clamp(${minPx}px, ${vw}vw, ${maxPx}px)`;
          return (
            <div
              className={`w-full h-full mt-[0px] mb-[15px] text-center font-sans font-bold leading-none tracking-tight overflow-hidden whitespace-nowrap`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: isFocused ? '90%' : '100%', fontSize }}
            >
              {formatHMS(timeLeft)}
            </div>
          );
        })()}
      </div>
      {/* Right controls area (max 20%) only when focused */}
      {isFocused && (
        <div className="h-full flex flex-col items-end justify-start pt-2 gap-1 pr-[15px] max-w-[20%] flex-shrink-0">
          {variant === 'running' ? (
            <>
              <button
                onClick={handlePause}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <Pause className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleStop}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handlePlay}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Play className="w-3.5 h-3.5 ml-0.5" />
              </button>
              <button
                onClick={handleReset}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );

  // Paused state uses the exact same layout as running; only buttons differ
  const renderPausedState = () => renderActiveState('paused');

  const renderCompletedState = () => (
    <div className="h-full w-full flex items-center justify-between px-3">
      <div className="shrink-0">
        <CircleMinuteSelector value={0} onChange={handleMinuteSelect} size={112} />
      </div>
      <div className="shrink-0">
        <button
          onClick={handleStop}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className={`h-full w-full ${className}`}>
      {state === 'set' && renderSetTimerState()}
      {state === 'running' && renderActiveState('running')}
      {state === 'paused' && renderPausedState()}
      {state === 'completed' && renderCompletedState()}
    </div>
  );
}
