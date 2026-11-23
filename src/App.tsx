import { Box, CircularProgress } from '@mui/material';
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { OrganizationAccessBoundary } from './auth/OrganizationAccessBoundary';
import { PermissionRoute } from './auth/PermissionRoute';
import { inboundEditorAccess, outboundEditorAccess, patioReceiptAccess, resourceRouteAccess, routePolicies } from './auth/routeAccess';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppLayout } from './layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { allConfigs } from './resources';

const HubHomePage = lazy(() => import('./pages/HubHomePage')
  .then((module) => ({ default: module.HubHomePage })));
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
const InboundNotesPage = lazy(() => import('./pages/InboundNotesPage')
  .then((module) => ({ default: module.InboundNotesPage })));
const InboundNoteWizardPage = lazy(() => import('./pages/InboundNoteWizardPage')
  .then((module) => ({ default: module.InboundNoteWizardPage })));
const InboundNoteDetailPage = lazy(() => import('./pages/InboundNoteDetailPage')
  .then((module) => ({ default: module.InboundNoteDetailPage })));
const OutboundNotesPage = lazy(() => import('./pages/OutboundNotesPage')
  .then((module) => ({ default: module.OutboundNotesPage })));
const OutboundNoteEditorPage = lazy(() => import('./pages/OutboundNoteEditorPage')
  .then((module) => ({ default: module.OutboundNoteEditorPage })));
const OutboundNoteDocumentPage = lazy(() => import('./pages/OutboundNoteDocumentPage')
  .then((module) => ({ default: module.OutboundNoteDocumentPage })));
const ServiceNotesPage = lazy(() => import('./pages/ServiceNotesPage')
  .then((module) => ({ default: module.ServiceNotesPage })));
const ParkingFiscalDraftPage = lazy(() => import('./pages/ParkingFiscalDraftPage')
  .then((module) => ({ default: module.ParkingFiscalDraftPage })));
const ServiceNoteDocumentPage = lazy(() => import('./pages/ServiceNoteDocumentPage')
  .then((module) => ({ default: module.ServiceNoteDocumentPage })));
const XmlInboundImportPage = lazy(() => import('./pages/XmlInboundImportPage')
  .then((module) => ({ default: module.XmlInboundImportPage })));
const ContasPagarPage = lazy(() => import('./pages/ContasPagarPage')
  .then((module) => ({ default: module.ContasPagarPage })));
const ContasReceberPage = lazy(() => import('./pages/ContasReceberPage')
  .then((module) => ({ default: module.ContasReceberPage })));
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

const crudConfigs = allConfigs.filter(
  (config) => !['notas-entrada', 'notas-saida', 'notas-servico', 'contas-pagar', 'contas-receber'].includes(config.key),
);

export function App() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <OrganizationAccessBoundary><AppLayout /></OrganizationAccessBoundary>
            </ProtectedRoute>
          }
        >
          <Route index element={<HubHomePage />} />
          <Route path="areas/:areaId" element={<Navigate to="/app" replace />} />
          <Route path="visao-geral" element={<Navigate to="/app" replace />} />
          <Route path="acesso-eventos" element={
            <PermissionRoute {...routePolicies['acesso-eventos']}>
              <EventAccessPage />
            </PermissionRoute>
          } />
          <Route path="tentativas-acesso" element={
            <PermissionRoute {...routePolicies['tentativas-acesso']}><AccessAttemptsPage /></PermissionRoute>
          } />
          <Route path="administracao" element={
            <PermissionRoute {...routePolicies.administracao}>
              <AdministrationPage />
            </PermissionRoute>
          } />
          <Route path="administracao/vinculos/:membershipId" element={
            <PermissionRoute {...routePolicies.administracao}><AdministrationPage /></PermissionRoute>
          } />
          <Route path="instalacoes" element={
            <PermissionRoute {...routePolicies.instalacoes}>
              <FacilitiesPage />
            </PermissionRoute>
          } />
          <Route path="eventos" element={
            <PermissionRoute {...routePolicies.eventos}><EventsPage /></PermissionRoute>
          } />
          <Route path="eventos/:eventId" element={
            <PermissionRoute {...routePolicies.eventos}><EventsPage /></PermissionRoute>
          } />
          <Route path="vendas" element={
            <PermissionRoute {...routePolicies.vendas}>
              <SalesPage />
            </PermissionRoute>
          } />
          {['pedidos', 'reservas', 'credenciais'].map((section) => (
            <Route key={section} path={`vendas/${section}/:detailId`} element={
              <PermissionRoute {...routePolicies.vendas}><SalesPage /></PermissionRoute>
            } />
          ))}
          <Route path="bloqueios" element={
            <PermissionRoute {...routePolicies.bloqueios}>
              <BlockersPage />
            </PermissionRoute>
          } />
          <Route path="patio" element={
            <PermissionRoute {...routePolicies.patio}><PatioPage /></PermissionRoute>
          } />
          <Route path="patio/comprovantes/:detailId" element={
            <PermissionRoute {...patioReceiptAccess}><PatioPage /></PermissionRoute>
          } />
          <Route path="relatorios" element={
            <PermissionRoute {...routePolicies.relatorios}><RelatoriosPage /></PermissionRoute>
          } />
          <Route path="estoque" element={
            <PermissionRoute {...routePolicies.estoque}><StockPage /></PermissionRoute>
          } />
          <Route path="estoque/movimentos/:detailId" element={
            <PermissionRoute {...routePolicies.estoque}><StockPage /></PermissionRoute>
          } />
          <Route path="notas-entrada" element={
            <PermissionRoute {...routePolicies['notas-entrada']}><InboundNotesPage /></PermissionRoute>
          } />
          <Route path="notas-entrada/nova" element={
            <PermissionRoute {...inboundEditorAccess}><InboundNoteWizardPage /></PermissionRoute>
          } />
          <Route path="notas-entrada/:id/editar" element={
            <PermissionRoute {...inboundEditorAccess}><InboundNoteWizardPage /></PermissionRoute>
          } />
          <Route path="notas-entrada/:id" element={
            <PermissionRoute {...routePolicies['notas-entrada']}><InboundNoteDetailPage /></PermissionRoute>
          } />
          <Route path="notas-entrada/importar" element={
            <PermissionRoute {...routePolicies['notas-entrada']}><XmlInboundImportPage /></PermissionRoute>
          } />
          <Route path="notas-saida" element={
            <PermissionRoute {...routePolicies['notas-saida']}><OutboundNotesPage /></PermissionRoute>
          } />
          <Route path="notas-saida/nova" element={
            <PermissionRoute {...outboundEditorAccess}><OutboundNoteEditorPage /></PermissionRoute>
          } />
          <Route path="notas-saida/:id/editar" element={
            <PermissionRoute {...outboundEditorAccess}><OutboundNoteEditorPage /></PermissionRoute>
          } />
          <Route path="notas-saida/:id" element={
            <PermissionRoute {...routePolicies['notas-saida']}><OutboundNoteDocumentPage /></PermissionRoute>
          } />
          <Route path="notas-servico" element={
            <PermissionRoute {...routePolicies['notas-servico']}><ServiceNotesPage /></PermissionRoute>
          } />
          <Route path="notas-servico/estacionamento/:movimentacaoId" element={
            <PermissionRoute {...routePolicies['notas-servico']}><ParkingFiscalDraftPage /></PermissionRoute>
          } />
          <Route path="notas-servico/:id" element={
            <PermissionRoute {...routePolicies['notas-servico']}><ServiceNoteDocumentPage /></PermissionRoute>
          } />
          <Route path="contas-pagar/:detailId?" element={
            <PermissionRoute {...routePolicies['contas-pagar']}><ContasPagarPage /></PermissionRoute>
          } />
          <Route path="contas-receber/:detailId?" element={
            <PermissionRoute {...routePolicies['contas-receber']}><ContasReceberPage /></PermissionRoute>
          } />
          <Route path="ordens-servico/:detailId?" element={
            <PermissionRoute {...routePolicies['ordens-servico']}><ServiceOrdersPage /></PermissionRoute>
          } />
          {crudConfigs.map((config) => (
            <Route key={config.key} path={`${config.key}/:detailId?`} element={
              <PermissionRoute {...resourceRouteAccess(config.key)}><CrudResourcePage key={config.key} config={config} /></PermissionRoute>
            } />
          ))}
        </Route>
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </Suspense>
  );
}
