import { Box, Button, Card, CardContent, Chip, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography, useMediaQuery, useTheme } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import type { ItemPatio } from '../../types';
import { formatDateTime, minutesToHuman } from '../../utils/format';
import type { VehicleView } from './vehicleView';

interface VehicleEvent {
  nome: string;
  modo: 'ENTRADA' | 'SAIDA';
  ordemServicoNumero?: string | null;
}
interface Props {
  items: ItemPatio[];
  stays: ReadonlyMap<number, VehicleEvent>;
  view: VehicleView;
  canExit: boolean;
  exitDisabled: boolean;
  canCorrect: boolean;
  onExit: (item: ItemPatio) => void;
  onCorrect: (item: ItemPatio) => void;
}
const kind = (item: ItemPatio, stay?: VehicleEvent) => stay ? 'Evento' : item.tipo === 'MENSALISTA' ? 'Mensalista' : 'Avulso';
const payment = (stay: VehicleEvent) => stay.modo === 'ENTRADA' ? 'Pago na entrada' : 'Receber na saída';

/** As duas superfícies usam os mesmos registros e handlers autoritativos da página. */
export function PatioVehicles({ items, stays, view, canExit, exitDisabled, canCorrect, onExit, onCorrect }: Props) {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('md'));
  const actions = (item: ItemPatio, fullWidth = false) => (
    <Stack direction={fullWidth ? 'column' : 'row'} gap={1} flexWrap="wrap">
      {canExit && <Button fullWidth={fullWidth} variant="outlined" startIcon={<LogoutIcon />}
        disabled={exitDisabled} aria-label={`Conferir saída de ${item.placa}`}
        onClick={() => onExit(item)}>Conferir saída</Button>}
      {canCorrect && <Button aria-label={`Corrigir registro de ${item.placa}`} onClick={() => onCorrect(item)}>Corrigir registro</Button>}
    </Stack>
  );
  const os = (stay?: VehicleEvent) => stay?.ordemServicoNumero
    ? <Typography variant="body2">OS {stay.ordemServicoNumero} · Em execução</Typography> : null;

  if (view === 'cards') return (
    <Box component="ul" aria-label="Veículos no pátio em cartões" sx={{ m: 0, p: 0, listStyle: 'none',
      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 255px), 1fr))', gap: 1.5 }}>
      {items.map((item) => {
        const stay = stays.get(item.movimentacaoId);
        return <Card component="li" key={item.movimentacaoId}><CardContent>
          <Stack spacing={1.25}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
              <Typography variant="h6">{item.placa}</Typography><Chip size="small" label={kind(item, stay)} />
            </Stack>
            <Typography variant="body2" color="text.secondary">{item.modelo ? item.modelo + ' · ' : ''}Entrada: {formatDateTime(item.dataEntrada)}</Typography>
            <Typography variant="body2">Permanência: <strong>{minutesToHuman(item.minutosPermanencia)}</strong></Typography>
            {stay && <Typography variant="body2">{stay.nome} · {payment(stay)}</Typography>}
            {os(stay)}
            {(canExit || canCorrect) && actions(item, true)}
          </Stack>
        </CardContent></Card>;
      })}
    </Box>
  );

  if (compact) return (
    <Box component="ul" aria-label="Veículos no pátio em listagem" sx={{ m: 0, p: 0, listStyle: 'none',
      border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper', overflow: 'hidden' }}>
      {items.map((item) => {
        const stay = stays.get(item.movimentacaoId);
        return <Box component="li" key={item.movimentacaoId} sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}>
          <Stack gap={1.25} sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="start" gap={1}>
              <Box><Typography sx={{ fontWeight: 750 }}>{item.placa}</Typography>
                {item.modelo && <Typography variant="body2" color="text.secondary">{item.modelo}</Typography>}</Box>
              <Chip size="small" label={kind(item, stay)} />
            </Stack>
            <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 1.5, m: 0 }}>
              <Box><Typography component="dt" variant="caption" color="text.secondary">Entrada</Typography>
                <Typography component="dd" variant="body2" sx={{ m: 0 }}>{formatDateTime(item.dataEntrada)}</Typography></Box>
              <Box><Typography component="dt" variant="caption" color="text.secondary">Permanência</Typography>
                <Typography component="dd" variant="body2" sx={{ m: 0 }}>{minutesToHuman(item.minutosPermanencia)}</Typography></Box>
            </Box>
            {stay && <Box><Typography variant="body2">{stay.nome}</Typography><Typography variant="caption" color="text.secondary">{payment(stay)}</Typography></Box>}
            {os(stay)}
            {(canExit || canCorrect) && actions(item)}
          </Stack>
        </Box>;
      })}
    </Box>
  );

  return (
    <TableContainer sx={{ maxWidth: '100%', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Table aria-label="Veículos no pátio" size="small" sx={{ minWidth: 850, bgcolor: 'background.paper' }}>
        <TableHead><TableRow>
          <TableCell>Placa / veículo</TableCell><TableCell>Tipo</TableCell><TableCell>Entrada</TableCell>
          <TableCell>Permanência</TableCell><TableCell>Evento e cobrança</TableCell><TableCell>Ordem de serviço</TableCell>
          {(canExit || canCorrect) && <TableCell>Ações</TableCell>}
        </TableRow></TableHead>
        <TableBody>{items.map((item) => {
          const stay = stays.get(item.movimentacaoId);
          return <TableRow key={item.movimentacaoId} hover>
            <TableCell component="th" scope="row"><Typography sx={{ fontWeight: 750 }}>{item.placa}</Typography>
              {item.modelo && <Typography variant="caption" color="text.secondary">{item.modelo}</Typography>}</TableCell>
            <TableCell><Chip size="small" label={kind(item, stay)} /></TableCell>
            <TableCell>{formatDateTime(item.dataEntrada)}</TableCell>
            <TableCell>{minutesToHuman(item.minutosPermanencia)}</TableCell>
            <TableCell sx={{ overflowWrap: 'anywhere', maxWidth: 300 }}>{stay
              ? <><Typography variant="body2">{stay.nome}</Typography><Typography variant="caption" color="text.secondary">{payment(stay)}</Typography></>
              : 'Estacionamento comum'}</TableCell>
            <TableCell>{os(stay) ?? '—'}</TableCell>
            {(canExit || canCorrect) && <TableCell sx={{ minWidth: 175 }}>{actions(item)}</TableCell>}
          </TableRow>;
        })}</TableBody>
      </Table>
    </TableContainer>
  );
}
