import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined';
import { Alert, Button } from '@mui/material';

interface Props {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: Props) {
  return (
    <Alert
      severity="error"
      role="alert"
      action={onRetry ? (
        <Button color="inherit" size="small" startIcon={<ReplayOutlinedIcon />} onClick={onRetry}>
          Tentar novamente
        </Button>
      ) : undefined}
    >
      {message}
    </Alert>
  );
}
