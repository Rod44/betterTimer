'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface CircleSelectorProps {
  value: number; // 0..steps-1 (0..59 for minutes, 0..23 for hours)
  onChange: (next: number) => void;
  size?: number; // px
  steps?: number; // default 60 (minutes). Use 24 for hours
  unitLabel?: string; // 'min' or 'hrs'
}

export default function CircleMinuteSelector({ value, onChange, size = 50, steps = 60, unitLabel = 'min' }: CircleSelectorProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverStep, setHoverStep] = useState<number | null>(null);

  const radius = useMemo(() => (size / 2) - 10, [size]);
  const center = useMemo(() => ({ x: size / 2, y: size / 2 }), [size]);
  const ringThickness = 32; // hit area thickness
  const trackThickness = 6; // visual thickness

  const eventToStep = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return 0;
    const rect = svg.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const dx = x - center.x;
    const dy = y - center.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Only interact when inside the ring thickness area
    if (distance < radius - ringThickness || distance > radius + ringThickness) {
      return null;
    }

    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    angle = (angle + 90 + 360) % 360; // 0 at top
    let step = Math.round((angle / 360) * steps);
    if (step === steps) step = 0;
    return step;
  }, [center.x, center.y, radius, steps]);

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const step = eventToStep(e.clientX, e.clientY);
    if (step === null) {
      setHoverStep(null);
      return;
    }
    setHoverStep(step);
    if (isDragging) onChange(step);
  }, [eventToStep, isDragging, onChange]);

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const step = eventToStep(e.clientX, e.clientY);
    if (step !== null) onChange(step);
    setIsDragging(true);
  }, [eventToStep, onChange]);

  const handlePointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    setIsDragging(false);
  }, []);

  // Compute indicator positions
  const stepAngle = useMemo(() => (value / steps) * 360, [value, steps]);
  // Smoothly animate toward the target angle to create a fluid thumb/progress motion
  const animationFrameRef = useRef<number | null>(null);
  const [animatedAngle, setAnimatedAngle] = useState(stepAngle);

  // Utility to wrap an angle into [0, 360)
  const normalizeAngle = useCallback((ang: number) => {
    let a = ang % 360;
    if (a < 0) a += 360;
    return a;
  }, []);

  useEffect(() => {
    const target = stepAngle;
    let raf: number | null = null;
    const stiffness = 0.22; // higher = faster catch-up

    const tick = () => {
      setAnimatedAngle((current) => {
        // Find shortest delta considering wrap-around
        const cur = normalizeAngle(current);
        const tar = normalizeAngle(target);
        let delta = tar - cur;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;

        const next = cur + delta * stiffness;
        if (Math.abs(delta) < 0.5) {
          return tar; // snap when close
        }
        return normalizeAngle(next);
      });
      raf = requestAnimationFrame(tick);
      animationFrameRef.current = raf;
    };

    raf = requestAnimationFrame(tick);
    animationFrameRef.current = raf;
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    };
  }, [stepAngle, normalizeAngle]);

  const indicator = useMemo(() => {
    const rad = (animatedAngle - 90) * Math.PI / 180;
    return {
      x: Math.round((center.x + Math.cos(rad) * radius) * 100) / 100,
      y: Math.round((center.y + Math.sin(rad) * radius) * 100) / 100,
    };
  }, [center.x, center.y, radius, animatedAngle]);

  const hoverIndicator = useMemo(() => {
    if (hoverStep === null) return null;
    const ang = (hoverStep / steps) * 360;
    const rad = (ang - 90) * Math.PI / 180;
    return {
      x: Math.round((center.x + Math.cos(rad) * radius) * 100) / 100,
      y: Math.round((center.y + Math.sin(rad) * radius) * 100) / 100,
    };
  }, [center.x, center.y, radius, hoverStep, steps]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => setHoverStep(null)}
        className="block"
      >
        {/* Hit ring (transparent) */}
        <circle cx={center.x} cy={center.y} r={radius} fill="none" stroke="transparent" strokeWidth={ringThickness * 2} />
        {/* Track + Progress (rotated so start is at top) */}
        <g transform={`rotate(-90 ${center.x} ${center.y})`}>
          {/* Track */}
          <circle
            cx={center.x}
            cy={center.y}
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-foreground/15"
            strokeWidth={trackThickness}
            strokeLinecap="round"
            pointerEvents="none"
          />

          {/* Progress */}
          {(() => {
            const circumference = Math.PI * 2 * radius;
            const progressFraction = animatedAngle / 360;
            const progress = progressFraction * circumference;
            const rest = Math.max(0, circumference - progress);
            return (
              <circle
                cx={center.x}
                cy={center.y}
                r={radius}
                fill="none"
                stroke="currentColor"
                className="text-primary"
                strokeWidth={trackThickness}
                strokeDasharray={`${progress} ${rest}`}
                strokeLinecap="round"
                pointerEvents="none"
              />
            );
          })()}
        </g>

        {/* Thumb */}
        <g pointerEvents="none">
          <circle cx={indicator.x} cy={indicator.y} r={7} className="text-primary" fill="currentColor" />
          <circle cx={indicator.x} cy={indicator.y} r={5} fill="currentColor" className="text-primary" />
          <circle cx={indicator.x} cy={indicator.y} r={7} fill="none" stroke="white" strokeWidth={2} opacity={0.9} />
        </g>

        {/* Hover indicator (small dot near thumb) */}
        {hoverIndicator && (
          <circle cx={hoverIndicator.x} cy={hoverIndicator.y} r={3} fill="currentColor" opacity={0.5} pointerEvents="none" />
        )}
      </svg>

      {/* Hover tooltip */}
      {hoverIndicator && hoverStep !== null && (
        <div
          className="absolute text-[10px] leading-none px-1.5 py-0.5 rounded bg-foreground/90 text-background pointer-events-none shadow-sm"
          style={{
            left: hoverIndicator.x,
            top: hoverIndicator.y - 8,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {hoverStep} {unitLabel}
        </div>
      )}

      {/* Center label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <div className="text-2xl font-sans leading-none">
            {value.toString().padStart(2, '0')}
          </div>
          <div className="text-xs opacity-60 leading-none -mt-0.8">
            {unitLabel}
          </div>
        </div>
      </div>
    </div>
  );
}


