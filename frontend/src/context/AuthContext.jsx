import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authService } from '../services/authService';
import { setTokenGetter, setOnUnauthorized } from '../services/apiClient';
import { getStoredToken, setStoredToken, clearStoredToken } from '../utils/tokenStorage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Concurrency guard refs to prevent thundering herd and infinite loops
  const isHandlingUnauthorizedRef = useRef(false);
  const isLoggingOutRef = useRef(false);

  // Wire up apiClient token getter
  useEffect(() => {
    setTokenGetter(getStoredToken);
  }, []);

  // Explicit user-initiated logout
  const logout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    try {
      const activeToken = getStoredToken();
      if (activeToken) {
        await authService.logout();
      }
    } catch {
      // Ignore network failures on server-side logout
    } finally {
      clearStoredToken();
      try {
        localStorage.removeItem('agrosage_auth_username');
      } catch {}
      setToken(null);
      setUser(null);
      isLoggingOutRef.current = false;
    }
  }, []);

  // Coordinated session expiration handler triggered by 401 response interceptor
  // Clears state exactly once without issuing duplicate/failing logout requests
  const handleUnauthorized = useCallback(() => {
    if (isHandlingUnauthorizedRef.current) return;
    isHandlingUnauthorizedRef.current = true;

    clearStoredToken();
    try {
      localStorage.removeItem('agrosage_auth_username');
    } catch {}
    setToken(null);
    setUser(null);

    // Reset lock after tick to permit future logins/sessions
    setTimeout(() => {
      isHandlingUnauthorizedRef.current = false;
    }, 500);
  }, []);

  // Wire 401 callback
  useEffect(() => {
    setOnUnauthorized(handleUnauthorized);
    return () => {
      setOnUnauthorized(null);
    };
  }, [handleUnauthorized]);

  // Fetch current user if token exists on boot
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      const storedToken = getStoredToken();
      if (!storedToken) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const userData = await authService.getMe();
        if (isMounted) {
          let savedUsername = null;
          try {
            savedUsername = localStorage.getItem('agrosage_auth_username');
          } catch {}
          setUser({
            ...userData,
            username: savedUsername || userData.user_id,
          });
          setToken(storedToken);
        }
      } catch (err) {
        // Token invalid or expired: clear local credentials without recursive network calls
        if (isMounted) {
          clearStoredToken();
          try {
            localStorage.removeItem('agrosage_auth_username');
          } catch {}
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async ({ username, password, tenant_id }) => {
    const data = await authService.login({ username, password, tenant_id });
    setStoredToken(data.access_token);
    try {
      localStorage.setItem('agrosage_auth_username', username);
    } catch {}
    setToken(data.access_token);
    setUser({
      user_id: data.user_id,
      username: username,
      tenant_id: data.tenant_id,
      roles: data.roles,
      expires_at: data.expires_at,
    });
    return data;
  };

  const register = async ({ username, password, tenant_id, tenant_name, role }) => {
    const data = await authService.register({
      username,
      password,
      tenant_id,
      tenant_name,
      role,
    });
    return data;
  };

  const refreshUser = async () => {
    try {
      const userData = await authService.getMe();
      setUser(userData);
      return userData;
    } catch {
      handleUnauthorized();
      return null;
    }
  };

  const isAdmin = !!(user?.roles && (user.roles.includes('tenant_admin') || user.roles.includes('admin')));

  const value = {
    token,
    user,
    isAdmin,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

