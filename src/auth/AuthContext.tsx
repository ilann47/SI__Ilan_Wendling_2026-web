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
import { rememberLastOrganizationId } from './organizationPreference';

export type Perfil = 'ADMIN' | 'OPERADOR';

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
  selectOrganization: (organizationId: number) => Promise<void>;
  refreshOrganizations: () => Promise<void>;
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

function userFromToken(token: string | null): AuthUser | null {
  if (!token) return null;
  const payload = decodeToken(token);
  if (!payload || (payload.exp && payload.exp * 1000 < Date.now())) {
    setToken(null);
    return null;
  }
  return { login: payload.sub ?? '', perfil: (payload.perfil as Perfil) ?? 'OPERADOR' };
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const hydrationStarted = useRef(false);
  const [user, setUser] = useState<AuthUser | null>(() => userFromToken(getToken()));
  const [isContextLoading, setContextLoading] = useState(() => !!getToken());
  const [organizations, setOrganizations] = useState<AccessibleOrganization[]>([]);
  const [activeOrganization, setActiveOrganization] =
    useState<AccessibleOrganization | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  const logout = useCallback(() => {
    queryClient.clear();
    setToken(null);
    setUser(null);
    setOrganizations([]);
    setActiveOrganization(null);
    setPermissions([]);
    setContextLoading(false);
  }, [queryClient]);

  const selectOrganization = useCallback(async (organizationId: number) => {
    const organization = organizations.find((item) => item.organizationId === organizationId);
    if (!organization) throw new Error('A organização selecionada não está disponível.');
    setContextLoading(true);
    try {
      const { data } = await api.post<ActiveOrganizationResponse>(
        '/api/v1/me/active-organization',
        { organizationId },
      );
      const permissionResponse = await api.get<PermissionsResponse>('/api/v1/me/permissions', {
        headers: { Authorization: `Bearer ${data.token}` },
      });
      await queryClient.cancelQueries();
      queryClient.clear();
      setToken(data.token);
      setPermissions(permissionResponse.data.permissions);
      setActiveOrganization(organization);
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
        }
      } else if (data.length === 1) {
        const { data: context } = await api.post<ActiveOrganizationResponse>(
          '/api/v1/me/active-organization',
          { organizationId: data[0].organizationId },
        );
        const permissionResponse = await api.get<PermissionsResponse>('/api/v1/me/permissions', {
          headers: { Authorization: `Bearer ${context.token}` },
        });
        await queryClient.cancelQueries();
        queryClient.clear();
        setToken(context.token);
        setPermissions(permissionResponse.data.permissions);
        setActiveOrganization(data[0]);
        rememberLastOrganizationId(data[0].organizationId);
      } else {
        setActiveOrganization(null);
        setPermissions([]);
      }
    } finally {
      setContextLoading(false);
    }
  }, [queryClient]);

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

  const login = useCallback(async (loginName: string, senha: string) => {
    const { data } = await api.post<LoginResponse>('/api/auth/login', {
      login: loginName,
      senha,
    });
    setToken(data.token);
    hydrationStarted.current = true;
    setUser({ login: data.login, perfil: data.perfil });
    try {
      await loadOrganizations();
    } catch (cause) {
      logout();
      throw cause;
    }
  }, [loadOrganizations, logout]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isContextLoading,
      organizations,
      activeOrganization,
      permissions,
      requiresOrganizationSelection: organizations.length > 0 && !activeOrganization,
      hasNoOrganizationAccess: !!user && !isContextLoading && organizations.length === 0,
      login,
      selectOrganization,
      refreshOrganizations: loadOrganizations,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
