import { createContext, useContext, useEffect, useId, useRef } from 'react';
import type { Blocker, BlockerFunction } from 'react-router-dom';

const idle: Blocker = { state: 'unblocked', location: undefined, proceed: undefined, reset: undefined };
export type FormGuard = { priority: number; shouldBlock: BlockerFunction };
export const FormNavigationContext = createContext<{
  register: (id: string, guard: FormGuard) => () => void;
  current: { id: string | undefined; blocker: Blocker };
} | null>(null);

export function useManagedFormBlocker(shouldBlock: BlockerFunction, priority = 0): Blocker {
  const context = useContext(FormNavigationContext);
  const id = useId();
  const predicate = useRef(shouldBlock);
  predicate.current = shouldBlock;
  const register = context?.register;
  useEffect(() => register?.(id, { priority, shouldBlock: (args) => predicate.current(args) }), [id, priority, register]);
  return context?.current.id === id ? context.current.blocker : idle;
}
