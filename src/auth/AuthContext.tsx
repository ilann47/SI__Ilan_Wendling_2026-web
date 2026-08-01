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
  login: (login: string, senha: string) => Promise<void>;
  selectOrganization: (organizationId: number) => Promise<void>;
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
  const hydrationStarted = useRef(false);
  const [user, setUser] = useState<AuthUser | null>(() => userFromToken(getToken()));
  const [isContextLoading, setContextLoading] = useState(() => !!getToken());
  const [organizations, setOrganizations] = useState<AccessibleOrganization[]>([]);
  const [activeOrganization, setActiveOrganization] =
    useState<AccessibleOrganization | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setOrganizations([]);
    setActiveOrganization(null);
    setPermissions([]);
    setContextLoading(false);
  }, []);

  const selectOrganization = useCallback(async (organizationId: number) => {
    setContextLoading(true);
    try {
      const { data } = await api.post<ActiveOrganizationResponse>(
        '/api/v1/me/active-organization',
        { organizationId },
      );
      setToken(data.token);
      const organization = organizations.find((item) => item.organizationId === organizationId);
      if (!organization) throw new Error('A organização selecionada não está disponível.');
      const permissionResponse = await api.get<PermissionsResponse>('/api/v1/me/permissions');
      setPermissions(permissionResponse.data.permissions);
      setActiveOrganization(organization);
    } finally {
      setContextLoading(false);
    }
  }, [organizations]);

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
        setToken(context.token);
        setActiveOrganization(data[0]);
        const permissionResponse = await api.get<PermissionsResponse>('/api/v1/me/permissions');
        setPermissions(permissionResponse.data.permissions);
      } else {
        setActiveOrganization(null);
        setPermissions([]);
      }
    } finally {
      setContextLoading(false);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
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
      login,
      selectOrganization,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
