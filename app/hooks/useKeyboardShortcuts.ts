import { useEffect } from 'react';
import { usePlayer, getAudioEl } from '../lib/playerContext';

export function useKeyboardShortcuts() {
  const { togglePlay, seek, next, prev, setVolume, toggleMute, cycleLoopMode, cycleShuffle, state } = usePlayer();

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return;

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
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.volume]);
}
