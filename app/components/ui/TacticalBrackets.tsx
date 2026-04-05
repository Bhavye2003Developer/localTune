interface Props {
  /** Arm length in px. Default 14 */
  size?: number;
  /** Border thickness in px. Default 1.5 */
  thickness?: number;
  /** CSS color string. Default rgba(0,212,255,0.5) */
  color?: string;
}

/**
 * Renders four corner brackets as absolute-positioned spans.
 * Parent must have `position: relative` (or `relative` Tailwind class).
 */
export function TacticalBrackets({
  size = 14,
  thickness = 1.5,
  color = 'rgba(0,212,255,0.5)',
}: Props) {
  const base: React.CSSProperties = {
    position: 'absolute',
    width:  size,
    height: size,
    borderColor: color,
    borderStyle: 'solid',
    pointerEvents: 'none',
  };

  return (
    <>
      {/* Top-left */}
      <span style={{ ...base, top: 0, left: 0,   borderWidth: `${thickness}px 0 0 ${thickness}px` }} />
      {/* Top-right */}
      <span style={{ ...base, top: 0, right: 0,  borderWidth: `${thickness}px ${thickness}px 0 0` }} />
      {/* Bottom-left */}
      <span style={{ ...base, bottom: 0, left: 0,  borderWidth: `0 0 ${thickness}px ${thickness}px` }} />
      {/* Bottom-right */}
      <span style={{ ...base, bottom: 0, right: 0, borderWidth: `0 ${thickness}px ${thickness}px 0` }} />
    </>
  );
}
