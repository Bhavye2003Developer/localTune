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

  it('does not render when closed', () => {
    const { container } = render(<EQPanel {...defaultProps} open={false} />);
    expect(container.firstChild).toBeNull();
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

  it('renders built-in preset chips', () => {
    render(<EQPanel {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Flat' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bass Boost' })).toBeInTheDocument();
  });

  it('clicking a preset chip loads the preset', () => {
    render(<EQPanel {...defaultProps} />);
    // Clear calls from initial mount sync
    defaultProps.setEQBandGain.mockClear();
    const bassBoost = screen.getByRole('button', { name: 'Bass Boost' });
    fireEvent.click(bassBoost);
    // setEQBandGain should be called once per band
    expect(defaultProps.setEQBandGain).toHaveBeenCalledTimes(10);
    // Bass Boost band 0 = +6 dB
    expect(defaultProps.setEQBandGain).toHaveBeenCalledWith(0, 6);
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
