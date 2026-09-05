import { Box, CircularProgress } from '@mui/material';
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { OrganizationAccessBoundary } from './auth/OrganizationAccessBoundary';
import { PermissionRoute } from './auth/PermissionRoute';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppLayout } from './layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { allConfigs } from './resources';

const HubHomePage = lazy(() => import('./pages/HubHomePage')
  .then((module) => ({ default: module.HubHomePage })));
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
const BlockersPage = lazy(() => import('./pages/BlockersPage')
  .then((module) => ({ default: module.BlockersPage })));
const PatioPage = lazy(() => import('./pages/PatioPage')
  .then((module) => ({ default: module.PatioPage })));
const RelatoriosPage = lazy(() => import('./pages/RelatoriosPage')
  .then((module) => ({ default: module.RelatoriosPage })));
const StockPage = lazy(() => import('./pages/StockPage')
  .then((module) => ({ default: module.StockPage })));
const PurchaseOrdersPage = lazy(() => import('./pages/PurchaseOrdersPage')
  .then((module) => ({ default: module.PurchaseOrdersPage })));
const AdministrativeSalesPage = lazy(() => import('./pages/AdministrativeSalesPage')
  .then((module) => ({ default: module.AdministrativeSalesPage })));
const ServiceOrdersPage = lazy(() => import('./pages/ServiceOrdersPage')
  .then((module) => ({ default: module.ServiceOrdersPage })));
const CrudResourcePage = lazy(() => import('./components/crud/CrudResourcePage')
  .then((module) => ({ default: module.CrudResourcePage })));

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
          <Route index element={<HubHomePage />} />
          <Route path="visao-geral" element={<DashboardPage />} />
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
            <PermissionRoute anyOf={['facilities:manage']}>
              <FacilitiesPage />
            </PermissionRoute>
          } />
          <Route path="eventos" element={<EventsPage />} />
          <Route path="vendas" element={
            <PermissionRoute anyOf={['inventory:hold', 'orders:create', 'orders:read', 'orders:manual-confirm', 'orders:cancel', 'credentials:issue']}>
              <SalesPage />
            </PermissionRoute>
          } />
          <Route path="bloqueios" element={
            <PermissionRoute anyOf={['organizations:admin', 'audit:read']}>
              <BlockersPage />
            </PermissionRoute>
          } />
          <Route path="patio" element={<PatioPage />} />
          <Route path="relatorios" element={<RelatoriosPage />} />
          <Route path="estoque" element={
            <PermissionRoute anyOf={['stock:read']}><StockPage /></PermissionRoute>
          } />
          <Route path="ordens-compra" element={
            <PermissionRoute anyOf={['purchases:read']}><PurchaseOrdersPage /></PermissionRoute>
          } />
          <Route path="vendas-administrativas" element={
            <PermissionRoute anyOf={['sales:read']}><AdministrativeSalesPage /></PermissionRoute>
          } />
          <Route path="ordens-servico" element={
            <PermissionRoute anyOf={['service_orders:read']}><ServiceOrdersPage /></PermissionRoute>
          } />
          {allConfigs.map((config) => (
            <Route
              key={config.key}
              path={config.key}
              element={config.permissions?.read?.length ? (
                <PermissionRoute anyOf={config.permissions.read}>
                  <CrudResourcePage config={config} />
                </PermissionRoute>
              ) : <CrudResourcePage config={config} />}
            />
          ))}
        </Route>
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </Suspense>
  );
}
