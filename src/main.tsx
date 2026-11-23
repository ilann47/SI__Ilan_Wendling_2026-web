import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AppProviders } from './AppProviders';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppRouteError } from './components/common/AppRouteError';
import './theme/montserrat.css';

// Uma instância fora de StrictMode: o blocker protege também o histórico SPA.
const router = createBrowserRouter([{
  path: '*',
  element: <AppProviders><App /></AppProviders>,
  errorElement: <AppRouteError />,
}]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
