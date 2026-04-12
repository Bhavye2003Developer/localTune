import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import * as dsp from '../app/lib/dsp';
import { DSPPanel } from '../app/components/dsp/DSPPanel';

// Mock dnd-kit to avoid pointer sensor issues in jsdom
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  closestCenter: vi.fn(),
  PointerSensor: class {},
  TouchSensor: class {},
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
  verticalListSortingStrategy: vi.fn(),
  arrayMove: vi.fn((arr: unknown[], from: number, to: number) => {
    const next = [...arr];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  }),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => '' } },
}));

// Mock dsp.ts — we test the component in isolation
vi.mock('../app/lib/dsp', () => ({
  getStageOrder:   vi.fn(() => ['eq', 'bassEngine', 'compressor', 'stereoWidener', 'reverb']),
  getStageBypass:  vi.fn(() => false),
  setStageBypass:  vi.fn(),
  rewireDSPChain:  vi.fn(),
  getDSPSettings:  vi.fn(() => ({
    stageOrder: ['eq', 'bassEngine', 'compressor', 'stereoWidener', 'reverb'],
    replayGain: { enabled: true },
    bassEngine: { bypassed: false, subBass: 0, bassShelf: 0, compressor: false, monoBass: false, harmonicEnhancer: false },
    compressor: { bypassed: false, threshold: -24, ratio: 3, attack: 0.003, release: 0.25, knee: 30, makeupGain: 0 },
    stereoWidener: { bypassed: false, width: 100 },
    reverb: { bypassed: false, preset: 'Studio', wet: 0.2 },
  })),
  setReverbPreset:          vi.fn(),
  setReverbWet:             vi.fn(),
  setStereoWidth:           vi.fn(),
  setCompressorThreshold:   vi.fn(),
  setCompressorRatio:       vi.fn(),
  setCompressorAttack:      vi.fn(),
  setCompressorRelease:     vi.fn(),
  setCompressorKnee:        vi.fn(),
  setCompressorMakeupGain:  vi.fn(),
  getCompressorReduction:   vi.fn(() => -3),
  setBassSubBass:           vi.fn(),
  setBassShelf:             vi.fn(),
  setBassCompressorEnabled: vi.fn(),
  setBassMonoBass:          vi.fn(),
  setBassHarmonicEnhancer:  vi.fn(),
}));

function renderPanel(open = true) {
  return render(
    <DSPPanel
      open={open}
      onClose={vi.fn()}
      onOpenEQ={vi.fn()}
      detectedReplayGain="-4.5 dB"
    />
  );
}

describe('DSPPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders ReplayGain card with detected gain', () => {
    renderPanel();
    expect(screen.getByText(/ReplayGain/i)).toBeInTheDocument();
    expect(screen.getByText(/-4.5 dB/i)).toBeInTheDocument();
  });

  it('renders all 5 middle stage cards', () => {
    renderPanel();
    expect(screen.getByText(/Parametric EQ/i)).toBeInTheDocument();
    expect(screen.getByText(/Bass Engine/i)).toBeInTheDocument();
    // "Compressor" appears in both the stage title and BassEngine toggle — just check at least one
    expect(screen.getAllByText(/Compressor/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Stereo Widener/i)).toBeInTheDocument();
    expect(screen.getByText(/Reverb/i)).toBeInTheDocument();
  });

  it('renders Limiter card', () => {
    renderPanel();
    expect(screen.getByText(/Limiter/i)).toBeInTheDocument();
    expect(screen.getByText(/-0.1 dBFS/i)).toBeInTheDocument();
  });

  it('calls setStageBypass when bypass button clicked', () => {
    renderPanel();
    const bypassBtns = screen.getAllByTitle(/Bypass stage|Enable stage/i);
    fireEvent.click(bypassBtns[0]);
    expect(dsp.setStageBypass).toHaveBeenCalled();
  });

  it('reverb preset buttons are rendered', () => {
    renderPanel();
    expect(screen.getByText('Studio')).toBeInTheDocument();
    expect(screen.getByText('Hall')).toBeInTheDocument();
    expect(screen.getByText('Church')).toBeInTheDocument();
    expect(screen.getByText('Outdoor')).toBeInTheDocument();
  });

  it('clicking a reverb preset calls setReverbPreset', () => {
    renderPanel();
    fireEvent.click(screen.getByText('Hall'));
    expect(dsp.setReverbPreset).toHaveBeenCalledWith('Hall');
  });

  it('GR meter renders in Compressor stage', () => {
    renderPanel();
    expect(screen.getByText(/GR/i)).toBeInTheDocument();
  });

  it('panel is hidden when open=false', () => {
    const { container } = renderPanel(false);
    const panel = container.firstChild as HTMLElement;
    expect(panel.style.height).toBe('0px');
  });
});
