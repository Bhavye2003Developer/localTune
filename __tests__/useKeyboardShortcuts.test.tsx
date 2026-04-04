import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '../app/hooks/useKeyboardShortcuts';
import * as playerContext from '../app/lib/playerContext';

vi.mock('../app/lib/playerContext', () => ({
  usePlayer: vi.fn(),
  getAudioEl: vi.fn(),
}));

function fireKey(key: string, extra: Partial<KeyboardEventInit> = {}) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...extra }));
}

describe('useKeyboardShortcuts', () => {
  const mockActions = {
    togglePlay: vi.fn(),
    seek: vi.fn(),
    next: vi.fn(),
    prev: vi.fn(),
    setVolume: vi.fn(),
    toggleMute: vi.fn(),
    cycleLoopMode: vi.fn(),
    cycleShuffle: vi.fn(),
    state: { volume: 0.5, muted: false },
  };

  const mockAudioEl = { currentTime: 30, duration: 180 } as HTMLAudioElement;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(playerContext.usePlayer).mockReturnValue(mockActions as ReturnType<typeof playerContext.usePlayer>);
    vi.mocked(playerContext.getAudioEl).mockReturnValue(mockAudioEl);
  });

  it('Space fires togglePlay', () => {
    renderHook(() => useKeyboardShortcuts());
    fireKey(' ');
    expect(mockActions.togglePlay).toHaveBeenCalledOnce();
  });

  it('ArrowRight seeks +5s', () => {
    renderHook(() => useKeyboardShortcuts());
    fireKey('ArrowRight');
    expect(mockActions.seek).toHaveBeenCalledWith(35);
  });

  it('ArrowLeft seeks -5s', () => {
    renderHook(() => useKeyboardShortcuts());
    fireKey('ArrowLeft');
    expect(mockActions.seek).toHaveBeenCalledWith(25);
  });

  it('Shift+ArrowRight fires next', () => {
    renderHook(() => useKeyboardShortcuts());
    fireKey('ArrowRight', { shiftKey: true });
    expect(mockActions.next).toHaveBeenCalledOnce();
    expect(mockActions.seek).not.toHaveBeenCalled();
  });

  it('Shift+ArrowLeft fires prev', () => {
    renderHook(() => useKeyboardShortcuts());
    fireKey('ArrowLeft', { shiftKey: true });
    expect(mockActions.prev).toHaveBeenCalledOnce();
  });

  it('ArrowUp increases volume by 0.05', () => {
    renderHook(() => useKeyboardShortcuts());
    fireKey('ArrowUp');
    expect(mockActions.setVolume).toHaveBeenCalledWith(expect.closeTo(0.55, 5));
  });

  it('ArrowDown decreases volume by 0.05', () => {
    renderHook(() => useKeyboardShortcuts());
    fireKey('ArrowDown');
    expect(mockActions.setVolume).toHaveBeenCalledWith(expect.closeTo(0.45, 5));
  });

  it('m fires toggleMute', () => {
    renderHook(() => useKeyboardShortcuts());
    fireKey('m');
    expect(mockActions.toggleMute).toHaveBeenCalledOnce();
  });

  it('l fires cycleLoopMode', () => {
    renderHook(() => useKeyboardShortcuts());
    fireKey('l');
    expect(mockActions.cycleLoopMode).toHaveBeenCalledOnce();
  });

  it('s fires cycleShuffle', () => {
    renderHook(() => useKeyboardShortcuts());
    fireKey('s');
    expect(mockActions.cycleShuffle).toHaveBeenCalledOnce();
  });

  it('ignores keys when input is focused', () => {
    renderHook(() => useKeyboardShortcuts());
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(mockActions.togglePlay).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('cleans up listener on unmount', () => {
    const spy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useKeyboardShortcuts());
    unmount();
    expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});

describe('useKeyboardShortcuts — new shortcuts', () => {
  const mockActions = {
    togglePlay: vi.fn(),
    seek: vi.fn(),
    next: vi.fn(),
    prev: vi.fn(),
    setVolume: vi.fn(),
    toggleMute: vi.fn(),
    cycleLoopMode: vi.fn(),
    cycleShuffle: vi.fn(),
    cycleVizMode: vi.fn(),
    setLoopA: vi.fn(),
    state: { volume: 0.5, muted: false },
  };

  const mockAudioEl = { currentTime: 30, duration: 180 } as HTMLAudioElement;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(playerContext.usePlayer).mockReturnValue(mockActions as ReturnType<typeof playerContext.usePlayer>);
    vi.mocked(playerContext.getAudioEl).mockReturnValue(mockAudioEl);
  });

  it('a fires setLoopA', () => {
    const opts = { onOpenShortcuts: vi.fn(), focusSearch: vi.fn() };
    renderHook(() => useKeyboardShortcuts(opts));
    fireKey('a');
    expect(mockActions.setLoopA).toHaveBeenCalledOnce();
  });

  it('v fires cycleVizMode', () => {
    const opts = { onOpenShortcuts: vi.fn(), focusSearch: vi.fn() };
    renderHook(() => useKeyboardShortcuts(opts));
    fireKey('v');
    expect(mockActions.cycleVizMode).toHaveBeenCalledOnce();
  });

  it('? fires onOpenShortcuts callback', () => {
    const opts = { onOpenShortcuts: vi.fn(), focusSearch: vi.fn() };
    renderHook(() => useKeyboardShortcuts(opts));
    fireKey('?');
    expect(opts.onOpenShortcuts).toHaveBeenCalledOnce();
  });

  it('/ fires focusSearch callback', () => {
    const opts = { onOpenShortcuts: vi.fn(), focusSearch: vi.fn() };
    renderHook(() => useKeyboardShortcuts(opts));
    fireKey('/');
    expect(opts.focusSearch).toHaveBeenCalledOnce();
  });

  it('f toggles fullscreen (calls requestFullscreen)', () => {
    const opts = { onOpenShortcuts: vi.fn(), focusSearch: vi.fn() };
    const mockRequestFullscreen = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      value: mockRequestFullscreen, configurable: true,
    });
    Object.defineProperty(document, 'fullscreenElement', {
      value: null, configurable: true,
    });
    renderHook(() => useKeyboardShortcuts(opts));
    fireKey('f');
    expect(mockRequestFullscreen).toHaveBeenCalledOnce();
  });
});
