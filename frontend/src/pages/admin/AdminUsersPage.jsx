import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  ShieldCheck,
  UserCheck,
  UserX,
  Search,
  RefreshCw,
  ArrowLeft,
  Calendar,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Alert, Skeleton, EmptyState } from '../../components/ui/Feedback';

export const AdminUsersPage = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadUsers = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await adminService.getUsers();
      setUsers(res || []);
    } catch (err) {
      setError(err?.message || 'Failed to retrieve tenant users.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = users.filter((u) => {
    const term = search.toLowerCase();
    return (
      u.username.toLowerCase().includes(term) ||
      u.user_id.toLowerCase().includes(term) ||
      u.role.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to="/admin"
              className="text-xs text-[#8DBB91] hover:underline flex items-center gap-1 font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Control Center</span>
            </Link>
          </div>
          <h1 className="text-2xl font-extrabold text-[#ECECEC] tracking-tight">
            Tenant User Accounts
          </h1>
          <p className="text-sm text-[#A3A3A3] mt-1">
            Review registered farmers and administrative roles for tenant <span className="font-semibold text-[#ECECEC]">{user?.tenant_id}</span>.
          </p>
        </div>

        <Button variant="outline" size="sm" icon={RefreshCw} onClick={loadUsers} disabled={isLoading}>
          Refresh Accounts
        </Button>
      </div>

      {error && <Alert type="error" title="User Retrieval Failed" message={error} />}

      {/* Filter Bar */}
      <Card>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:w-80">
            <Input
              id="search-users"
              placeholder="Search by username or user ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={Search}
            />
          </div>
          <div className="text-xs font-semibold text-[#A3A3A3]">
            Total Accounts: <span className="text-[#ECECEC] font-bold">{filteredUsers.length}</span>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card>
        {isLoading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            title="No Users Found"
            description={search ? 'No tenant users match your search criteria.' : 'No users registered in this tenant.'}
            icon={Users}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#1f1f1f] text-[#A3A3A3] text-xs uppercase font-semibold border-b border-[#414141]">
                <tr>
                  <th className="py-3.5 px-4">Username / Identity</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 text-right">User ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#414141]/60">
                {filteredUsers.map((u) => {
                  const isAdmin = u.role === 'tenant_admin';
                  return (
                    <tr key={u.user_id} className="hover:bg-[#2a2a2a] transition-colors">
                      <td className="py-3.5 px-4 font-medium text-[#ECECEC]">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                              isAdmin
                                ? 'bg-amber-950/60 border border-amber-800/60 text-amber-300'
                                : 'bg-[#263e2d] border border-[#3d6545] text-[#8DBB91]'
                            }`}
                          >
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{u.username}</p>
                            <p className="text-[11px] text-[#737373]">{isAdmin ? 'Tenant Administrator' : 'Farmer Member'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={isAdmin ? 'active' : 'neutral'} size="sm">
                          {isAdmin ? 'tenant_admin' : 'member'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        {u.disabled ? (
                          <span className="inline-flex items-center gap-1 text-xs text-red-400 font-medium">
                            <UserX className="w-3.5 h-3.5" />
                            <span>Disabled</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-[#8DBB91] font-medium">
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#A3A3A3]">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{new Date(u.created_at).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-[#737373]">
                        {u.user_id.slice(0, 16)}...
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

