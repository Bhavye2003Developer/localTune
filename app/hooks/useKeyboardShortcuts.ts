import { useEffect, useRef } from 'react';
import { usePlayer, getAudioEl } from '../lib/playerContext';

interface ShortcutOpts {
  onOpenShortcuts?: () => void;
  focusSearch?: () => void;
  onToggleEQ?: () => void;
}

export function useKeyboardShortcuts(opts: ShortcutOpts = {}) {
  const player = usePlayer();
  const playerRef = useRef(player);
  useEffect(() => { playerRef.current = player; });

  const optsRef = useRef(opts);
  useEffect(() => { optsRef.current = opts; });

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return;

      const { togglePlay, seek, next, prev, setVolume, toggleMute, cycleLoopMode, cycleShuffle, cycleVizMode, setLoopA, state } = playerRef.current;
      const el = getAudioEl();
      const currentTime = el?.currentTime ?? 0;
      const { volume } = state;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) { next(); }
          else { seek(currentTime + 5); }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) { prev(); }
          else { seek(Math.max(0, currentTime - 5)); }
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(1, volume + 0.05));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(0, volume - 0.05));
          break;
        case 'm':
          toggleMute();
          break;
        case 'l':
          cycleLoopMode();
          break;
        case 's':
          cycleShuffle();
          break;
        case 'a':
          setLoopA();
          break;
        case 'v':
          cycleVizMode();
          break;
        case 'e':
          optsRef.current.onToggleEQ?.();
          break;
        case 'f':
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          } else {
            document.documentElement.requestFullscreen().catch(() => {});
          }
          break;
        case '?':
          optsRef.current.onOpenShortcuts?.();
          break;
        case '/':
          e.preventDefault();
          optsRef.current.focusSearch?.();
          break;
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
