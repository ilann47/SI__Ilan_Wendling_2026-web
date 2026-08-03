import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import { BlockedFeatureNotice } from '../components/common/BlockedFeatureNotice';
import { PageHeader } from '../components/common/PageHeader';
import { blockerStatuses, productBlockers, type BlockerStatus } from '../features/blockers/blockers';

const statusLabels: Record<BlockerStatus, string> = {
  BLOQUEADA_EXTERNAMENTE: 'Dependencia externa',
  BLOQUEADA_POR_DECISAO_DE_NEGOCIO: 'Decisao de negocio',
  BLOQUEADA_POR_INFRAESTRUTURA: 'Infraestrutura',
};

export function BlockersPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<BlockerStatus | ''>('');
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return productBlockers.filter((blocker) => {
      const matchesStatus = !status || blocker.status === status;
      const haystack = [blocker.id, blocker.story, blocker.dependency, blocker.impact, ...blocker.modules]
        .join(' ').toLocaleLowerCase('pt-BR');
      return matchesStatus && (!term || haystack.includes(term));
    });
  }, [search, status]);

  return (
    <Box>
      <PageHeader title="Bloqueios e dependencias" subtitle="Capacidades interrompidas por decisoes, infraestrutura ou provedores ainda indisponiveis." />
      <Alert severity="info" sx={{ mb: 2 }}>
        Catalogo informativo sincronizado com <code>docs/especificacao/bloqueios-externos.md</code>.
        Nenhuma operacao financeira, fiscal, offline ou de equipamento e simulada nesta tela.
      </Alert>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          label="Buscar bloqueio"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Historia, dependencia ou modulo"
          fullWidth
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlinedIcon /></InputAdornment> }}
        />
        <TextField
          select
          label="Tipo"
          value={status}
          onChange={(event) => setStatus(event.target.value as BlockerStatus | '')}
          sx={{ minWidth: { md: 260 } }}
        >
          <MenuItem value="">Todos</MenuItem>
          {blockerStatuses.map((item) => <MenuItem key={item} value={item}>{statusLabels[item]}</MenuItem>)}
        </TextField>
      </Stack>
      <Typography variant="body2" color="text.secondary" aria-live="polite" sx={{ mb: 2 }}>
        {filtered.length} de {productBlockers.length} bloqueios exibidos
      </Typography>
      <Stack spacing={2}>
        {filtered.map((blocker) => (
          <Card key={blocker.id} component="article">
            <CardContent>
              <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems={{ lg: 'flex-start' }}>
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                    <Chip label={blocker.id} size="small" />
                    {blocker.modules.map((module) => <Chip key={module} label={module} size="small" variant="outlined" />)}
                  </Stack>
                  <BlockedFeatureNotice blocker={blocker} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" gutterBottom>Parte concluida</Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>{blocker.completed}</Typography>
                  <Typography variant="subtitle2" gutterBottom>Parte pendente</Typography>
                  <Typography variant="body2" color="text.secondary">{blocker.pending}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <Alert severity="info">Nenhum bloqueio corresponde aos filtros.</Alert>}
      </Stack>
    </Box>
  );
}
