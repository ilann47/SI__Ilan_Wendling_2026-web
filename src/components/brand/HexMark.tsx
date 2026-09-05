import { useId } from 'react';
import { Box } from '@mui/material';

type Props = {
  size?: number;
};

/** Hexágono facetado da marca (portado de Yes7HexMark do Hub). */
export function HexMark({ size = 40 }: Props) {
  const uid = useId().replace(/:/g, '');
  const g = (name: string) => `${uid}-${name}`;

  return (
    <Box
      component="svg"
      viewBox="0 0 80 80"
      width={size}
      height={size}
      aria-hidden
      sx={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={g('a')} x1="12" y1="8" x2="68" y2="72" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C4B5FD" />
          <stop offset="45%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#5B21B6" />
        </linearGradient>
        <linearGradient id={g('b')} x1="40" y1="4" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EDE9FE" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
        <linearGradient id={g('c')} x1="70" y1="20" x2="40" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#4C1D95" />
        </linearGradient>
        <filter id={g('s')} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.4" floodColor="#6B46FE" floodOpacity="0.28" />
        </filter>
      </defs>
      <polygon
        points="40,4 72,22 72,58 40,76 8,58 8,22"
        fill={`url(#${g('a')})`}
        filter={`url(#${g('s')})`}
      />
      <polygon points="40,4 72,22 40,40" fill={`url(#${g('b')})`} opacity="0.95" />
      <polygon points="72,22 72,58 40,40" fill="#6D28D9" opacity="0.9" />
      <polygon points="72,58 40,76 40,40" fill={`url(#${g('c')})`} />
      <polygon points="40,76 8,58 40,40" fill="#5B21B6" />
      <polygon points="8,58 8,22 40,40" fill="#7C3AED" opacity="0.88" />
      <polygon points="8,22 40,4 40,40" fill="#C4B5FD" opacity="0.85" />
      <polygon points="40,26 56,35 56,45 40,54 24,45 24,35" fill="#fff" />
    </Box>
  );
}
