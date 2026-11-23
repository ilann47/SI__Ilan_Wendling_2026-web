import { Button, type ButtonProps } from '@mui/material';

/** CTA com a variante primária em cápsula do tema, mantendo as métricas da listagem. */
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
