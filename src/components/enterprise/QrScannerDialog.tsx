import CameraswitchOutlinedIcon from '@mui/icons-material/CameraswitchOutlined';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';

interface DetectedBarcode { rawValue?: string }
interface NativeBarcodeDetector {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
}
interface BarcodeDetectorConstructor {
  new(options: { formats: string[] }): NativeBarcodeDetector;
}

interface QrScannerDialogProps {
  open: boolean;
  onClose: () => void;
  onScan: (value: string) => void;
}

export function QrScannerDialog({ open, onClose, onScan }: QrScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    let stream: MediaStream | null = null;
    let video: HTMLVideoElement | null = null;
    let frame = 0;
    let stopped = false;

    const start = async () => {
      setError(null);
      const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
      if (!Detector || !navigator.mediaDevices?.getUserMedia) {
        setError('Leitura por camera nao e suportada neste navegador. Digite ou cole o token QR.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (stopped || !videoRef.current) return;
        video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        const detector = new Detector({ formats: ['qr_code'] });
        const scan = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const value = codes.find((code) => code.rawValue)?.rawValue;
            if (value) {
              stopped = true;
              onScan(value);
              onClose();
              return;
            }
          } catch {
            // Frames ainda nao prontos sao ignorados; o proximo tenta novamente.
          }
          frame = requestAnimationFrame(() => void scan());
        };
        frame = requestAnimationFrame(() => void scan());
      } catch {
        setError('Nao foi possivel acessar a camera. Verifique a permissao do navegador.');
      }
    };
    void start();
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
      if (video) video.srcObject = null;
    };
  }, [onClose, onScan, open]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Escanear credencial</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Aponte a camera para o QR. A imagem nao e enviada nem armazenada.
          </Typography>
          {error && <Alert severity="warning">{error}</Alert>}
          <video ref={videoRef} muted playsInline aria-label="Camera para leitura QR" style={{ width: '100%', minHeight: 240, borderRadius: 12, background: '#111', objectFit: 'cover' }} />
        </Stack>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Fechar</Button></DialogActions>
    </Dialog>
  );
}

export function QrScannerButton({ onScan }: { onScan: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return <>
    <Button variant="outlined" startIcon={<CameraswitchOutlinedIcon />} onClick={() => setOpen(true)}>
      Ler com camera
    </Button>
    <QrScannerDialog open={open} onClose={close} onScan={onScan} />
  </>;
}
