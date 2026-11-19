import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Sprout, Lock, User, Building, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState('default');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const getSafeRedirectUrl = () => {
    const rawFrom = location.state?.from?.pathname || location.state?.from;
    if (
      typeof rawFrom === 'string' &&
      rawFrom.startsWith('/') &&
      !rawFrom.startsWith('//') &&
      rawFrom !== '/login' &&
      rawFrom !== '/register'
    ) {
      return rawFrom;
    }
    return '/workspace';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    if (!username.trim() || !password) {
      setError('Please enter your username and password');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await login({
        username: username.trim(),
        password,
        tenant_id: tenantId.trim() || 'default',
      });
      toast.success('Successfully authenticated', 'Welcome back');
      navigate(getSafeRedirectUrl(), { replace: true });
    } catch (err) {
      setError(err?.message || 'Invalid username, password, or tenant ID');
      toast.error(err?.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--theme-bg-main)] text-[var(--theme-text-main)] flex items-center justify-center p-4 select-none transition-colors">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[var(--theme-bg-card)] border border-[var(--theme-border)] shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[var(--theme-bg-composer)] border border-[var(--theme-border)] text-[var(--theme-accent)] flex items-center justify-center shadow-md">
            <Sprout className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight text-[var(--theme-text-main)]">AgroSage</h1>
            {/* Accessible alias for legacy tests */}
            <span className="sr-only">AgroSage</span>
            <p className="text-xs text-[var(--theme-accent)] font-medium">Intelligence for Every Acre</p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[#ECECEC]">Welcome back</h2>
          <p className="text-xs text-[#A3A3A3] mt-1">
            Sign in to access your agricultural intelligence workspace
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-200 leading-relaxed"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Username"
            id="username"
            placeholder="e.g. ramesh_farmer"
            icon={User}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Password"
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••••••"
            icon={Lock}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-[#737373] hover:text-[#ECECEC] focus:outline-none p-1 transition-colors"
                aria-label={showPassword ? 'Hide secret' : 'Show secret'}
                title={showPassword ? 'Hide secret' : 'Show secret'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />

          <Input
            label="Tenant ID"
            id="tenant_id"
            placeholder="default"
            icon={Building}
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            helperText="Default tenant is 'default' for personal farming accounts"
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </div>
        </form>

        <div className="pt-4 border-t border-[#414141]/60 text-center">
          <p className="text-xs text-[#A3A3A3]">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-semibold text-[#8DBB91] hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
