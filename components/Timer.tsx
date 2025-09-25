'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, X } from 'lucide-react';
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
  const [seconds, setSeconds] = useState(0);
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

  const recomputeTimeLeft = useCallback((h: number, m: number, s: number) => {
    setTimeLeft(h * 3600 + m * 60 + s);
  }, []);

  const handleHourSelect = useCallback((selectedHour: number) => {
    setHours(selectedHour);
    recomputeTimeLeft(selectedHour, minutes, seconds);
  }, [minutes, seconds, recomputeTimeLeft]);

  const handleMinuteSelect = useCallback((selectedMinute: number) => {
    setMinutes(selectedMinute);
    recomputeTimeLeft(hours, selectedMinute, seconds);
  }, [hours, seconds, recomputeTimeLeft]);

  const handleSecondSelect = useCallback((selectedSecond: number) => {
    setSeconds(selectedSecond);
    recomputeTimeLeft(hours, minutes, selectedSecond);
  }, [hours, minutes, recomputeTimeLeft]);

  const handlePlay = useCallback(() => {
    if (hours > 0 || minutes > 0 || seconds > 0) {
      setState('running');
    }
  }, [hours, minutes, seconds]);

  const handlePause = useCallback(() => {
    setState('paused');
  }, []);

  const handleReset = useCallback(() => {
    setState('set');
    recomputeTimeLeft(hours, minutes, seconds);
  }, [hours, minutes, seconds, recomputeTimeLeft]);

  const handleStop = useCallback(() => {
    // Return to set state with previously configured time
    setState('set');
    recomputeTimeLeft(hours, minutes, seconds);
  }, [hours, minutes, seconds, recomputeTimeLeft]);

  // Independent scroll handlers per wheel (no cross-rollover)
  const WHEEL_STEP_THRESHOLD = 60; // higher => less sensitive (tune as needed)
  const hoursAccumRef = useRef(0);
  const minutesAccumRef = useRef(0);
  const secondsAccumRef = useRef(0);

  const wrap = useCallback((val: number, maxInclusive: number) => {
    const modulo = maxInclusive + 1;
    let v = ((val % modulo) + modulo) % modulo;
    return v;
  }, []);

  const adjustHoursBy = useCallback((delta: number) => {
    const next = wrap(hours + delta, 12);
    if (next !== hours) setHours(next);
    recomputeTimeLeft(next, minutes, seconds);
  }, [hours, minutes, seconds, wrap, recomputeTimeLeft]);

  const adjustMinutesBy = useCallback((delta: number) => {
    const next = wrap(minutes + delta, 59);
    if (next !== minutes) setMinutes(next);
    recomputeTimeLeft(hours, next, seconds);
  }, [hours, minutes, seconds, wrap, recomputeTimeLeft]);

  const adjustSecondsBy = useCallback((delta: number) => {
    const next = wrap(seconds + delta, 59);
    if (next !== seconds) setSeconds(next);
    recomputeTimeLeft(hours, minutes, next);
  }, [hours, minutes, seconds, wrap, recomputeTimeLeft]);

  const onWheelHours = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (state !== 'set') return;
    e.preventDefault();
    hoursAccumRef.current += e.deltaY;
    // scroll up (deltaY < 0) should increase value
    while (hoursAccumRef.current <= -WHEEL_STEP_THRESHOLD) {
      adjustHoursBy(-1);
      hoursAccumRef.current += WHEEL_STEP_THRESHOLD;
    }
    while (hoursAccumRef.current >= WHEEL_STEP_THRESHOLD) {
      adjustHoursBy(1);
      hoursAccumRef.current -= WHEEL_STEP_THRESHOLD;
    }
  }, [state, adjustHoursBy]);

  const onWheelMinutes = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (state !== 'set') return;
    e.preventDefault();
    minutesAccumRef.current += e.deltaY;
    while (minutesAccumRef.current <= -WHEEL_STEP_THRESHOLD) {
      adjustMinutesBy(-1);
      minutesAccumRef.current += WHEEL_STEP_THRESHOLD;
    }
    while (minutesAccumRef.current >= WHEEL_STEP_THRESHOLD) {
      adjustMinutesBy(1);
      minutesAccumRef.current -= WHEEL_STEP_THRESHOLD;
    }
  }, [state, adjustMinutesBy]);

  const onWheelSeconds = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (state !== 'set') return;
    e.preventDefault();
    secondsAccumRef.current += e.deltaY;
    while (secondsAccumRef.current <= -WHEEL_STEP_THRESHOLD) {
      adjustSecondsBy(-1);
      secondsAccumRef.current += WHEEL_STEP_THRESHOLD;
    }
    while (secondsAccumRef.current >= WHEEL_STEP_THRESHOLD) {
      adjustSecondsBy(1);
      secondsAccumRef.current -= WHEEL_STEP_THRESHOLD;
    }
  }, [state, adjustSecondsBy]);

  const renderSelectors = () => (
    <div className="flex items-center gap-0">
      <div onWheel={onWheelHours}>
        <CircleMinuteSelector value={hours} onChange={handleHourSelect} size={80} steps={12} unitLabel="hrs" />
      </div>
      <div className="px-0 text-xl opacity-70">:</div>
      <div onWheel={onWheelMinutes}>
        <CircleMinuteSelector value={minutes} onChange={handleMinuteSelect} size={80} steps={60} unitLabel="min" />
      </div>
      <div className="px-0 text-xl opacity-70">:</div>
      <div onWheel={onWheelSeconds}>
        <CircleMinuteSelector value={seconds} onChange={handleSecondSelect} size={80} steps={60} unitLabel="sec" />
      </div>
    </div>
  );

  const renderSetTimerState = () => (
    <div className="h-full w-full flex ">
      {/* Left content area (fills remaining space) */}
      <div className="flex-1 h-full flex items-center justify-center">
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ height: isFocused ? '90%' : '100%' }}
        >
          <div className="mt-[0px] mb-[15px]">
            {renderSelectors()}
          </div>
        </div>
      </div>
      {/* Right controls area (max 20%) */}
      <div className="h-full flex flex-col items-end justify-center pr-[15px] max-w-[20%] flex-shrink-0">
        <div
          className="w-full flex flex-col items-end justify-center"
          style={{ height: isFocused ? '90%' : '100%' }}
        >
          <div className="mt-[0px] mb-[15px]">
            <button
              onClick={handlePlay}
              disabled={hours === 0 && minutes === 0 && seconds === 0}
              className={`flex items-center justify-center w-12 h-12 rounded-full transition-colors ${
                hours > 0 || minutes > 0 || seconds > 0
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              <Play className="w-5 h-5 ml-0.5" />
            </button>
          </div>
        </div>
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
          const vw = showHours ? (!isFocused ? 18 : 16) : (!isFocused ? 28 : 24);
          const maxPx = showHours ? (!isFocused ? 190 : 130) : (!isFocused ? 260 : 180);
          const fontSize = `clamp(${minPx}px, ${vw}vw, ${maxPx}px)`;
          const hrs = Math.floor(timeLeft / 3600);
          const mins = Math.floor((timeLeft % 3600) / 60);
          const secs = timeLeft % 60;
          return (
            <div
              className={`w-full h-full mt-[0px] mb-[15px] text-center font-sans font-bold leading-none tracking-tight overflow-hidden`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: isFocused ? '90%' : '100%', fontSize }}
            >
              {showHours ? (
                <div className="flex items-center justify-center tabular-nums lining-nums">
                  <span className="inline-flex justify-center w-[2ch]">{hrs.toString().padStart(2, '0')}</span>
                  <span className="inline-flex justify-center w-[0.3ch]">:</span>
                  <span className="inline-flex justify-center w-[2ch]">{mins.toString().padStart(2, '0')}</span>
                  <span className="inline-flex justify-center w-[0.3ch]">:</span>
                  <span className="inline-flex justify-center w-[2ch]">{secs.toString().padStart(2, '0')}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center tabular-nums lining-nums">
                  <span className="inline-flex justify-center w-[2ch]">{mins.toString().padStart(2, '0')}</span>
                  <span className="inline-flex justify-center w-[0.3ch]">:</span>
                  <span className="inline-flex justify-center w-[2ch]">{secs.toString().padStart(2, '0')}</span>
                </div>
              )}
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
      <div className="flex-1 h-full flex items-center justify-center">
        <div className="w-full h-full flex items-center justify-center" style={{ height: isFocused ? '90%' : '100%' }}>
          <div
            className="mt-[0px] mb-[15px] text-center font-sans font-semibold leading-none tracking-tight text-foreground"
            style={{ fontSize: 'clamp(16px, 4vw, 22px)' }}
          >
            Done is better than perfect.
          </div>
        </div>
      </div>
      <div className="shrink-0 h-full flex items-center">
        <div className="flex items-center" style={{ height: isFocused ? '90%' : '100%' }}>
          <div className="mt-[0px] mb-[15px]">
            <button
              onClick={handleReset}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
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
