import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock Dexie db
vi.mock('../app/lib/db', () => ({
  db: {
    eqPresets: {
      toArray: vi.fn().mockResolvedValue([]),
      add: vi.fn().mockResolvedValue(1),
    },
  },
}));

// Mock EQCurve to isolate panel tests
vi.mock('../app/components/eq/EQCurve', () => ({
  EQCurve: () => <div data-testid="eq-curve-mock" />,
}));

import { EQPanel } from '../app/components/eq/EQPanel';

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  setEQBandGain: vi.fn(),
  setEQBypass: vi.fn(),
};

describe('EQPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('still renders when open=false (visibility controlled by parent mount/unmount)', () => {
    // EQPanel is always mounted/unmounted by the parent — open=false only gates
    // the Dexie preset fetch, it does not suppress rendering.
    const { container } = render(<EQPanel {...defaultProps} open={false} />);
    expect(container.firstChild).not.toBeNull();
  });

  it('renders "EQ" heading when open', () => {
    render(<EQPanel {...defaultProps} />);
    expect(screen.getByText('EQ')).toBeInTheDocument();
  });

  it('renders EQCurve', () => {
    render(<EQPanel {...defaultProps} />);
    expect(screen.getByTestId('eq-curve-mock')).toBeInTheDocument();
  });

  it('renders bypass toggle button', () => {
    render(<EQPanel {...defaultProps} />);
    expect(screen.getByRole('button', { name: /bypass/i })).toBeInTheDocument();
  });

  it('bypass toggle calls setEQBypass', () => {
    render(<EQPanel {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /bypass/i }));
    expect(defaultProps.setEQBypass).toHaveBeenCalledWith(true);
  });

  it('renders close button that calls onClose', () => {
    render(<EQPanel {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('renders built-in preset chips (excluding Flat)', () => {
    render(<EQPanel {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Bass Boost' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Acoustic' })).toBeInTheDocument();
    // Flat is now a standalone Reset button
    expect(screen.getByRole('button', { name: /reset to flat/i })).toBeInTheDocument();
  });

  it('clicking a preset chip loads the preset gains', () => {
    render(<EQPanel {...defaultProps} />);
    defaultProps.setEQBandGain.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Bass Boost' }));
    expect(defaultProps.setEQBandGain).toHaveBeenCalledTimes(10);
    expect(defaultProps.setEQBandGain).toHaveBeenCalledWith(0, 6);
  });

  it('clicking same preset twice deactivates it and returns to flat', () => {
    render(<EQPanel {...defaultProps} />);
    defaultProps.setEQBandGain.mockClear();
    const chip = screen.getByRole('button', { name: 'Bass Boost' });
    fireEvent.click(chip); // activate
    fireEvent.click(chip); // deactivate
    // Last call should be all-zero (flat)
    const lastCalls = defaultProps.setEQBandGain.mock.calls.slice(-10);
    lastCalls.forEach(([, gain]) => expect(gain).toBe(0));
  });

  it('clicking two preset chips makes both active and sums gains', () => {
    render(<EQPanel {...defaultProps} />);
    defaultProps.setEQBandGain.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Bass Boost' }));
    fireEvent.click(screen.getByRole('button', { name: 'Acoustic' }));
    // Band 0: Bass Boost[0]=6, Acoustic[0]=2 → 8
    expect(defaultProps.setEQBandGain).toHaveBeenCalledWith(0, 8);
  });

  it('clicking Flat reset button deactivates all presets and zeros bands', () => {
    render(<EQPanel {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Bass Boost' }));
    defaultProps.setEQBandGain.mockClear();
    fireEvent.click(screen.getByRole('button', { name: /reset to flat/i }));
    // All bands should be 0
    const lastCalls = defaultProps.setEQBandGain.mock.calls.slice(-10);
    lastCalls.forEach(([, gain]) => expect(gain).toBe(0));
  });

  it('renders Save button', () => {
    render(<EQPanel {...defaultProps} />);
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('Save button shows name input on click', () => {
    render(<EQPanel {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(screen.getByPlaceholderText(/preset name/i)).toBeInTheDocument();
  });

  it('entering a name and pressing Enter saves to db', async () => {
    const { db } = await import('../app/lib/db');
    render(<EQPanel {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    const input = screen.getByPlaceholderText(/preset name/i);
    fireEvent.change(input, { target: { value: 'My Preset' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => {
      expect(db.eqPresets.add).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'My Preset' })
      );
    });
  });
});
