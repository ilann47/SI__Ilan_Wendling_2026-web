import { Button, type ButtonProps } from '@mui/material';

/** CTA alinhado ao MuiButton do Hub (radius 10 via tema). */
export function PrimaryButton({ children, sx, ...props }: ButtonProps) {
  return (
    <Button
      variant="contained"
      color="primary"
      sx={{ px: 2.25, minHeight: 40, ...((sx as object) ?? {}) }}
      {...props}
    >
      {children}
    </Button>
  );
}
