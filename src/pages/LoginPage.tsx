import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import LocalParkingIcon from '@mui/icons-material/LocalParking';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { useAuth } from '../auth/AuthContext';
import { describeError } from '../api/client';

const MODULES = ['Pátio', 'Eventos', 'Comercial', 'Financeiro', 'Estoque', 'Acesso'] as const;

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loginName, setLoginName] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/app" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(loginName, senha);
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(from ?? '/app', { replace: true });
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' },
        bgcolor: 'background.default',
      }}
    >
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          px: { md: 6, lg: 10 },
          py: 6,
          borderRight: '1px solid',
          borderColor: 'divider',
          background: 'linear-gradient(165deg, #f8fafc 0%, #eef4fb 55%, #e8f0f8 100%)',
        }}
      >
        <Typography variant="h3" sx={{ fontWeight: 700, letterSpacing: -0.8, maxWidth: 520, lineHeight: 1.15 }}>
          Bem-vindo ao{' '}
          <Box component="span" sx={{ color: 'primary.main' }}>
            Estacionamento Kaneko
          </Box>
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2, maxWidth: 480, lineHeight: 1.6 }}>
          Operação de pátio, eventos, compras e financeiro no mesmo contexto organizacional.
          Decisões com dados reais da API — sem inventar indicadores.
        </Typography>

        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 5, mb: 3 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <LocalParkingIcon />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} lineHeight={1.1}>
              Kaneko
            </Typography>
            <Typography variant="caption" color="text.secondary" letterSpacing={0.6} textTransform="uppercase">
              Hub operacional
            </Typography>
          </Box>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 1.25,
            maxWidth: 420,
          }}
        >
          {MODULES.map((label) => (
            <Box
              key={label}
              sx={{
                px: 1.5,
                py: 1.25,
                borderRadius: 2,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                textAlign: 'center',
              }}
            >
              <Typography variant="body2" fontWeight={600}>
                {label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          placeItems: 'center',
          px: { xs: 2, sm: 4 },
          py: { xs: 4, md: 6 },
        }}
      >
        <Card sx={{ width: '100%', maxWidth: 420, boxShadow: '0 10px 40px rgba(15,23,42,0.06)' }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Stack spacing={0.75} sx={{ mb: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <LocalParkingIcon color="primary" />
                <Typography variant="subtitle2" fontWeight={700}>
                  Kaneko
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Hub operacional
                </Typography>
              </Stack>
              <Typography variant="h5" component="h1">
                Acesse sua conta
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Entre com seu login e senha para continuar.
              </Typography>
            </Stack>

            <Box component="form" onSubmit={submit}>
              <Stack spacing={2}>
                {error && <Alert severity="error">{error}</Alert>}
                <TextField
                  label="Login"
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  autoFocus
                  required
                  fullWidth
                  size="medium"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutlineOutlinedIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="Senha"
                  type={showPassword ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  fullWidth
                  size="medium"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                          aria-pressed={showPassword}
                          onClick={() => setShowPassword((visible) => !visible)}
                        >
                          {showPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading}
                  endIcon={loading ? <CircularProgress size={18} color="inherit" /> : <ArrowForwardOutlinedIcon />}
                  sx={{ mt: 0.5, minHeight: 44 }}
                >
                  Entrar
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
