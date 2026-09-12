import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from '../api/client';
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
  membershipId: number;
  membershipVersion: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isContextLoading: boolean;
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
  logout: () => void,
) {
  setToken(token);
  markHydrated();
  setUser({ login: loginName, perfil });
  try {
    await loadOrganizations();
  } catch (cause) {
    logout();
    throw cause;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const hydrationStarted = useRef(false);
  const [user, setUser] = useState<AuthUser | null>(() => userFromToken(getToken()));
  const [isContextLoading, setContextLoading] = useState(() => !!getToken());
  const [organizations, setOrganizations] = useState<AccessibleOrganization[]>([]);
  const [activeOrganization, setActiveOrganization] =
    useState<AccessibleOrganization | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [organizationSelectionRequested, setOrganizationSelectionRequested] = useState(false);

  const logout = useCallback(() => {
    queryClient.clear();
    setToken(null);
    setUser(null);
    setOrganizations([]);
    setActiveOrganization(null);
    setPermissions([]);
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
      setOrganizationSelectionRequested(false);
      rememberLastOrganizationId(organizationId);
    } finally {
      setContextLoading(false);
    }
  }, [organizations, queryClient]);

  const loadOrganizations = useCallback(async () => {
    setContextLoading(true);
    try {
      const { data } = await api.get<AccessibleOrganization[]>('/api/v1/me/organizations');
      setOrganizations(data);
      const organizationId = decodeToken(getToken() ?? '')?.org_id;
      if (organizationId) {
        const organization = data.find((item) => item.organizationId === organizationId) ?? null;
        setActiveOrganization(organization);
        if (organization) {
          const permissionResponse = await api.get<PermissionsResponse>('/api/v1/me/permissions');
          setPermissions(permissionResponse.data.permissions);
        } else {
          setPermissions([]);
        }
      } else {
        // Conta global: nunca auto-seleciona. O usuário escolhe (mesmo com 1 org).
        setActiveOrganization(null);
        setPermissions([]);
      }
      return data;
    } finally {
      setContextLoading(false);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    if (user && !hydrationStarted.current) {
      hydrationStarted.current = true;
      void loadOrganizations().catch(logout);
    }
  }, [loadOrganizations, logout, user]);

  const markHydrated = useCallback(() => {
    hydrationStarted.current = true;
  }, []);

  const openOrganizationSelection = useCallback(() => {
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
      logout,
    );
  }, [loadOrganizations, logout, markHydrated]);

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
      logout,
    );
  }, [loadOrganizations, logout, markHydrated]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isContextLoading,
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
