import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api, getHttpStatus, getToken, setForbiddenHandler, setToken, setUnauthorizedHandler } from '../api/client';
import { useQueryClient } from '@tanstack/react-query';
import type { RegisterRequest, RegisterResponse } from '../types';
import { rememberLastOrganizationId } from './organizationPreference';

export type Perfil = 'ADMIN' | 'OPERADOR' | 'USUARIO';

export interface AuthUser {
  login: string;
  perfil: Perfil;
}

export interface AccessibleOrganization {
  organizationId: number;
  legalName: string;
  tradeName?: string | null;
  timeZone?: string;
  membershipId: number;
  membershipVersion: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isContextLoading: boolean;
  contextError?: 'denied' | 'unavailable' | null;
  organizations: AccessibleOrganization[];
  activeOrganization: AccessibleOrganization | null;
  permissions: string[];
  requiresOrganizationSelection: boolean;
  hasNoOrganizationAccess: boolean;
  login: (login: string, senha: string) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
  selectOrganization: (
    organizationId: number,
    knownList?: AccessibleOrganization[],
  ) => Promise<void>;
  refreshOrganizations: () => Promise<AccessibleOrganization[]>;
  openOrganizationSelection: () => void;
  cancelOrganizationSelection: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>(null!);

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

interface JwtPayload {
  sub?: string;
  perfil?: string;
  exp?: number;
  org_id?: number;
}

function decodeToken(token: string): JwtPayload | null {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

function normalizePerfil(value: string | undefined): Perfil {
  if (value === 'ADMIN' || value === 'OPERADOR' || value === 'USUARIO') return value;
  return 'USUARIO';
}

function userFromToken(token: string | null): AuthUser | null {
  if (!token) return null;
  const payload = decodeToken(token);
  if (!payload || (payload.exp && payload.exp * 1000 < Date.now())) {
    setToken(null);
    return null;
  }
  return { login: payload.sub ?? '', perfil: normalizePerfil(payload.perfil) };
}

interface LoginResponse {
  token: string;
  tipo: string;
  login: string;
  perfil: Perfil;
}

interface ActiveOrganizationResponse {
  token: string;
  activeOrganization: {
    organizationId: number;
    membershipId: number;
    membershipVersion: number;
  };
}

interface PermissionsResponse {
  organizationId: number;
  permissions: string[];
}

async function establishSession(
  token: string,
  loginName: string,
  perfil: Perfil,
  setUser: (user: AuthUser) => void,
  markHydrated: () => void,
  loadOrganizations: () => Promise<unknown>,
) {
  setToken(token);
  markHydrated();
  setUser({ login: loginName, perfil });
  // A credencial já foi validada. Falha ao carregar o tenant é tratada na
  // barreira de contexto, não como falha do login.
  await loadOrganizations().catch(() => undefined);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const hydrationStarted = useRef(false);
  const permissionRefreshToken = useRef<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(() => userFromToken(getToken()));
  const [isContextLoading, setContextLoading] = useState(() => !!getToken());
  const [organizations, setOrganizations] = useState<AccessibleOrganization[]>([]);
  const [activeOrganization, setActiveOrganization] =
    useState<AccessibleOrganization | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [contextError, setContextError] = useState<AuthContextValue['contextError']>(null);
  const [organizationSelectionRequested, setOrganizationSelectionRequested] = useState(false);

  const logout = useCallback(() => {
    queryClient.clear();
    setToken(null);
    setUser(null);
    setOrganizations([]);
    setActiveOrganization(null);
    setPermissions([]);
    setContextError(null);
    setOrganizationSelectionRequested(false);
    setContextLoading(false);
  }, [queryClient]);

  const selectOrganization = useCallback(async (
    organizationId: number,
    knownList?: AccessibleOrganization[],
  ) => {
    const organization = (knownList ?? organizations)
      .find((item) => item.organizationId === organizationId);
    if (!organization) throw new Error('A organização selecionada não está disponível.');
    setContextLoading(true);
    try {
      const { data } = await api.post<ActiveOrganizationResponse>(
        '/api/v1/me/active-organization',
        { organizationId },
      );
      const authHeader = { Authorization: `Bearer ${data.token}` };
      const permissionResponse = await api.get<PermissionsResponse>('/api/v1/me/permissions', {
        headers: authHeader,
      });
      const meResponse = await api.get<{ login?: string; perfil?: string }>('/api/v1/me', {
        headers: authHeader,
      });
      await queryClient.cancelQueries();
      queryClient.clear();
      setToken(data.token);
      setUser({
        login: meResponse.data.login || userFromToken(data.token)?.login || '',
        perfil: normalizePerfil(meResponse.data.perfil ?? userFromToken(data.token)?.perfil),
      });
      setPermissions(permissionResponse.data.permissions);
      setActiveOrganization(organization);
      setContextError(null);
      setOrganizationSelectionRequested(false);
      rememberLastOrganizationId(organizationId);
    } finally {
      setContextLoading(false);
    }
  }, [organizations, queryClient]);

  const loadOrganizations = useCallback(async () => {
    const token = getToken();
    setContextLoading(true);
    try {
      const { data } = await api.get<AccessibleOrganization[]>('/api/v1/me/organizations');
      if (getToken() !== token) return [];
      setOrganizations(data);
      const organizationId = decodeToken(token ?? '')?.org_id;
      const organization = data.find((item) => item.organizationId === organizationId) ?? null;
      const granted = organization
        ? (await api.get<PermissionsResponse>('/api/v1/me/permissions')).data.permissions
        : [];
      if (getToken() !== token) return [];
      setActiveOrganization(organization);
      setPermissions(granted);
      setContextError(null);
      return data;
    } catch (error) {
      if (getToken() === token) {
        queryClient.clear();
        setActiveOrganization(null);
        setPermissions([]);
        setContextError(getHttpStatus(error) === 403 ? 'denied' : 'unavailable');
      }
      throw error;
    } finally {
      if (getToken() === token) setContextLoading(false);
    }
  }, [queryClient]);

  const refreshPermissions = useCallback(async () => {
    const token = getToken();
    if (!token || !activeOrganization || permissionRefreshToken.current === token) return;
    permissionRefreshToken.current = token;
    try {
      const { data } = await api.get<PermissionsResponse>('/api/v1/me/permissions');
      if (getToken() !== token) return;
      const current = new Set(permissions);
      if (current.size !== new Set(data.permissions).size || data.permissions.some((permission) => !current.has(permission))) {
        queryClient.clear();
        setPermissions(data.permissions);
      }
    } catch (error) {
      if (getToken() === token && getHttpStatus(error) === 403) {
        queryClient.clear();
        setActiveOrganization(null);
        setPermissions([]);
        setContextError('denied');
      }
    } finally {
      if (permissionRefreshToken.current === token) permissionRefreshToken.current = null;
    }
  }, [activeOrganization, permissions, queryClient]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    const refresh = () => { void refreshPermissions(); };
    setForbiddenHandler(refresh);
    window.addEventListener('focus', refresh);
    return () => {
      setForbiddenHandler(null);
      window.removeEventListener('focus', refresh);
    };
  }, [refreshPermissions]);

  useEffect(() => {
    if (user && !hydrationStarted.current) {
      hydrationStarted.current = true;
      void loadOrganizations().catch(() => undefined);
    }
  }, [loadOrganizations, user]);

  const markHydrated = useCallback(() => {
    hydrationStarted.current = true;
  }, []);

  const openOrganizationSelection = useCallback(() => {
    setContextError(null);
    setOrganizationSelectionRequested(true);
  }, []);

  const cancelOrganizationSelection = useCallback(() => {
    setOrganizationSelectionRequested(false);
  }, []);

  const login = useCallback(async (loginName: string, senha: string) => {
    const { data } = await api.post<LoginResponse>('/api/auth/login', {
      login: loginName,
      senha,
    });
    await establishSession(
      data.token,
      data.login,
      normalizePerfil(data.perfil),
      setUser,
      markHydrated,
      loadOrganizations,
    );
  }, [loadOrganizations, markHydrated]);

  const register = useCallback(async (payload: RegisterRequest) => {
    const body: RegisterRequest = {
      nome: payload.nome,
      login: payload.login,
      email: payload.email,
      senha: payload.senha,
    };
    const { data } = await api.post<RegisterResponse>('/api/auth/register', body);
    await establishSession(
      data.token,
      data.login,
      normalizePerfil(data.perfil),
      setUser,
      markHydrated,
      loadOrganizations,
    );
  }, [loadOrganizations, markHydrated]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isContextLoading,
      contextError,
      organizations,
      activeOrganization,
      permissions,
      requiresOrganizationSelection:
        organizationSelectionRequested
        || (organizations.length > 0 && !activeOrganization),
      hasNoOrganizationAccess: !!user && !isContextLoading && organizations.length === 0,
      login,
      register,
      selectOrganization,
      refreshOrganizations: loadOrganizations,
      openOrganizationSelection,
      cancelOrganizationSelection,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
