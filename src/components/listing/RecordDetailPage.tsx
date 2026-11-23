import { Card, Stack } from '@mui/material';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { PageHeader } from '../common/PageHeader';

interface Props {
  title: string;
  subtitle?: string;
  onBack: () => void;
  actions?: ReactNode;
  presentingForm?: boolean;
  children: ReactNode;
}

/** Consultas completas ocupam a página. Operações pontuais continuam em AppDialog. */
export function RecordDetailPage({ title, subtitle, onBack, actions, presentingForm, children }: Props) {
  const headingId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);

  return (
    <section aria-labelledby={presentingForm ? undefined : headingId}>
      {!presentingForm && <PageHeader title={title} titleId={headingId} titleRef={heading} subtitle={subtitle} onBack={onBack} action={actions} />}
      <Card variant={presentingForm ? 'elevation' : 'outlined'} elevation={0}
        sx={presentingForm ? { bgcolor: 'transparent', overflow: 'visible' } : { p: { xs: 2, md: 3 } }}>
        <Stack spacing={2.5} sx={{ minWidth: 0, '& > *': { minWidth: 0 } }}>{children}</Stack>
      </Card>
    </section>
  );
}
