import { Box, Typography } from '@mui/material';
import { HexMark } from './HexMark';
import { hub } from '../../theme/hubTokens';

type Props = {
  size?: number;
  showName?: boolean;
  inverted?: boolean;
  onClick?: () => void;
};

export function BrandMark({ size = 36, showName = false, inverted = false, onClick }: Props) {
  const interactive = Boolean(onClick);
  const titleColor = inverted ? '#fff' : hub.navy;
  const subColor = inverted ? 'rgba(255,255,255,0.78)' : hub.navy;

  return (
    <Box
      component={interactive ? 'button' : 'div'}
      type={interactive ? 'button' : undefined}
      onClick={onClick}
      aria-label={interactive ? 'Kaneko' : undefined}
      sx={{
        appearance: 'none',
        border: 0,
        background: 'none',
        p: 0,
        m: 0,
        display: 'flex',
        alignItems: 'center',
        gap: size >= 48 ? 1.35 : 1,
        flexShrink: 0,
        overflow: 'visible',
        cursor: interactive ? 'pointer' : 'default',
        textAlign: 'left',
      }}
    >
      <HexMark size={size} />
      {showName ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: size >= 52 ? '1.55rem' : size >= 40 ? '1.12rem' : '0.98rem',
              color: titleColor,
              letterSpacing: -0.4,
              whiteSpace: 'nowrap',
            }}
          >
            Kaneko
          </Typography>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: size >= 52 ? '0.62rem' : '0.52rem',
              color: subColor,
              letterSpacing: size >= 52 ? 1.6 : 1.1,
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              mt: 0.25,
            }}
          >
            Hub operacional
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}
