import { Box, Typography } from '@mui/material';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import AttachMoneyOutlinedIcon from '@mui/icons-material/AttachMoneyOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import { HexMark } from '../brand/HexMark';

const NODES = [
  { id: 'compras', label: 'Compras', Icon: ShoppingCartOutlinedIcon, x: 18, y: 18 },
  { id: 'financeiro', label: 'Financeiro', Icon: AttachMoneyOutlinedIcon, x: 50, y: 6 },
  { id: 'logistica', label: 'Logística', Icon: LocalShippingOutlinedIcon, x: 82, y: 18 },
  { id: 'estoque', label: 'Estoque', Icon: Inventory2OutlinedIcon, x: 18, y: 78 },
  { id: 'rh', label: 'RH', Icon: GroupsOutlinedIcon, x: 50, y: 90 },
  { id: 'vendas', label: 'Vendas', Icon: TrendingUpOutlinedIcon, x: 82, y: 78 },
] as const;

function HexTile({
  x,
  y,
  label,
  Icon,
  center,
}: {
  x: number;
  y: number;
  label?: string;
  Icon?: typeof ShoppingCartOutlinedIcon;
  center?: boolean;
}) {
  const size = center ? 78 : 58;
  return (
    <Box
      sx={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
        width: size,
        height: size,
        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
        bgcolor: '#fff',
        boxShadow: center
          ? '0 12px 28px rgba(107,70,254,0.22)'
          : '0 8px 18px rgba(27,33,64,0.08)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.15,
        zIndex: 2,
      }}
    >
      {center ? (
        <HexMark size={42} />
      ) : Icon ? (
        <>
          <Icon sx={{ fontSize: 18, color: '#6B46FE' }} />
          <Typography sx={{ fontSize: '0.58rem', fontWeight: 800, color: '#1B2140', lineHeight: 1 }}>
            {label}
          </Typography>
        </>
      ) : null}
    </Box>
  );
}

/** Diagrama de módulos do painel esquerdo da login (portado do Hub). */
export function LoginHeroDiagram() {
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth: 420,
        height: { xs: 240, md: 280 },
        mx: 'auto',
      }}
    >
      <Box
        component="svg"
        viewBox="0 0 100 100"
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1 }}
        aria-hidden
      >
        {NODES.map((node) => (
          <line
            key={node.id}
            x1="50"
            y1="50"
            x2={node.x}
            y2={node.y}
            stroke="#7DD3FC"
            strokeWidth="0.7"
            opacity="0.85"
          />
        ))}
      </Box>
      {NODES.map((node) => (
        <HexTile key={node.id} x={node.x} y={node.y} label={node.label} Icon={node.Icon} />
      ))}
      <HexTile x={50} y={50} center />
    </Box>
  );
}
