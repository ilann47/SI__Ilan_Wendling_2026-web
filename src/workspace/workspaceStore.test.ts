import { describe, expect, it } from 'vitest';
import { mergeWorkspaceResource, workspaceStorageKey } from './workspaceStore';

describe('workspaceStore', () => {
  it('isola referencias recentes por organizacao', () => {
    expect(workspaceStorageKey(10)).toBe('kaneko.workspace.10');
    expect(workspaceStorageKey(11)).not.toBe(workspaceStorageKey(10));
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
});
