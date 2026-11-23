import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/pt-br';
import { ColorModeProvider } from './context/ColorModeContext';
import { SnackbarProvider } from './components/SnackbarProvider';
import { AuthProvider } from './auth/AuthContext';
import { QuickCreateProvider } from './context/QuickCreateContext';
import { OperationalWorkspaceProvider } from './workspace/OperationalWorkspaceContext';
import { FormNavigationProvider } from './context/FormNavigationProvider';
import { getHttpStatus } from './api/client';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: (failures, error) => getHttpStatus(error) !== 403 && failures < 1,
      refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  return (
      <QueryClientProvider client={queryClient}>
        <ColorModeProvider>
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
            <SnackbarProvider>
              <AuthProvider>
                <OperationalWorkspaceProvider>
                  <FormNavigationProvider>
                    <QuickCreateProvider pagesInLayout>{children}</QuickCreateProvider>
                  </FormNavigationProvider>
                </OperationalWorkspaceProvider>
              </AuthProvider>
            </SnackbarProvider>
          </LocalizationProvider>
        </ColorModeProvider>
      </QueryClientProvider>
  );
}
