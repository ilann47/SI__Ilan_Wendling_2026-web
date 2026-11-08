import { useRef, useState, type FormEvent } from 'react';
import { Link as RouterLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Link,
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
import LocalParkingOutlinedIcon from '@mui/icons-material/LocalParkingOutlined';
import QrCodeScannerOutlinedIcon from '@mui/icons-material/QrCodeScannerOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import { useAuth } from '../auth/AuthContext';
import { describeError } from '../api/client';
import { BrandMark } from '../components/brand/BrandMark';
import { HexMark } from '../components/brand/HexMark';
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
  const [fieldErrors, setFieldErrors] = useState<{ login?: string; senha?: string }>({});
  const [capsLock, setCapsLock] = useState(false);
  const [loading, setLoading] = useState(false);
  const loginInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

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
    const normalizedLogin = loginName.trim();
    const validationErrors = {
      ...(!normalizedLogin ? { login: 'Informe seu login.' } : {}),
      ...(!senha ? { senha: 'Informe sua senha.' } : {}),
    };
    setFieldErrors(validationErrors);
    if (validationErrors.login || validationErrors.senha) {
      if (validationErrors.login) loginInputRef.current?.focus();
      else passwordInputRef.current?.focus();
      return;
    }
    setLoading(true);
    try {
      await login(normalizedLogin, senha);
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(from ?? '/app', { replace: true });
    } catch (err) {
      setError(describeError(err, { context: 'login' }));
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: LocalParkingOutlinedIcon, title: 'Pátio em tempo real', desc: 'Entradas, saídas e ocupação do estacionamento' },
    { icon: QrCodeScannerOutlinedIcon, title: 'Controle de acesso', desc: 'Validação de credenciais e check-in de eventos' },
    { icon: EventOutlinedIcon, title: 'Eventos e vagas', desc: 'Instalações, setores e ofertas por evento' },
    { icon: BusinessOutlinedIcon, title: 'Acesso contextual por organização', desc: 'JWT e permissões pelo tenant ativo' },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        background: mode === 'dark'
          ? colors.background
          : 'radial-gradient(circle at 85% 12%, rgba(107,70,254,0.12), transparent 28%), #F7F8FC',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ position: 'absolute', top: 14, right: 14, zIndex: 4 }}>
        <IconButton
          onClick={toggle}
          size="small"
          sx={{ color: { xs: '#FFFFFF', md: colors.textMuted }, bgcolor: { xs: 'rgba(255,255,255,0.12)', md: 'transparent' }, '&:hover': { bgcolor: { xs: 'rgba(255,255,255,0.2)', md: colors.brandHover } } }}
          aria-label={mode === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
        >
          {mode === 'light' ? <DarkModeOutlinedIcon sx={{ fontSize: 18 }} /> : <LightModeOutlinedIcon sx={{ fontSize: 18 }} />}
        </IconButton>
      </Box>

      <Box
        role="region"
        aria-label="Identidade Kaneko"
        sx={{
          flex: { md: 1.15 },
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          px: { md: 6, lg: 8 },
          py: { md: 6 },
          background: 'linear-gradient(145deg, #11162E 0%, #25205B 48%, #5B38D6 100%)',
          color: '#FFFFFF',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""', position: 'absolute', width: 420, height: 420, borderRadius: '50%',
            right: -160, top: -150, background: 'rgba(255,255,255,0.08)',
          },
          '&::after': {
            content: '""', position: 'absolute', width: 260, height: 260, borderRadius: '50%',
            left: -100, bottom: -110, background: 'rgba(139,111,255,0.22)',
          },
          '& > *': { position: 'relative', zIndex: 1 },
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 5 }}>
            <HexMark size={44} />
            <Box>
              <Typography sx={{ fontWeight: 850, fontSize: '1.05rem', lineHeight: 1.1 }}>Kaneko</Typography>
              <Typography sx={{ mt: 0.35, fontSize: '0.64rem', letterSpacing: 1.8, textTransform: 'uppercase', color: 'rgba(255,255,255,0.68)' }}>Hub operacional</Typography>
            </Box>
          </Box>
          <Typography sx={{ fontWeight: 750, fontSize: { md: '2.3rem', lg: '2.75rem' }, color: '#FFFFFF', lineHeight: 1.08, maxWidth: 520 }}>
            Operação clara.<br />Decisões rápidas.
          </Typography>
          <Typography
            component="h1"
            sx={{
              fontWeight: 700,
              fontSize: { md: '1.15rem', lg: '1.3rem' },
              color: '#BFB2FF',
              lineHeight: 1.2,
              mt: 1.5,
              mb: 2,
            }}
          >
            Hub Operacional Kaneko
          </Typography>
          <Typography sx={{ maxWidth: 500, color: 'rgba(255,255,255,0.72)', fontSize: '0.98rem', lineHeight: 1.65 }}>
            Opere pátio, acessos, mensalistas, eventos e cobrança no mesmo hub —
            com contexto por organização e só com dados reais da operação.
          </Typography>
        </Box>

        <LoginHeroDiagram />

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, maxWidth: 560 }}>
          {features.map((item) => {
            const Icon = item.icon;
            return (
              <Box key={item.title} sx={{ display: 'flex', gap: 1.1, alignItems: 'flex-start' }}>
                <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.1)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Icon sx={{ fontSize: 20, color: '#C9C0FF' }} />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: '0.82rem', color: '#FFFFFF' }}>
                    {item.title}
                  </Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
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
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: { xs: 'flex-start', md: 'center' },
          px: 2,
          pt: { xs: 0, md: 4 },
          pb: { xs: 'max(24px, env(safe-area-inset-bottom))', md: 4 },
          bgcolor: 'transparent',
          minHeight: { xs: '100dvh', md: 'auto' },
        }}
      >
        <Box sx={{
          display: { xs: 'flex', md: 'none' }, alignItems: 'center', width: 'calc(100% + 32px)',
          px: 3, pt: 'max(28px, env(safe-area-inset-top))', pb: 4.5, mb: -2,
          background: 'linear-gradient(135deg, #171A39 0%, #5B38D6 100%)', color: '#FFFFFF',
          borderRadius: '0 0 32px 32px', position: 'relative', overflow: 'hidden',
          '&::after': { content: '""', position: 'absolute', width: 180, height: 180, borderRadius: '50%', right: -80, top: -90, bgcolor: 'rgba(255,255,255,0.1)' },
        }}>
          <HexMark size={42} />
          <Box sx={{ ml: 1.25, position: 'relative', zIndex: 1 }}>
            <Typography sx={{ fontWeight: 850, fontSize: '1.05rem', lineHeight: 1.1 }}>Kaneko</Typography>
            <Typography sx={{ mt: 0.3, fontSize: '0.64rem', letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)' }}>Hub operacional</Typography>
          </Box>
        </Box>
        <Box
          sx={{
            width: '100%',
            maxWidth: 420,
            bgcolor: colors.card,
            borderRadius: { xs: '28px', md: '28px' },
            px: { xs: 2.75, sm: 4 },
            py: { xs: 3.5, sm: 4.25 },
            boxShadow: '0 24px 70px rgba(27, 33, 64, 0.14)',
            border: `1px solid ${colors.border}`,
            position: 'relative',
            overflow: 'hidden',
            '&::before': { content: '""', position: 'absolute', inset: '0 0 auto 0', height: 4, background: colors.brandGradient },
          }}
        >
          <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center', mb: 2.25 }}>
            <BrandMark size={44} showName />
          </Box>
          <Typography sx={{ fontWeight: 850, fontSize: { xs: '1.55rem', sm: '1.7rem' }, color: colors.text, textAlign: 'left', letterSpacing: -0.5 }}>
            Acesse sua conta
          </Typography>
          <Typography sx={{ mt: 0.6, mb: 3, textAlign: 'left', color: colors.textMuted, fontSize: '0.9rem' }}>
            Entre com seu login e senha para continuar.
          </Typography>

          <Box component="form" onSubmit={submit} noValidate>
            <Typography sx={{ fontWeight: 700, fontSize: '0.84rem', color: colors.text, mb: 0.7 }}>
              Login
            </Typography>
            <TextField
              placeholder="seu usuário"
              value={loginName}
              onChange={(e) => {
                setLoginName(e.target.value);
                setError('');
                if (fieldErrors.login) setFieldErrors((current) => ({ ...current, login: undefined }));
              }}
              fullWidth
              autoFocus
              required
              autoComplete="username"
              inputRef={loginInputRef}
              error={!!fieldErrors.login}
              helperText={fieldErrors.login}
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
              onChange={(e) => {
                setSenha(e.target.value);
                setError('');
                if (fieldErrors.senha) setFieldErrors((current) => ({ ...current, senha: undefined }));
              }}
              onKeyDown={(event) => setCapsLock(event.getModifierState('CapsLock'))}
              onKeyUp={(event) => setCapsLock(event.getModifierState('CapsLock'))}
              fullWidth
              required
              autoComplete="current-password"
              inputRef={passwordInputRef}
              error={!!fieldErrors.senha}
              helperText={fieldErrors.senha || (capsLock ? 'Caps Lock está ativado.' : undefined)}
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
              <Typography
                role="alert"
                sx={{
                  color: colors.danger,
                  fontSize: '0.82rem',
                  mb: 1.25,
                  whiteSpace: 'pre-line',
                }}
              >
                {error}
              </Typography>
            ) : null}

            <Button
              type="submit"
              fullWidth
              disabled={loading}
              aria-busy={loading}
              aria-label={loading ? 'Entrando…' : undefined}
              startIcon={loading ? <CircularProgress size={18} thickness={5} color="inherit" aria-label="Autenticando" /> : undefined}
              endIcon={loading ? undefined : <ArrowForwardRoundedIcon sx={{ fontSize: 20 }} />}
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

          <Typography sx={{ mt: 2.25, textAlign: 'center', fontSize: '0.88rem', color: colors.textMuted }}>
            Não possui uma conta?{' '}
            <Link component={RouterLink} to="/register" underline="hover" sx={{ fontWeight: 700, color: PURPLE }}>
              Criar conta
            </Link>
          </Typography>
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
