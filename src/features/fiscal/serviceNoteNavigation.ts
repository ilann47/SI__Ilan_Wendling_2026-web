export const serviceNotesPath = '/app/notas-servico';

export function serviceNoteListSearch(search: string | URLSearchParams) {
  const params = new URLSearchParams(search);
  for (const key of ['aba', 'detail', 'formulario']) params.delete(key);
  return params.size ? `?${params.toString()}` : '';
}

export const serviceNoteListHref = (search: string | URLSearchParams) => serviceNotesPath + serviceNoteListSearch(search);
