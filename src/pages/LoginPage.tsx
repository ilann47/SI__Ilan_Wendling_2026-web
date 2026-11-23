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
import { productName } from '../components/brand/brandName';
import { LoginHeroDiagram } from '../components/brand/LoginHeroDiagram';
import { componentRadius, getThemeTokens } from '../theme/hubTokens';
import { useColorMode } from '../context/ColorModeContext';


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

  const requested = (location.state as { from?: { pathname?: string; search?: string; hash?: string } } | null)?.from;
  const destination = requested?.pathname && /^\/app(?:\/|$)/.test(requested.pathname)
    ? requested.pathname + (requested.search ?? '') + (requested.hash ?? '') : '/app';
  if (isAuthenticated) return <Navigate to={destination} replace />;

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: `${componentRadius.control}px`,
      bgcolor: colors.card,
      height: 48,
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
      navigate(destination, { replace: true });
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
        background: colors.background,
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
        aria-label={`Identidade ${productName}`}
        sx={{
          flex: { md: 1.15 },
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          px: { md: 6, lg: 8 },
          py: { md: 6 },
          bgcolor: colors.masthead,
          color: colors.onMasthead,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""', position: 'absolute', width: 440, height: 272, borderRadius: '32px',
            right: -156, top: -78, transform: 'rotate(-22deg)', border: `1px solid ${colors.mastheadLine}`,
            boxShadow: `0 0 0 24px ${colors.mastheadHover}, inset 0 0 0 14px ${colors.mastheadHover}`,
          },
          '&::after': {
            content: '""', position: 'absolute', width: 380, height: 250, borderRadius: '28px',
            left: -172, bottom: -164, transform: 'rotate(-22deg)', border: `1px solid ${colors.mastheadLine}`,
            boxShadow: `0 0 0 20px ${colors.mastheadHover}`,
          },
          '& > *': { position: 'relative', zIndex: 1 },
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 5 }}>
            <BrandMark size={44} showName inverted />
          </Box>
          <Typography sx={{ fontWeight: 750, fontSize: { md: '2.3rem', lg: '2.75rem' }, color: '#FFFFFF', lineHeight: 1.08, maxWidth: 520 }}>
            Operação clara.<br />Decisões rápidas.
          </Typography>
          <Typography
            component="h1"
            sx={{
              fontWeight: 700,
              fontSize: { md: '1.15rem', lg: '1.3rem' },
              color: '#F1C3F2',
              lineHeight: 1.2,
              mt: 1.5,
              mb: 2,
            }}
          >
            Hub Operacional {productName}
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
                  <Icon sx={{ fontSize: 20, color: '#F1C3F2' }} />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: '0.82rem', color: '#FFFFFF' }}>
                    {item.title}
                  </Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: colors.onMastheadMuted, lineHeight: 1.4 }}>
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
          bgcolor: colors.masthead, color: colors.onMasthead,
          position: 'relative', overflow: 'hidden',
          '&::after': { content: '""', position: 'absolute', width: 180, height: 104, borderRadius: '20px', right: -48, top: -52, transform: 'rotate(-22deg)', border: `1px solid ${colors.mastheadLine}`, boxShadow: `0 0 0 10px ${colors.mastheadHover}` },
        }}>
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <BrandMark size={42} showName inverted />
          </Box>
        </Box>
        <Box
          sx={{
            width: '100%',
            maxWidth: 420,
            bgcolor: colors.card,
            borderRadius: `${componentRadius.surface}px`,
            px: { xs: 2.75, sm: 4 },
            py: { xs: 3.5, sm: 4.25 },
            boxShadow: colors.raisedShadow,
            border: `1px solid ${colors.border}`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center', mb: 2.25 }}>
            <BrandMark size={44} showName />
          </Box>
          <Typography sx={{ fontWeight: 750, fontSize: { xs: '1.55rem', sm: '1.7rem' }, color: colors.text, textAlign: 'left', letterSpacing: -0.5 }}>
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
                    <PersonOutlineOutlinedIcon sx={{ fontSize: 20, color: colors.textMuted }} />
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
                    <LockOutlinedIcon sx={{ fontSize: 20, color: colors.textMuted }} />
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
                      sx={{ color: colors.textMuted }}
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
              variant="contained"
              fullWidth
              disabled={loading}
              aria-busy={loading}
              aria-label={loading ? 'Entrando…' : undefined}
              startIcon={loading ? <CircularProgress size={18} thickness={5} color="inherit" aria-label="Autenticando" /> : undefined}
              endIcon={loading ? undefined : <ArrowForwardRoundedIcon sx={{ fontSize: 20 }} />}
              sx={{
                py: 1.45,
                fontWeight: 600,
                fontSize: '0.98rem',
                textTransform: 'none',
                boxShadow: 'none',
              }}
            >
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </Box>

          <Typography sx={{ mt: 2.25, py: 0.9, px: 1, borderRadius: `${componentRadius.control}px`, bgcolor: colors.panelHeader, textAlign: 'center', fontSize: '0.88rem', color: colors.textMuted }}>
            Não possui uma conta?{' '}
            <Link component={RouterLink} to="/register" underline="hover" sx={{ fontWeight: 700, color: colors.purple }}>
              Criar conta
            </Link>
          </Typography>
        </Box>

        <Typography sx={{ mt: 2.5, fontSize: '0.72rem', color: colors.textMuted, textAlign: 'center' }}>
          {productName}
        </Typography>
        <Typography sx={{ mt: 0.4, fontSize: '0.72rem', color: colors.textMuted, textAlign: 'center' }}>
          © {new Date().getFullYear()} {productName} · Hub operacional
        </Typography>
      </Box>
    </Box>
  );
}
