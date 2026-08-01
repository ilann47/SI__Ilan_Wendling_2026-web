import { useRef, useState, type FormEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined';
import { api, describeError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { PageHeader } from '../components/common/PageHeader';

interface AccessResponse {
  accessAttemptId: number;
  decision: 'AUTORIZADA' | 'RECUSADA';
  reasonCode: string;
  credentialId?: number;
  presenceId?: number;
  parkingSessionId?: number;
  resultingOccupancy?: number;
  credentialStatus?: string;
  decidedAt: string;
  barrierCommandRequested: boolean;
}

type Direction = 'check-ins' | 'check-outs';

export function EventAccessPage() {
  const { permissions } = useAuth();
  const [qrToken, setQrToken] = useState('');
  const [eventId, setEventId] = useState('');
  const [parkingFacilityId, setParkingFacilityId] = useState('');
  const [lane, setLane] = useState('PORTAO_PRINCIPAL');
  const [loading, setLoading] = useState<Direction | null>(null);
  const [result, setResult] = useState<AccessResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const retry = useRef<{ fingerprint: string; key: string } | null>(null);

  const canCheckin = permissions.includes('access:checkin');
  const canCheckout = permissions.includes('access:checkout');

  const submit = async (direction: Direction) => {
    const payload = {
      qrToken: qrToken.trim(),
      eventId: Number(eventId),
      parkingFacilityId: Number(parkingFacilityId),
      lane: lane.trim(),
    };
    const fingerprint = JSON.stringify({ direction, ...payload });
    if (retry.current?.fingerprint !== fingerprint) {
      retry.current = { fingerprint, key: crypto.randomUUID() };
    }
    const idempotencyKey = retry.current.key;
    setLoading(direction);
    setError(null);
    setResult(null);
    try {
      const { data } = await api.post<AccessResponse>(`/api/v1/${direction}`, payload, {
        headers: { 'Idempotency-Key': idempotencyKey },
      });
      setResult(data);
    } catch (cause) {
      setError(describeError(cause));
    } finally {
      setLoading(null);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (canCheckin) void submit('check-ins');
  };

  const newReading = () => {
    setQrToken('');
    setResult(null);
    setError(null);
    retry.current = null;
  };

  if (!canCheckin && !canCheckout) {
    return <Alert severity="warning">Seu contexto não possui permissão de acesso.</Alert>;
  }

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <PageHeader
        title="Acesso de eventos"
        subtitle="Validação QR online. Nenhum comando de cancela é enviado por esta tela."
      />
      <Card>
        <CardContent>
          <Box component="form" onSubmit={onSubmit}>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label="QR da credencial"
                type="password"
                autoComplete="off"
                value={qrToken}
                onChange={(event) => setQrToken(event.target.value)}
                required
                autoFocus
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="ID do evento"
                  type="number"
                  value={eventId}
                  onChange={(event) => setEventId(event.target.value)}
                  inputProps={{ min: 1 }}
                  required
                  fullWidth
                />
                <TextField
                  label="ID do pátio"
                  type="number"
                  value={parkingFacilityId}
                  onChange={(event) => setParkingFacilityId(event.target.value)}
                  inputProps={{ min: 1 }}
                  required
                  fullWidth
                />
              </Stack>
              <TextField
                label="Faixa/portão"
                value={lane}
                onChange={(event) => setLane(event.target.value)}
                inputProps={{ maxLength: 80 }}
                required
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                {canCheckin && (
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading !== null}
                    startIcon={loading === 'check-ins'
                      ? <CircularProgress size={18} color="inherit" />
                      : <LoginOutlinedIcon />}
                    fullWidth
                  >
                    Registrar entrada
                  </Button>
                )}
                {canCheckout && (
                  <Button
                    type="button"
                    variant="outlined"
                    color="secondary"
                    onClick={() => void submit('check-outs')}
                    disabled={loading !== null || !qrToken || !eventId || !parkingFacilityId || !lane}
                    startIcon={loading === 'check-outs'
                      ? <CircularProgress size={18} color="inherit" />
                      : <LogoutOutlinedIcon />}
                    fullWidth
                  >
                    Registrar saída
                  </Button>
                )}
              </Stack>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {result && (
        <Card sx={{ mt: 2, borderLeft: 6, borderColor: result.decision === 'AUTORIZADA'
          ? 'success.main'
          : 'error.main' }}>
          <CardContent>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Decisão</Typography>
                <Chip
                  color={result.decision === 'AUTORIZADA' ? 'success' : 'error'}
                  label={result.decision}
                />
              </Stack>
              <Typography><strong>Motivo:</strong> {result.reasonCode}</Typography>
              <Typography><strong>Tentativa:</strong> {result.accessAttemptId}</Typography>
              {result.resultingOccupancy !== undefined && (
                <Typography><strong>Ocupação resultante:</strong> {result.resultingOccupancy}</Typography>
              )}
              {result.credentialStatus && (
                <Typography><strong>Credencial:</strong> {result.credentialStatus}</Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                Comando de cancela: {result.barrierCommandRequested ? 'solicitado' : 'não solicitado'}
              </Typography>
              <Button
                onClick={newReading}
                startIcon={<RestartAltOutlinedIcon />}
                sx={{ alignSelf: 'flex-start' }}
              >
                Nova leitura
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
