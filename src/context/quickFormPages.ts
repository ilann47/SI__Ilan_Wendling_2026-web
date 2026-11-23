import { createContext, type ReactNode } from 'react';

export const QuickFormPagesContext = createContext<{ active: boolean; pages: ReactNode } | null>(null);
export const SuspendedDialogContext = createContext(false);
