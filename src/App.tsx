import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppLayout } from './layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PatioPage } from './pages/PatioPage';
import { RelatoriosPage } from './pages/RelatoriosPage';
import { CrudResourcePage } from './components/crud/CrudResourcePage';
import { allConfigs } from './resources';
import { OrganizationSelectionPage } from './pages/OrganizationSelectionPage';
import { useAuth } from './auth/AuthContext';
import { Box, CircularProgress } from '@mui/material';
import { EventAccessPage } from './pages/EventAccessPage';

function ContextualApp() {
  const { isContextLoading, requiresOrganizationSelection } = useAuth();
  if (isContextLoading) {
    return <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <CircularProgress />
    </Box>;
  }
  if (requiresOrganizationSelection) return <OrganizationSelectionPage />;
  return <AppLayout />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <ContextualApp />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="patio" element={<PatioPage />} />
        <Route path="relatorios" element={<RelatoriosPage />} />
        <Route path="acesso-eventos" element={<EventAccessPage />} />
        {allConfigs.map((config) => (
          <Route key={config.key} path={config.key} element={<CrudResourcePage config={config} />} />
        ))}
      </Route>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
