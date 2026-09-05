import { Button, type ButtonProps } from '@mui/material';

export function PrimaryButton({ children, sx, ...props }: ButtonProps) {
  return (
    <Button
      variant="contained"
      color="primary"
      sx={{ px: 2.25, minHeight: 42, borderRadius: 2.5, ...((sx as object) ?? {}) }}
      {...props}
    >
      {children}
    </Button>
  );
}
