import { useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { UNSAFE_DataRouterContext, useBlocker, type Blocker, type BlockerFunction } from 'react-router-dom';
import { FormNavigationContext, type FormGuard } from './formNavigationCore';

type Current = { id: string | undefined; blocker: Blocker };

function RouterGuard({ check, owner, report }: {
  check: BlockerFunction; owner: () => string | undefined; report: (current: Current) => void;
}) {
  const blocker = useBlocker(check);
  useEffect(() => { report({ id: owner(), blocker }); }, [blocker, owner, report]);
  return null;
}

/** React Router aceita um único bloqueador; o cadastro contextual tem prioridade sobre a origem. */
export function FormNavigationProvider({ children }: { children: ReactNode }) {
  const router = useContext(UNSAFE_DataRouterContext);
  const guards = useRef(new Map<string, FormGuard>());
  const [size, setSize] = useState(0);
  const [current, setCurrent] = useState<Current>({
    id: undefined, blocker: { state: 'unblocked', location: undefined, proceed: undefined, reset: undefined },
  });
  const active = useRef<string>();
  const register = useCallback((id: string, guard: FormGuard) => {
    guards.current.set(id, guard);
    setSize(guards.current.size);
    return () => { guards.current.delete(id); setSize(guards.current.size); };
  }, []);
  const check = useCallback<BlockerFunction>((args) => {
    const ordered = [...guards.current].sort(([, a], [, b]) => b.priority - a.priority);
    active.current = ordered.find(([, guard]) => guard.shouldBlock(args))?.[0];
    return active.current !== undefined;
  }, []);
  const owner = useCallback(() => active.current, []);
  return <FormNavigationContext.Provider value={{ register, current }}>
    {children}
    {router && size > 0 && <RouterGuard check={check} owner={owner} report={setCurrent} />}
  </FormNavigationContext.Provider>;
}
