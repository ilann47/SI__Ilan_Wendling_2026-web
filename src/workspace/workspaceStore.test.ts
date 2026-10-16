import { beforeEach, describe, expect, it } from 'vitest';
import {
  mergeWorkspaceResource,
  readWorkspace,
  workspaceStorageKey,
  writeWorkspace,
} from './workspaceStore';

describe('workspaceStore', () => {
  beforeEach(() => localStorage.clear());

  it('isola referencias recentes por organizacao e Membership', () => {
    expect(workspaceStorageKey(10, 101)).toBe('kaneko.workspace.10.101');
    expect(workspaceStorageKey(11, 101)).not.toBe(workspaceStorageKey(10, 101));
    expect(workspaceStorageKey(10, 102)).not.toBe(workspaceStorageKey(10, 101));
  });

  it('atualiza o snapshot real sem duplicar o recurso', () => {
    const current = [{ id: 1, label: 'Evento A', version: 0, updatedAt: 'antes' }];
    const next = mergeWorkspaceResource(current, {
      id: 1,
      label: 'Evento A',
      version: 1,
      updatedAt: 'agora',
    });
    expect(next).toHaveLength(1);
    expect(next[0].version).toBe(1);
  });

  it('nao compartilha snapshots entre Memberships da mesma organizacao', () => {
    writeWorkspace(10, 101, {
      order: [{ id: 1, label: 'Pedido A', updatedAt: 'agora' }],
    });

    expect(readWorkspace(10, 101).order).toHaveLength(1);
    expect(readWorkspace(10, 102)).toEqual({});
  });

  it('ignora a chave legada compartilhada pela organizacao', () => {
    localStorage.setItem('kaneko.workspace.10', JSON.stringify({
      credential: [{ id: 9, label: 'Credencial antiga', updatedAt: 'antes' }],
    }));

    expect(readWorkspace(10, 101)).toEqual({});
  });
});
