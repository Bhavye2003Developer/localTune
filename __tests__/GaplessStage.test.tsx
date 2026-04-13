import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ─── Mock Dexie db ─────────────────────────────────────────────────────────────
// vi.mock is hoisted — use vi.hoisted() so references are available in factory.

const { mockGet, mockPut } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPut: vi.fn(),
}));

vi.mock('../app/lib/db', () => ({
  db: {
    gaplessSettings: {
      get: mockGet,
      put: mockPut,
    },
  },
}));

// ─── Import component after mock is wired ─────────────────────────────────────

import { GaplessStage } from '../app/components/dsp/stages/GaplessStage';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GaplessStage', () => {
  const defaultProps = {
    onSettingsChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no stored settings (first run)
    mockGet.mockResolvedValue(undefined);
    mockPut.mockResolvedValue(undefined);
  });

  it('renders a gapless enable/disable toggle', () => {
    render(<GaplessStage {...defaultProps} />);
    const toggle = screen.getByRole('checkbox', { name: /gapless/i });
    expect(toggle).toBeInTheDocument();
  });

  it('toggle is off by default when no settings are stored', async () => {
    render(<GaplessStage {...defaultProps} />);
    await waitFor(() => {
      const toggle = screen.getByRole('checkbox', { name: /gapless/i });
      expect(toggle).not.toBeChecked();
    });
  });

  it('renders a crossfade duration slider with range 0–6', () => {
    render(<GaplessStage {...defaultProps} />);
    const slider = screen.getByRole('slider', { name: /crossfade/i });
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '6');
  });

  it('crossfade slider defaults to 0', async () => {
    render(<GaplessStage {...defaultProps} />);
    await waitFor(() => {
      const slider = screen.getByRole('slider', { name: /crossfade/i });
      expect(slider).toHaveValue('0');
    });
  });

  it('enabling the toggle calls onSettingsChange with enabled=true', async () => {
    const onSettingsChange = vi.fn();
    render(<GaplessStage onSettingsChange={onSettingsChange} />);
    const toggle = screen.getByRole('checkbox', { name: /gapless/i });
    await userEvent.click(toggle);
    expect(onSettingsChange).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
  });

  it('moving the crossfade slider calls onSettingsChange with new crossfade value', async () => {
    const onSettingsChange = vi.fn();
    render(<GaplessStage onSettingsChange={onSettingsChange} />);
    const slider = screen.getByRole('slider', { name: /crossfade/i });
    fireEvent.change(slider, { target: { value: '3' } });
    expect(onSettingsChange).toHaveBeenCalledWith(expect.objectContaining({ crossfade: 3 }));
  });

  it('persists settings to Dexie on toggle', async () => {
    render(<GaplessStage {...defaultProps} />);
    const toggle = screen.getByRole('checkbox', { name: /gapless/i });
    await userEvent.click(toggle);
    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'default', enabled: true })
      );
    });
  });

  it('persists settings to Dexie on slider change', async () => {
    render(<GaplessStage {...defaultProps} />);
    const slider = screen.getByRole('slider', { name: /crossfade/i });
    fireEvent.change(slider, { target: { value: '4' } });
    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'default', crossfade: 4 })
      );
    });
  });

  it('restores stored settings from Dexie on mount', async () => {
    mockGet.mockResolvedValue({ id: 'default', enabled: true, crossfade: 2 });
    render(<GaplessStage {...defaultProps} />);
    await waitFor(() => {
      const toggle = screen.getByRole('checkbox', { name: /gapless/i });
      expect(toggle).toBeChecked();
      const slider = screen.getByRole('slider', { name: /crossfade/i });
      expect(slider).toHaveValue('2');
    });
  });

  it('shows crossfade value label in seconds', () => {
    render(<GaplessStage {...defaultProps} />);
    // Should display "0s" or similar
    expect(screen.getByText(/0\s*s/i)).toBeInTheDocument();
  });
});
