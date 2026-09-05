import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import { useAuth } from '../auth/AuthContext';
import { describeError } from '../api/client';
import { BrandMark } from '../components/brand/BrandMark';
import { LoginHeroDiagram } from '../components/brand/LoginHeroDiagram';
import { getThemeTokens } from '../theme/hubTokens';
import { useColorMode } from '../context/ColorModeContext';

const PURPLE = '#6B46FE';

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const { mode, toggle } = useColorMode();
  const colors = getThemeTokens(mode);
  const navigate = useNavigate();
  const location = useLocation();
  const [loginName, setLoginName] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/app" replace />;

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
      bgcolor: colors.card,
      height: 48,
      '& fieldset': { borderColor: colors.border },
      '&:hover fieldset': { borderColor: colors.purpleSoft },
      '&.Mui-focused fieldset': { borderColor: PURPLE, borderWidth: 1.5 },
    },
    '& .MuiInputBase-input': {
      fontSize: '0.92rem',
      color: colors.text,
      backgroundColor: 'transparent',
      '&::placeholder': { color: colors.textMuted, opacity: 1 },
    },
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!loginName.trim() || !senha.trim()) {
      setError('Informe usuário e senha para continuar.');
      return;
    }
    setLoading(true);
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

  const features = [
    { icon: ShieldOutlinedIcon, title: 'Segurança', desc: 'Dados protegidos com criptografia' },
    { icon: CloudOutlinedIcon, title: 'Confiabilidade', desc: 'Infraestrutura operacional estável' },
    { icon: BoltOutlinedIcon, title: 'Performance', desc: 'Busca rápida entre módulos permitidos' },
    { icon: LockOutlinedIcon, title: 'Acesso contextual por organização', desc: 'JWT e permissões pelo tenant ativo' },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        bgcolor: colors.background,
        position: 'relative',
      }}
    >
      <Box sx={{ position: 'absolute', top: 14, right: 14, zIndex: 4 }}>
        <IconButton
          onClick={toggle}
          size="small"
          sx={{ color: '#9AA3B2' }}
          aria-label={mode === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
        >
          {mode === 'light' ? <DarkModeOutlinedIcon sx={{ fontSize: 18 }} /> : <LightModeOutlinedIcon sx={{ fontSize: 18 }} />}
        </IconButton>
      </Box>

      <Box
        sx={{
          flex: { md: 1.15 },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          px: { xs: 3, md: 6, lg: 8 },
          py: { xs: 4, md: 6 },
          background:
            mode === 'dark'
              ? 'linear-gradient(165deg, #161B32 0%, #1B2140 55%, #0F1324 100%)'
              : 'linear-gradient(165deg, #F6F1FF 0%, #EEF4FF 55%, #F7F8FC 100%)',
        }}
      >
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: { md: '2rem', lg: '2.35rem' }, color: colors.text, lineHeight: 1.15 }}>
            Bem-vindo ao
          </Typography>
          <Typography
            component="h1"
            sx={{
              fontWeight: 800,
              fontSize: { md: '2rem', lg: '2.35rem' },
              color: PURPLE,
              lineHeight: 1.15,
              mb: 1.5,
            }}
          >
            Hub Operacional Kaneko
          </Typography>
          <Typography sx={{ maxWidth: 460, color: colors.textMuted, fontSize: '0.95rem', lineHeight: 1.55, mb: 3 }}>
            Centralize seus processos, conecte áreas e tome decisões mais inteligentes.
            Tudo o que você precisa, em um só lugar para operar sua empresa com eficiência.
          </Typography>
          <BrandMark size={56} showName />
        </Box>

        <LoginHeroDiagram />

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, maxWidth: 560 }}>
          {features.map((item) => {
            const Icon = item.icon;
            return (
              <Box key={item.title} sx={{ display: 'flex', gap: 1.1, alignItems: 'flex-start' }}>
                <Icon sx={{ fontSize: 20, color: PURPLE, mt: 0.15 }} />
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: '0.82rem', color: colors.text }}>
                    {item.title}
                  </Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: colors.textMuted, lineHeight: 1.35 }}>
                    {item.desc}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>

      <Box
        sx={{
          flex: { md: 0.85 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
          py: { xs: 6, md: 4 },
          bgcolor: colors.background,
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 420,
            bgcolor: colors.card,
            borderRadius: '24px',
            px: { xs: 2.75, sm: 4 },
            py: { xs: 3.5, sm: 4.25 },
            boxShadow: '0 16px 48px rgba(27, 33, 64, 0.08)',
            border: `1px solid ${colors.border}`,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2.25 }}>
            <BrandMark size={44} showName />
          </Box>
          <Typography sx={{ fontWeight: 800, fontSize: '1.35rem', color: colors.text, textAlign: 'center' }}>
            Acesse sua conta
          </Typography>
          <Typography sx={{ mt: 0.6, mb: 3, textAlign: 'center', color: colors.textMuted, fontSize: '0.88rem' }}>
            Entre com seu login e senha para continuar.
          </Typography>

          <Box component="form" onSubmit={submit} noValidate>
            <Typography sx={{ fontWeight: 700, fontSize: '0.84rem', color: colors.text, mb: 0.7 }}>
              Login
            </Typography>
            <TextField
              placeholder="seu usuário"
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              fullWidth
              autoFocus
              required
              autoComplete="username"
              inputProps={{ 'aria-label': 'Login' }}
              sx={{ mb: 2, ...fieldSx }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlineOutlinedIcon sx={{ fontSize: 20, color: '#B0B7C3' }} />
                  </InputAdornment>
                ),
              }}
            />

            <Typography sx={{ fontWeight: 700, fontSize: '0.84rem', color: colors.text, mb: 0.7 }}>
              Senha
            </Typography>
            <TextField
              placeholder="Sua senha"
              type={showPassword ? 'text' : 'password'}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              fullWidth
              required
              autoComplete="current-password"
              inputProps={{ 'aria-label': 'Senha' }}
              sx={{ mb: 1.25, ...fieldSx }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon sx={{ fontSize: 20, color: '#B0B7C3' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((prev) => !prev)}
                      edge="end"
                      size="small"
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      aria-pressed={showPassword}
                      sx={{ color: '#B0B7C3' }}
                    >
                      {showPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {error ? (
              <Typography sx={{ color: colors.danger, fontSize: '0.82rem', mb: 1.25 }}>
                {error}
              </Typography>
            ) : null}

            <Button
              type="submit"
              fullWidth
              disabled={loading}
              endIcon={<ArrowForwardRoundedIcon sx={{ fontSize: 20 }} />}
              sx={{
                py: 1.45,
                fontWeight: 700,
                fontSize: '0.98rem',
                color: '#fff',
                borderRadius: '12px',
                textTransform: 'none',
                bgcolor: PURPLE,
                boxShadow: 'none',
                '&:hover': { bgcolor: '#5B3AE8', boxShadow: 'none' },
                '&.Mui-disabled': { color: '#fff', bgcolor: PURPLE, opacity: 0.65 },
              }}
            >
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </Box>
        </Box>

        <Typography sx={{ mt: 2.5, fontSize: '0.72rem', color: colors.textMuted, textAlign: 'center' }}>
          Estacionamento Kaneko
        </Typography>
        <Typography sx={{ mt: 0.4, fontSize: '0.72rem', color: colors.textMuted, textAlign: 'center' }}>
          © {new Date().getFullYear()} Kaneko · Hub operacional
        </Typography>
      </Box>
    </Box>
  );
}
