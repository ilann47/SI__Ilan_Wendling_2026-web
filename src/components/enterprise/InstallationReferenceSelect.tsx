import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { describeError } from '../../api/client';
import { installationCatalogKey, searchInstallationCatalog, type InstallationCatalogKind } from '../../api/installationCatalog';
import { useAuth } from '../../auth/AuthContext';
import { NamedResourceSelect } from './NamedResourceSelect';

interface Props {
  kind: InstallationCatalogKind;
  label: string;
  value: string;
  onChange: (id: string) => void;
  required?: boolean;
  disabled?: boolean;
  emptyText?: string;
  existingOption?: { id: number; label: string };
  allSectors?: boolean;
}

/** A lista e o rótulo selecionado vêm do servidor, mesmo numa sessão nova. */
export function InstallationReferenceSelect({ kind, label, value, onChange, required, disabled, emptyText, existingOption, allSectors = false }: Props) {
  const { activeOrganization } = useAuth();
  const org = activeOrganization?.organizationId;
  const queries = useQueryClient();
  const [input, setInput] = useState('');
  const [term, setTerm] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(input.trim()), 220);
    return () => window.clearTimeout(timer);
  }, [input]);
  const base = installationCatalogKey(org, kind);
  const key = kind === 'sectors' && allSectors ? [...base, 'all-sectors'] : base;
  const list = useQuery({ queryKey: [...key, 'name', term], enabled: !!org && !disabled,
    queryFn: ({ signal }) => searchInstallationCatalog(kind, term ? { name: term } : {}, signal, allSectors) });
  const waiting = input.trim() !== term;
  const options = waiting ? [] : list.data?.options ?? [];
  const selected = useQuery({ queryKey: [...key, 'id', value], enabled: !!org && !!value,
    queryFn: ({ signal }) => searchInstallationCatalog(kind, { id: Number(value) }, signal, allSectors) });
  const error = list.error ?? selected.error;
  return <NamedResourceSelect label={label} value={value} onChange={(id) => {
    const option = options.find((item) => String(item.id) === id);
    if (option) queries.setQueryData([...key, 'id', id], { options: [option], total: 1 });
    onChange(id);
  }} options={options}
    selected={selected.data?.options[0] ?? (existingOption && String(existingOption.id) === value ? existingOption : undefined)}
    onSearch={setInput} loading={waiting || list.isFetching}
    disabled={disabled || !org} required={required} error={!!error}
    helperText={error ? describeError(error) : (list.data?.total ?? 0) > 20 ? 'Digite mais do nome para refinar a busca.' : undefined}
    emptyText={error ? 'Não foi possível consultar os registros.' : term ? 'Nenhum resultado para esse nome.' : emptyText} />;
}
