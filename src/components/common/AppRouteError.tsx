import { useEffect, useRef, type CSSProperties } from 'react';
import { useLocation, useRouteError } from 'react-router-dom';
import { productName } from '../brand/brandName';
import { componentRadius, getThemeTokens } from '../../theme/hubTokens';
import './AppRouteError.css';

const assetLoadError = /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|loading chunk .+ failed|unable to preload css/i;

function readTheme() {
  try {
    return getThemeTokens(window.localStorage.getItem('kaneko.mode') === 'dark' ? 'dark' : 'light');
  } catch {
    return getThemeTokens('light');
  }
}

export function AppRouteError() {
  const error = useRouteError();
  const { pathname } = useLocation();
  const insideApp = /^\/app(?:\/|$)/.test(pathname);
  const canGoHome = insideApp && !/^\/app\/?$/.test(pathname);
  const failedToLoad = error instanceof Error
    && (error.name === 'ChunkLoadError' || assetLoadError.test(error.message));
  const heading = useRef<HTMLHeadingElement>(null);
  const theme = readTheme();
  const style = {
    colorScheme: theme.mode,
    '--route-error-bg': theme.background,
    '--route-error-card': theme.card,
    '--route-error-text': theme.text,
    '--route-error-muted': theme.textMuted,
    '--route-error-border': theme.border,
    '--route-error-accent': theme.accent,
    '--route-error-tint': theme.brandHover,
    '--route-error-fill': theme.actionFill,
    '--route-error-hover': theme.actionHover,
    '--route-error-on-fill': theme.onMasthead,
    '--route-error-focus': theme.focusRing,
    '--route-error-radius': `${componentRadius.surface}px`,
    '--route-error-pill': `${componentRadius.pill}px`,
  } as CSSProperties;

  useEffect(() => {
    heading.current?.focus();
  }, [error]);

  return (
    <main className="route-error" aria-labelledby="app-route-error-title" style={style}>
      <section className="route-error__card">
        <div className="route-error__brand">
          <img alt="" width="26" height="26" src={`${import.meta.env.BASE_URL}brand/yes7parking-symbol${theme.mode === 'dark' ? '-white' : ''}.svg`} />
          <strong>{productName}</strong>
        </div>
        <div className="route-error__icon" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="3" />
            <path d="M3 9h18m-9 3v3m0 2h.01" />
          </svg>
        </div>
        <h1 id="app-route-error-title" ref={heading} tabIndex={-1}>
          {failedToLoad ? 'Não foi possível carregar esta tela' : 'Algo deu errado nesta página'}
        </h1>
        <p className="route-error__description">
          {failedToLoad
            ? 'Esta tela não terminou de carregar. Recarregue a página para tentar abrir a versão mais recente.'
            : 'Não conseguimos abrir esta página. Recarregue para tentar novamente.'}
        </p>
        <div className="route-error__actions">
          <button type="button" onClick={() => window.location.reload()}>Recarregar página</button>
          {canGoHome && <a href={`${import.meta.env.BASE_URL}app`}>Ir para o início</a>}
        </div>
        {insideApp && <p className="route-error__note">Recarregar não encerra sua sessão.</p>}
      </section>
    </main>
  );
}
