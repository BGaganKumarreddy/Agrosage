import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sprout, Lock, User, Building, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Input, Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState('default');
  const [tenantName, setTenantName] = useState('');
  const [role, setRole] = useState('member');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { register, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    if (!username.trim() || !password) {
      setError('Please provide a username and password');
      return;
    }
    if (username.trim().length < 3) {
      setError('Username must contain at least 3 characters');
      return;
    }
    if (password.length < 12) {
      setError('Password must contain at least 12 characters');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await register({
        username: username.trim(),
        password,
        tenant_id: tenantId.trim() || 'default',
        tenant_name: tenantName.trim() || undefined,
        role,
      });

      toast.success('Registration successful! Logging in...', 'Account Created');

      // Automatically sign in upon registration and navigate to workspace
      try {
        await login({
          username: username.trim(),
          password,
          tenant_id: tenantId.trim() || 'default',
        });
        navigate('/workspace');
      } catch {
        navigate('/login');
      }
    } catch (err) {
      setError(err?.message || 'Registration failed');
      toast.error(err?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#212121] text-[#ECECEC] flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl bg-[#262626] border border-[#414141] shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#303030] border border-[#414141] text-[#8DBB91] flex items-center justify-center shadow-md">
            <Sprout className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight text-[#ECECEC]">AgroSage</h1>
            <span className="sr-only">AgroSage</span>
            <p className="text-xs text-[#A3A3A3]">Intelligence for Every Acre</p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[#ECECEC]">Create your account</h2>
          <p className="text-xs text-[#A3A3A3] mt-1">
            Join the seven-agent agricultural advisory intelligence platform
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
            placeholder="e.g. kiran_patel"
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
            placeholder="Minimum 12 characters"
            icon={Lock}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            helperText="Must be at least 12 characters long"
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

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Tenant ID"
              id="tenant_id"
              placeholder="default"
              icon={Building}
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              required
            />

            <Select
              label="Role"
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              options={[
                { value: 'member', label: 'Member' },
                { value: 'tenant_admin', label: 'Tenant Admin' },
              ]}
              placeholder=""
            />
          </div>

          <Input
            label="Tenant Name (Optional)"
            id="tenant_name"
            placeholder="e.g. Adilabad Cooperative"
            value={tenantName}
            onChange={(e) => setTenantName(e.target.value)}
            helperText="Only used when establishing a brand-new cooperative tenant"
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              isLoading={isLoading}
            >
              Create Account
            </Button>
          </div>
        </form>

        <div className="pt-4 border-t border-[#414141]/60 text-center">
          <p className="text-xs text-[#A3A3A3]">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#8DBB91] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
