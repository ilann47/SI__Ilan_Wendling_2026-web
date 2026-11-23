import { Box } from '@mui/material';
import { useColorMode } from '../../context/ColorModeContext';
import { productName } from './brandName';

type Props = {
  size?: number;
  showName?: boolean;
  inverted?: boolean;
  onClick?: () => void;
};

const asset = (name: string) => `${import.meta.env.BASE_URL}brand/yes7parking-${name}.svg`;

// Figma: lockups 1:37 / 3:149 and compact symbol 1:202.
// Scale the exported layers proportionally in their original positions.
const colorLockup = {
  ratio: 200 / 64,
  parts: [
    { name: 'symbol', left: '0%', top: '0%', width: '41.24%' },
    { name: 'yes7', left: '43.78%', top: '13.63%', width: '31.45%' },
    { name: 'parking', left: '43.82%', top: '50%', width: '56.18%' },
  ],
};
const whiteLockup = {
  ratio: 150 / 47,
  parts: [
    { name: 'symbol-lockup-white', left: '0%', top: '0%', width: '41.24%' },
    { name: 'yes7-white', left: '43.78%', top: '13.63%', width: '31.45%' },
    { name: 'parking-white', left: '43.82%', top: '49.99%', width: '56.18%' },
  ],
};

export function BrandMark({ size = 36, showName = false, inverted, onClick }: Props) {
  const interactive = Boolean(onClick);
  const { mode } = useColorMode();
  const white = inverted ?? mode === 'dark';
  const lockup = white ? whiteLockup : colorLockup;
  const ratio = showName ? lockup.ratio : white ? 38.9939 / 36 : 82.4802 / 64.0052;

  return (
    <Box
      component={interactive ? 'button' : 'div'}
      type={interactive ? 'button' : undefined}
      onClick={onClick}
      aria-label={interactive || showName ? productName : undefined}
      role={!interactive && showName ? 'img' : undefined}
      sx={{
        appearance: 'none',
        border: 0,
        background: 'none',
        p: 0,
        m: 0,
        display: 'inline-block',
        position: 'relative',
        verticalAlign: 'middle',
        width: size * ratio,
        height: size,
        flexShrink: 0,
        overflow: 'visible',
        cursor: interactive ? 'pointer' : 'default',
        textAlign: 'left',
      }}
    >
      {showName
        ? lockup.parts.map(({ name, left, top, width }) => <Box key={name} component="img"
          src={asset(name)} alt="" sx={{ position: 'absolute', display: 'block', left, top, width, height: 'auto' }} />)
        : <Box component="img" src={asset(white ? 'symbol-white' : 'symbol')} alt=""
          sx={{ display: 'block', width: 'auto', height: size }} />}
    </Box>
  );
}
