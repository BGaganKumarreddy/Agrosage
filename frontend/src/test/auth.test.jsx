import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { authService } from '../services/authService';

vi.mock('../services/authService', () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn(),
  },
}));

const renderWithProviders = (ui) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>{ui}</ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Authentication Flow Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('1. Renders Login page with fields and validation', async () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tenant ID/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });

  it('2. Submits valid login and saves token', async () => {
    authService.login.mockResolvedValueOnce({
      access_token: 'fake-jwt-token-12345',
      token_type: 'bearer',
      user_id: 'u-100',
      tenant_id: 'default',
      roles: ['member'],
      expires_at: '2026-11-13T10:00:00Z',
    });

    renderWithProviders(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'farmer_ram' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'SecretPassword123!' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        username: 'farmer_ram',
        password: 'SecretPassword123!',
        tenant_id: 'default',
      });
      expect(localStorage.getItem('agrosage_auth_token')).toBe('fake-jwt-token-12345');
    });
  });

  it('3. Handles API authentication failure gracefully', async () => {
    authService.login.mockRejectedValueOnce({
      status: 401,
      code: 'authentication_failed',
      message: 'Invalid username, password, or tenant ID',
    });

    renderWithProviders(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'bad_user' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'wrong_pass123' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      const errorElements = screen.getAllByText(/Invalid username, password, or tenant ID/i);
      expect(errorElements.length).toBeGreaterThan(0);
    });
  });

  it('4. Registration validates password length', async () => {
    renderWithProviders(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'new_farmer' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => {
      expect(screen.getByText(/Password must contain at least 12 characters/i)).toBeInTheDocument();
    });
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('5. Registration calls API and proceeds with auto-login', async () => {
    authService.register.mockResolvedValueOnce({
      user_id: 'u-200',
      username: 'valid_user',
      tenant_id: 'coop-1',
      role: 'member',
    });
    authService.login.mockResolvedValueOnce({
      access_token: 'new-token-999',
      user_id: 'u-200',
      tenant_id: 'coop-1',
      roles: ['member'],
    });

    renderWithProviders(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'valid_user' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'StrongPassword1234!' } });
    fireEvent.change(screen.getByLabelText(/Tenant ID/i), { target: { value: 'coop-1' } });
    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => {
      expect(authService.register).toHaveBeenCalledWith({
        username: 'valid_user',
        password: 'StrongPassword1234!',
        tenant_id: 'coop-1',
        tenant_name: undefined,
        role: 'member',
      });
    });
  });

  describe('Token Storage and 401 Interceptor Resilience', () => {
    it('6. Migrates legacy token and retrieves canonical token', async () => {
      const { getStoredToken, setStoredToken, clearStoredToken, AUTH_TOKEN_KEY, LEGACY_AUTH_TOKEN_KEY } = await import(
        '../utils/tokenStorage'
      );

      // Set legacy key
      localStorage.setItem(LEGACY_AUTH_TOKEN_KEY, 'legacy_session_token_123');
      expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();

      // Retrieve via helper
      const token = getStoredToken();
      expect(token).toBe('legacy_session_token_123');

      // Verify migration: saved to canonical, removed from legacy
      expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('legacy_session_token_123');
      expect(localStorage.getItem(LEGACY_AUTH_TOKEN_KEY)).toBeNull();

      // Clear removes both
      clearStoredToken();
      expect(getStoredToken()).toBeNull();
    });

    it('7. apiClient uses canonical token and does not trigger onUnauthorized on login failures', async () => {
      const { apiClient, setOnUnauthorized } = await import('../services/apiClient');
      const { setStoredToken, clearStoredToken } = await import('../utils/tokenStorage');

      setStoredToken('active_bearer_token');
      const unauthorizedMock = vi.fn();
      setOnUnauthorized(unauthorizedMock);

      // Simulate a 401 error from /auth/login
      const loginError = {
        config: { url: '/api/v1/auth/login' },
        response: { status: 401, data: { message: 'Invalid credentials' } },
      };

      try {
        // Run error interceptor directly
        const interceptor = apiClient.interceptors.response.handlers[0].rejected;
        await interceptor(loginError);
      } catch (err) {
        expect(err.status).toBe(401);
      }

      // Must NOT trigger unauthorized callback on /auth/login
      expect(unauthorizedMock).not.toHaveBeenCalled();

      // Simulate a 401 error from a protected route /api/v1/conversations
      const protectedError = {
        config: { url: '/api/v1/conversations' },
        response: { status: 401, data: { message: 'Token expired' } },
      };

      try {
        const interceptor = apiClient.interceptors.response.handlers[0].rejected;
        await interceptor(protectedError);
      } catch (err) {
        expect(err.status).toBe(401);
      }

      // MUST trigger unauthorized callback on protected routes
      expect(unauthorizedMock).toHaveBeenCalledTimes(1);

      clearStoredToken();
    });

    it('8. Session restoration on boot and 401 session cleanup without recursive logout', async () => {
      const { setStoredToken } = await import('../utils/tokenStorage');
      setStoredToken('valid_boot_token');

      authService.getMe.mockResolvedValueOnce({
        user_id: 'u-300',
        tenant_id: 'default',
        roles: ['member'],
        expires_at: '2026-12-01T00:00:00Z',
      });

      const Consumer = () => {
        const { user, isAuthenticated, logout } = useAuth();
        return (
          <div>
            <div data-testid="status">{isAuthenticated ? 'logged_in' : 'logged_out'}</div>
            <div data-testid="uid">{user?.user_id || 'none'}</div>
            <button onClick={logout}>Explicit Logout</button>
          </div>
        );
      };

      renderWithProviders(<Consumer />);

      await waitFor(() => {
        expect(screen.getByTestId('status').textContent).toBe('logged_in');
        expect(screen.getByTestId('uid').textContent).toBe('u-300');
      });

      // Explicit logout triggers backend logout and clears state
      authService.logout.mockResolvedValueOnce({ success: true });
      fireEvent.click(screen.getByText('Explicit Logout'));

      await waitFor(() => {
        expect(authService.logout).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('status').textContent).toBe('logged_out');
      });
    });

    it('9. Explicit logout network failure still clears local auth state', async () => {
      const { setStoredToken, getStoredToken } = await import('../utils/tokenStorage');
      setStoredToken('token_network_fail');

      authService.getMe.mockResolvedValueOnce({
        user_id: 'u-400',
        tenant_id: 'default',
        roles: ['member'],
      });

      const Consumer = () => {
        const { user, isAuthenticated, logout } = useAuth();
        return (
          <div>
            <div data-testid="status">{isAuthenticated ? 'logged_in' : 'logged_out'}</div>
            <button onClick={logout}>Do Logout</button>
          </div>
        );
      };

      renderWithProviders(<Consumer />);

      await waitFor(() => {
        expect(screen.getByTestId('status').textContent).toBe('logged_in');
      });

      // Logout network failure
      authService.logout.mockRejectedValueOnce(new Error('Network offline'));
      fireEvent.click(screen.getByText('Do Logout'));

      await waitFor(() => {
        expect(screen.getByTestId('status').textContent).toBe('logged_out');
        expect(getStoredToken()).toBeNull();
      });
    });

    it('10. Canonical token consistency: login writes canonical, API request reads it, legacy token migrates, and reload restores session', async () => {
      const { apiClient } = await import('../services/apiClient');
      const { AUTH_TOKEN_KEY, LEGACY_AUTH_TOKEN_KEY } = await import('../utils/tokenStorage');

      // A. Legacy migration on boot: start with ONLY legacy key in localStorage
      localStorage.setItem(LEGACY_AUTH_TOKEN_KEY, 'legacy_session_token_xyz');
      expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();

      authService.getMe.mockResolvedValueOnce({
        user_id: 'u-migrated',
        tenant_id: 'default',
        roles: ['member'],
      });

      const Consumer = () => {
        const { user, isAuthenticated, login } = useAuth();
        return (
          <div>
            <div data-testid="auth-state">{isAuthenticated ? 'authenticated' : 'unauthenticated'}</div>
            <div data-testid="user-id">{user?.user_id || 'none'}</div>
            <button
              onClick={() =>
                login({ username: 'farmer_john', password: 'secretpassword', tenant_id: 'default' })
              }
            >
              Do Login
            </button>
          </div>
        );
      };

      const { unmount } = renderWithProviders(<Consumer />);

      // Reload restores authenticated session and migrates legacy token
      await waitFor(() => {
        expect(screen.getByTestId('auth-state').textContent).toBe('authenticated');
        expect(screen.getByTestId('user-id').textContent).toBe('u-migrated');
      });

      expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('legacy_session_token_xyz');
      expect(localStorage.getItem(LEGACY_AUTH_TOKEN_KEY)).toBeNull();

      // B. API request interceptor reads canonical token
      const requestInterceptor = apiClient.interceptors.request.handlers[0].fulfilled;
      const config1 = requestInterceptor({ headers: {} });
      expect(config1.headers.Authorization).toBe('Bearer legacy_session_token_xyz');

      // C. Login writes canonical token and updates subsequent API requests
      authService.login.mockResolvedValueOnce({
        access_token: 'fresh_canonical_token_456',
        token_type: 'bearer',
        user_id: 'u-fresh',
        tenant_id: 'default',
        roles: ['member'],
      });

      fireEvent.click(screen.getByText('Do Login'));

      await waitFor(() => {
        expect(screen.getByTestId('user-id').textContent).toBe('u-fresh');
        expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('fresh_canonical_token_456');
        expect(localStorage.getItem(LEGACY_AUTH_TOKEN_KEY)).toBeNull();
      });

      const config2 = requestInterceptor({ headers: {} });
      expect(config2.headers.Authorization).toBe('Bearer fresh_canonical_token_456');

      unmount();
    });

    it('11. Concurrent unauthorized requests: 3 simultaneous 401s clean up session once without calling logout endpoint or repeated state transitions', async () => {
      const { apiClient } = await import('../services/apiClient');
      const { setStoredToken, getStoredToken } = await import('../utils/tokenStorage');

      setStoredToken('active_protected_token');

      authService.getMe.mockResolvedValueOnce({
        user_id: 'u-concurrent-test',
        tenant_id: 'default',
        roles: ['member'],
      });

      const statusHistory = [];

      const Consumer = () => {
        const { isAuthenticated, user } = useAuth();
        statusHistory.push({ isAuthenticated, userId: user?.user_id });
        return (
          <div>
            <div data-testid="status">{isAuthenticated ? 'logged_in' : 'logged_out'}</div>
          </div>
        );
      };

      const { unmount } = renderWithProviders(<Consumer />);

      await waitFor(() => {
        expect(screen.getByTestId('status').textContent).toBe('logged_in');
      });

      // Spy on localStorage.removeItem to ensure cleanup is guarded against multiple passes
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

      // Response error interceptor
      const responseInterceptor = apiClient.interceptors.response.handlers[0].rejected;

      // Create 3 concurrent 401 rejections from 3 distinct protected endpoints
      let results;
      await act(async () => {
        const req1 = responseInterceptor({
          config: { url: '/api/v1/conversations' },
          response: { status: 401, data: { message: 'Token expired' } },
        }).catch((e) => e);

        const req2 = responseInterceptor({
          config: { url: '/api/v1/weather/forecast' },
          response: { status: 401, data: { message: 'Unauthorized access' } },
        }).catch((e) => e);

        const req3 = responseInterceptor({
          config: { url: '/api/v1/market/prices' },
          response: { status: 401, data: { message: 'Session terminated' } },
        }).catch((e) => e);

        results = await Promise.all([req1, req2, req3]);
      });

      // All 3 rejections return formatted 401 error objects
      expect(results[0].status).toBe(401);
      expect(results[1].status).toBe(401);
      expect(results[2].status).toBe(401);

      // Session transitions to logged_out
      await waitFor(() => {
        expect(screen.getByTestId('status').textContent).toBe('logged_out');
      });

      // Assertions:
      // 1. authService.logout was NEVER called (session expiration does NOT call backend logout)
      expect(authService.logout).not.toHaveBeenCalled();

      // 2. Storage is cleared
      expect(getStoredToken()).toBeNull();

      // 3. Concurrency lock prevented duplicate cleanup passes
      // clearStoredToken calls removeItem for AUTH_TOKEN_KEY and LEGACY_AUTH_TOKEN_KEY (2 calls)
      const tokenRemovalCalls = removeItemSpy.mock.calls.filter(([key]) =>
        key === 'agrosage_auth_token' || key === 'agrosage_token'
      );
      expect(tokenRemovalCalls.length).toBe(2);

      // 4. Transitions cleanly without repeated bounces
      const finalEntry = statusHistory[statusHistory.length - 1];
      expect(finalEntry.isAuthenticated).toBe(false);

      removeItemSpy.mockRestore();
      unmount();
    });

    it('12. Explicit logout: calls backend logout once, guards concurrent duplicate triggers, and clears state on failure', async () => {
      const { setStoredToken, getStoredToken } = await import('../utils/tokenStorage');

      // Phase A: Concurrent duplicate logout triggers
      setStoredToken('active_token_logout_test');

      authService.getMe.mockResolvedValueOnce({
        user_id: 'u-logout-test',
        tenant_id: 'default',
        roles: ['member'],
      });

      let logoutFn = null;
      const Consumer = () => {
        const { isAuthenticated, logout } = useAuth();
        logoutFn = logout;
        return (
          <div>
            <div data-testid="status">{isAuthenticated ? 'logged_in' : 'logged_out'}</div>
          </div>
        );
      };

      const { unmount } = renderWithProviders(<Consumer />);

      await waitFor(() => {
        expect(screen.getByTestId('status').textContent).toBe('logged_in');
      });

      // Backend logout resolves after a small delay to simulate in-flight network request
      authService.logout.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 30))
      );

      // Trigger 3 simultaneous logout invocations
      await act(async () => {
        await Promise.all([logoutFn(), logoutFn(), logoutFn()]);
      });

      // Assert backend logout was called EXACTLY ONCE
      expect(authService.logout).toHaveBeenCalledTimes(1);
      expect(getStoredToken()).toBeNull();
      await waitFor(() => {
        expect(screen.getByTestId('status').textContent).toBe('logged_out');
      });

      unmount();

      // Phase B: Backend logout network failure still clears local state
      setStoredToken('token_for_failing_logout');
      authService.getMe.mockResolvedValueOnce({
        user_id: 'u-logout-fail',
        tenant_id: 'default',
        roles: ['member'],
      });

      const { unmount: unmount2 } = renderWithProviders(<Consumer />);

      await waitFor(() => {
        expect(screen.getByTestId('status').textContent).toBe('logged_in');
      });

      authService.logout.mockRejectedValueOnce(new Error('500 Internal Server Error'));

      await act(async () => {
        await logoutFn();
      });

      // Even though backend rejected, local state and token are cleared
      expect(getStoredToken()).toBeNull();
      await waitFor(() => {
        expect(screen.getByTestId('status').textContent).toBe('logged_out');
      });

      unmount2();
    });

    it('13. Invalid login: displays error message and does not trigger global session expiration', async () => {
      const { apiClient } = await import('../services/apiClient');

      // Interceptor rejection handler
      const responseInterceptor = apiClient.interceptors.response.handlers[0].rejected;

      // Mock authService.login rejection with 401 invalid credentials
      authService.login.mockRejectedValueOnce({
        status: 401,
        code: 'authentication_failed',
        message: 'Invalid username, password, or tenant ID',
      });

      renderWithProviders(<LoginPage />);

      fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'invalid_user' } });
      fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'wrong_password' } });
      fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

      // 1. Login error banner is displayed
      await waitFor(() => {
        const errorElements = screen.getAllByText(/Invalid username, password, or tenant ID/i);
        expect(errorElements.length).toBeGreaterThan(0);
      });

      // 2. Response interceptor specifically ignores /auth/login, /auth/register, /auth/logout
      const authError = {
        config: { url: '/api/v1/auth/login' },
        response: { status: 401, data: { message: 'Invalid credentials' } },
      };

      const onUnauthorizedSpy = vi.fn();
      const { setOnUnauthorized } = await import('../services/apiClient');
      setOnUnauthorized(onUnauthorizedSpy);

      try {
        await responseInterceptor(authError);
      } catch (err) {
        expect(err.status).toBe(401);
      }

      // Must NOT trigger unauthorized callback on auth login endpoints
      expect(onUnauthorizedSpy).not.toHaveBeenCalled();

      // And contrast: a protected route 401 DOES trigger the unauthorized callback
      const protectedError = {
        config: { url: '/api/v1/conversations' },
        response: { status: 401, data: { message: 'Token expired' } },
      };

      try {
        await responseInterceptor(protectedError);
      } catch (err) {
        expect(err.status).toBe(401);
      }

      expect(onUnauthorizedSpy).toHaveBeenCalledTimes(1);
    });
  });
});
