import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import { useAuth } from '../auth/AuthContext';
import { getApiProblem, getHttpStatus } from '../api/client';
import { BrandMark } from '../components/brand/BrandMark';
import { getThemeTokens } from '../theme/hubTokens';
import { useColorMode } from '../context/ColorModeContext';

const PURPLE = '#6B46FE';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldKey = 'nome' | 'login' | 'email' | 'senha' | 'confirmacao';
type FieldErrors = Partial<Record<FieldKey, string>>;

const FIELD_ORDER: FieldKey[] = ['nome', 'login', 'email', 'senha', 'confirmacao'];
const KNOWN_API_FIELDS = ['nome', 'login', 'email', 'senha'] as const;

function PasswordRule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <ListItem dense disableGutters sx={{ py: 0.15 }}>
      <ListItemIcon sx={{ minWidth: 28 }}>
        {ok ? (
          <CheckCircleOutlineIcon sx={{ fontSize: 18, color: 'success.main' }} />
        ) : (
          <RadioButtonUncheckedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
        )}
      </ListItemIcon>
      <ListItemText
        primary={label}
        primaryTypographyProps={{
          fontSize: '0.78rem',
          fontWeight: ok ? 700 : 500,
          color: ok ? 'success.main' : 'text.secondary',
        }}
      />
    </ListItem>
  );
}

export function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const { mode, toggle } = useColorMode();
  const colors = getThemeTokens(mode);
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [loginName, setLoginName] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const fieldRefs = useRef<Partial<Record<FieldKey, HTMLInputElement | null>>>({});

  const passwordRules = useMemo(() => ({
    min: senha.length >= 8,
    max: senha.length <= 72 && senha.length > 0,
    match: confirmacao.length > 0 && senha === confirmacao,
  }), [senha, confirmacao]);

  const focusFirstInvalid = (errors: FieldErrors) => {
    const first = FIELD_ORDER.find((key) => errors[key]);
    if (!first) return;
    queueMicrotask(() => fieldRefs.current[first]?.focus());
  };

  const clearPasswords = () => {
    setSenha('');
    setConfirmacao('');
  };

  if (isAuthenticated) return <Navigate to="/app" replace />;

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
      bgcolor: colors.card,
      minHeight: 48,
      '& fieldset': { borderColor: colors.border },
      '&:hover fieldset': { borderColor: colors.purpleSoft },
      '&.Mui-focused fieldset': { borderColor: PURPLE, borderWidth: 1.5 },
    },
    '& .MuiInputBase-input': {
      fontSize: '0.92rem',
      color: colors.text,
      '&::placeholder': { color: colors.textMuted, opacity: 1 },
    },
  };

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    const trimmedNome = nome.trim();
    const trimmedLogin = loginName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedNome) errors.nome = 'Informe o nome completo.';
    else if (trimmedNome.length > 120) errors.nome = 'O nome pode ter no máximo 120 caracteres.';

    if (!trimmedLogin) errors.login = 'Informe o login.';
    else if (trimmedLogin.length < 3) errors.login = 'O login deve ter pelo menos 3 caracteres.';
    else if (trimmedLogin.length > 60) errors.login = 'O login pode ter no máximo 60 caracteres.';

    if (!trimmedEmail) errors.email = 'Informe o e-mail.';
    else if (!EMAIL_RE.test(trimmedEmail)) errors.email = 'Informe um e-mail válido.';
    else if (trimmedEmail.length > 120) errors.email = 'O e-mail pode ter no máximo 120 caracteres.';

    if (!senha) errors.senha = 'Informe a senha.';
    else if (senha.length < 8) errors.senha = 'A senha deve ter pelo menos 8 caracteres.';
    else if (senha.length > 72) errors.senha = 'A senha pode ter no máximo 72 caracteres.';

    if (!confirmacao) errors.confirmacao = 'Confirme a senha.';
    else if (senha !== confirmacao) errors.confirmacao = 'A confirmação deve ser igual à senha.';

    return errors;
  };

  const applyProblemDetail = (problem: ReturnType<typeof getApiProblem>) => {
    const next: FieldErrors = {};
    let hasUnknown = false;
    Object.entries(problem?.erros ?? {}).forEach(([key, message]) => {
      if ((KNOWN_API_FIELDS as readonly string[]).includes(key)) {
        next[key as typeof KNOWN_API_FIELDS[number]] = message;
      } else {
        hasUnknown = true;
      }
    });
    setFieldErrors(next);
    if (hasUnknown || Object.keys(next).length === 0) {
      setFormError(
        problem?.detail
        || problem?.title
        || 'Requisição inválida. Verifique os dados informados.',
      );
    } else {
      setFormError('');
      focusFirstInvalid(next);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setFormError('');
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      focusFirstInvalid(errors);
      return;
    }

    setLoading(true);
    try {
      await register({
        nome: nome.trim(),
        login: loginName.trim(),
        email: email.trim(),
        senha,
      });
      navigate('/app', { replace: true });
    } catch (cause) {
      const status = getHttpStatus(cause);
      const problem = getApiProblem(cause);
      if (status === 409) {
        setFieldErrors({});
        setFormError('Login ou e-mail já cadastrado.');
        clearPasswords();
      } else if (status === 400) {
        applyProblemDetail(problem);
        clearPasswords();
      } else {
        setFormError('Não foi possível criar sua conta agora. Tente novamente em alguns instantes.');
        clearPasswords();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: { xs: 'flex-start', md: 'center' },
        bgcolor: colors.background,
        position: 'relative',
        px: 2,
        pt: { xs: 'max(24px, env(safe-area-inset-top))', md: 4 },
        pb: { xs: 'max(24px, env(safe-area-inset-bottom))', md: 4 },
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

      <Box sx={{ mb: 2.5, mt: { xs: 1, md: 0 } }}>
        <BrandMark size={40} showName />
      </Box>

      <Box
        sx={{
          width: '100%',
          maxWidth: 440,
          bgcolor: colors.card,
          borderRadius: '24px',
          px: { xs: 2.5, sm: 4 },
          py: { xs: 3, sm: 4 },
          boxShadow: '0 16px 48px rgba(27, 33, 64, 0.08)',
          border: `1px solid ${colors.border}`,
        }}
      >
        <Typography component="h1" sx={{ fontWeight: 800, fontSize: '1.35rem', color: colors.text, textAlign: 'center' }}>
          Criar conta
        </Typography>
        <Typography sx={{ mt: 0.6, mb: 2.5, textAlign: 'center', color: colors.textMuted, fontSize: '0.88rem' }}>
          Preencha seus dados para acessar o Hub Operacional Kaneko.
        </Typography>

        <Box component="form" onSubmit={submit} noValidate>
          <Typography sx={{ fontWeight: 700, fontSize: '0.84rem', color: colors.text, mb: 0.7 }}>
            Nome completo
          </Typography>
          <TextField
            placeholder="Maria da Silva"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            fullWidth
            required
            autoComplete="name"
            inputRef={(el) => { fieldRefs.current.nome = el; }}
            inputProps={{ 'aria-label': 'Nome completo', maxLength: 120 }}
            error={!!fieldErrors.nome}
            helperText={fieldErrors.nome}
            sx={{ mb: 1.75, ...fieldSx }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <BadgeOutlinedIcon sx={{ fontSize: 20, color: '#B0B7C3' }} />
                </InputAdornment>
              ),
            }}
          />

          <Typography sx={{ fontWeight: 700, fontSize: '0.84rem', color: colors.text, mb: 0.7 }}>
            Login
          </Typography>
          <TextField
            placeholder="maria.silva"
            value={loginName}
            onChange={(e) => setLoginName(e.target.value)}
            fullWidth
            required
            autoComplete="username"
            inputRef={(el) => { fieldRefs.current.login = el; }}
            inputProps={{ 'aria-label': 'Login', maxLength: 60 }}
            error={!!fieldErrors.login}
            helperText={fieldErrors.login}
            sx={{ mb: 1.75, ...fieldSx }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonOutlineOutlinedIcon sx={{ fontSize: 20, color: '#B0B7C3' }} />
                </InputAdornment>
              ),
            }}
          />

          <Typography sx={{ fontWeight: 700, fontSize: '0.84rem', color: colors.text, mb: 0.7 }}>
            E-mail
          </Typography>
          <TextField
            placeholder="maria.silva@example.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            required
            autoComplete="email"
            inputRef={(el) => { fieldRefs.current.email = el; }}
            inputProps={{ 'aria-label': 'E-mail', maxLength: 120 }}
            error={!!fieldErrors.email}
            helperText={fieldErrors.email}
            sx={{ mb: 1.75, ...fieldSx }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MailOutlineIcon sx={{ fontSize: 20, color: '#B0B7C3' }} />
                </InputAdornment>
              ),
            }}
          />

          <Typography sx={{ fontWeight: 700, fontSize: '0.84rem', color: colors.text, mb: 0.7 }}>
            Senha
          </Typography>
          <TextField
            placeholder="Senha segura"
            type={showPassword ? 'text' : 'password'}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            fullWidth
            required
            autoComplete="new-password"
            inputRef={(el) => { fieldRefs.current.senha = el; }}
            inputProps={{ 'aria-label': 'Senha', maxLength: 72 }}
            error={!!fieldErrors.senha}
            helperText={fieldErrors.senha}
            sx={{ mb: 1, ...fieldSx }}
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

          <List dense disablePadding sx={{ mb: 1.5 }} aria-label="Requisitos da senha">
            <PasswordRule ok={passwordRules.min} label="Pelo menos 8 caracteres" />
            <PasswordRule ok={senha.length > 0 && passwordRules.max} label="No máximo 72 caracteres" />
            <PasswordRule ok={passwordRules.match} label="Confirmação igual à senha" />
          </List>

          <Typography sx={{ fontWeight: 700, fontSize: '0.84rem', color: colors.text, mb: 0.7 }}>
            Confirmar senha
          </Typography>
          <TextField
            placeholder="Repita a senha"
            type={showConfirm ? 'text' : 'password'}
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            fullWidth
            required
            autoComplete="new-password"
            inputRef={(el) => { fieldRefs.current.confirmacao = el; }}
            inputProps={{ 'aria-label': 'Confirmar senha', maxLength: 72 }}
            error={!!fieldErrors.confirmacao}
            helperText={fieldErrors.confirmacao}
            sx={{ mb: 1.5, ...fieldSx }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon sx={{ fontSize: 20, color: '#B0B7C3' }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirm((prev) => !prev)}
                    edge="end"
                    size="small"
                    aria-label={showConfirm ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                    aria-pressed={showConfirm}
                    sx={{ color: '#B0B7C3' }}
                  >
                    {showConfirm ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {formError ? (
            <Typography role="alert" sx={{ color: colors.danger, fontSize: '0.82rem', mb: 1.25 }}>
              {formError}
            </Typography>
          ) : null}

          <Button
            type="submit"
            fullWidth
            disabled={loading}
            endIcon={<ArrowForwardRoundedIcon sx={{ fontSize: 20 }} />}
            sx={{
              py: 1.45,
              minHeight: 48,
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
            {loading ? 'Criando conta…' : 'Criar minha conta'}
          </Button>
        </Box>

        <Typography sx={{ mt: 2.25, textAlign: 'center', fontSize: '0.88rem', color: colors.textMuted }}>
          Já possui uma conta?{' '}
          <Link component={RouterLink} to="/login" underline="hover" sx={{ fontWeight: 700, color: PURPLE }}>
            Entrar
          </Link>
        </Typography>
      </Box>
    </Box>
  );
}
