import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createBrowserRouter, Link, Route, RouterProvider, Routes, useBlocker } from 'react-router-dom';
import type { ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
import { AppProviders } from './AppProviders';

vi.mock('./auth/AuthContext', () => ({ AuthProvider: ({ children }: { children: ReactNode }) => children }));
vi.mock('./context/QuickCreateContext', () => ({ QuickCreateProvider: ({ children }: { children: ReactNode }) => children }));
vi.mock('./workspace/OperationalWorkspaceContext', () => ({ OperationalWorkspaceProvider: ({ children }: { children: ReactNode }) => children }));
function GuardedForm() {
  const blocker = useBlocker(true);
  return <><h1>Formulário com dados</h1><Link to="/router-check/next">Próxima tela</Link>
    {blocker.state === 'blocked' && <button onClick={() => blocker.proceed()}>Autorizar descarte</button>}</>;
}
it('mantém o blocker de dados no shell com providers e Routes descendentes', async () => {
  window.history.replaceState(null, '', '/router-check/form');
  const router = createBrowserRouter([{ path: '*', element: <AppProviders><Routes>
    <Route path="/router-check/form" element={<GuardedForm />} />
    <Route path="/router-check/next" element={<h1>Próxima tela</h1>} />
  </Routes></AppProviders> }]);
  const view = render(<RouterProvider router={router} />);
  try {
    const user = userEvent.setup();
    await user.click(await screen.findByRole('link', { name: 'Próxima tela' }));
    expect(await screen.findByRole('button', { name: 'Autorizar descarte' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/router-check/form');
    await user.click(screen.getByRole('button', { name: 'Autorizar descarte' }));
    expect(await screen.findByRole('heading', { name: 'Próxima tela' })).toBeInTheDocument();
  } finally { view.unmount(); router.dispose(); window.history.replaceState(null, '', '/'); }
});
