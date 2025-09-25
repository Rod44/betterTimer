'use client';

import { useEffect, useState, useCallback } from 'react';
import { Lock, Unlock, Sun, Moon } from 'lucide-react';

export default function TopBar() {
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const current = await window.desktop?.getAlwaysOnTop?.();
        if (mounted && typeof current === 'boolean') {
          setIsLocked(current);
        }
      } catch {}
      // Initialize theme from localStorage or system preference
      try {
        const stored = typeof window !== 'undefined' ? window.localStorage.getItem('theme') : null;
        const prefersDark = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-color-scheme: dark)').matches : false;
        const initial: 'light' | 'dark' = stored === 'dark' || (!stored && prefersDark) ? 'dark' : 'light';
        setTheme(initial);
        const root = document.documentElement;
        if (initial === 'dark') {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      } catch {}
      if (mounted) setIsReady(true);
    };
    init();
    return () => {
      mounted = false;
    };
  }, []);

  const toggle = useCallback(async () => {
    try {
      const next = await window.desktop?.toggleAlwaysOnTop?.();
      if (typeof next === 'boolean') {
        setIsLocked(next);
      } else {
        // No electron context; just flip local state for dev web
        setIsLocked((v) => !v);
      }
    } catch {
      setIsLocked((v) => !v);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: 'light' | 'dark' = prev === 'dark' ? 'light' : 'dark';
      const root = document.documentElement;
      if (next === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      try {
        window.localStorage.setItem('theme', next);
      } catch {}
      return next;
    });
  }, []);

  return (
    <div className="electron-drag-bar flex items-center justify-end gap-1 px-2 relative z-10 text-foreground">
      <button
        type="button"
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className="electron-no-drag inline-flex h-5 w-5 items-center justify-center rounded hover:bg-foreground/10"
        onClick={toggleTheme}
        disabled={!isReady}
      >
        {theme === 'dark' ? (
          <Moon className="h-3.5 w-3.5" />
        ) : (
          <Sun className="h-3.5 w-3.5" />
        )}
      </button>
      <button
        type="button"
        aria-label={isLocked ? 'Unlock window' : 'Lock window'}
        title={isLocked ? 'Unlock window' : 'Lock window'}
        className="electron-no-drag inline-flex h-5 w-5 items-center justify-center rounded hover:bg-foreground/10"
        onClick={toggle}
        disabled={!isReady}
      >
        {isLocked ? (
          <Lock className="h-3.5 w-3.5" />
        ) : (
          <Unlock className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}


