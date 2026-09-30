import { Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import type { DocumentOriginLink } from '../crud/resourceConfig';

export function DocumentOriginLinks({ row, links, permissions }: {
  row: Record<string, unknown>; links: DocumentOriginLink[]; permissions: readonly string[];
}) {
  const available = links.flatMap((link) => {
    const id = Number(row[link.field]);
    if (!Number.isSafeInteger(id) || id <= 0 || !link.permissions.every((permission) => permissions.includes(permission))) return [];
    return [{ ...link, id }];
  });
  if (!available.length) return null;
  return <Stack spacing={1}>
    <Typography variant="overline" color="text.secondary">Documento de origem</Typography>
    {available.map((link) => <Link component={RouterLink} key={link.field}
      to={`${link.path}?detail=${link.id}`}>{link.label}</Link>)}
  </Stack>;
}
