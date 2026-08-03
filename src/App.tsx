import { Box, CircularProgress } from '@mui/material';
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { OrganizationAccessBoundary } from './auth/OrganizationAccessBoundary';
import { PermissionRoute } from './auth/PermissionRoute';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppLayout } from './layout/AppLayout';
import { LoginPage } from './pages/LoginPage';

const DashboardPage = lazy(() => import('./pages/DashboardPage')
  .then((module) => ({ default: module.DashboardPage })));
const EventAccessPage = lazy(() => import('./pages/EventAccessPage')
  .then((module) => ({ default: module.EventAccessPage })));
const AccessAttemptsPage = lazy(() => import('./pages/AccessAttemptsPage')
  .then((module) => ({ default: module.AccessAttemptsPage })));
const AdministrationPage = lazy(() => import('./pages/AdministrationPage')
  .then((module) => ({ default: module.AdministrationPage })));
const FacilitiesPage = lazy(() => import('./pages/FacilitiesPage')
  .then((module) => ({ default: module.FacilitiesPage })));
const EventsPage = lazy(() => import('./pages/EventsPage')
  .then((module) => ({ default: module.EventsPage })));
const SalesPage = lazy(() => import('./pages/SalesPage')
  .then((module) => ({ default: module.SalesPage })));

function LoadingPage() {
  return (
    <Box aria-label="Carregando pagina" sx={{ minHeight: 320, display: 'grid', placeItems: 'center' }}>
      <CircularProgress />
    </Box>
  );
}

export function App() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <OrganizationAccessBoundary><AppLayout /></OrganizationAccessBoundary>
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="acesso-eventos" element={
            <PermissionRoute anyOf={['access:validate', 'access:checkin', 'access:checkout', 'credentials:block']}>
              <EventAccessPage />
            </PermissionRoute>
          } />
          <Route path="tentativas-acesso" element={
            <PermissionRoute anyOf={['audit:read']}><AccessAttemptsPage /></PermissionRoute>
          } />
          <Route path="administracao" element={
            <PermissionRoute anyOf={['organizations:admin', 'users:invite', 'roles:grant', 'roles:revoke']}>
              <AdministrationPage />
            </PermissionRoute>
          } />
          <Route path="instalacoes" element={
            <PermissionRoute anyOf={['facilities:manage', 'organizations:admin']}>
              <FacilitiesPage />
            </PermissionRoute>
          } />
          <Route path="eventos" element={
            <PermissionRoute anyOf={['events:create', 'events:publish', 'inventory:manage', 'pricing:manage']}>
              <EventsPage />
            </PermissionRoute>
          } />
          <Route path="vendas" element={
            <PermissionRoute anyOf={['inventory:hold', 'orders:create', 'orders:read', 'orders:manual-confirm', 'orders:cancel', 'credentials:issue']}>
              <SalesPage />
            </PermissionRoute>
          } />
        </Route>
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </Suspense>
  );
}
