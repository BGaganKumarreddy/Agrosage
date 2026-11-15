import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Server,
  Shield,
  Database,
  Lock,
  Layers,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  Cpu,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Alert, Skeleton } from '../../components/ui/Feedback';

export const AdminSystemPage = () => {
  const [system, setSystem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSystem = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await adminService.getSystem();
      setSystem(res);
    } catch (err) {
      setError(err?.message || 'Failed to inspect system specifications.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSystem();
  }, []);

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
            System & Security Architecture Specifications
          </h1>
          <p className="text-sm text-[#A3A3A3] mt-1">
            Cryptographic standards, database configuration, and agricultural catalog sizing.
          </p>
        </div>

        <Button variant="outline" size="sm" icon={RefreshCw} onClick={loadSystem} disabled={isLoading}>
          Refresh Specs
        </Button>
      </div>

      {error && <Alert type="error" title="Specifications Retrieval Failed" message={error} />}

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      ) : system ? (
        <div className="space-y-6">
          <Card>
            <div className="space-y-4">
              <h2 className="text-base font-bold text-[#ECECEC] flex items-center gap-2 border-b border-[#414141]/60 pb-3">
                <Lock className="w-5 h-5 text-[#8DBB91]" />
                <span>Cryptographic & Identity Architecture</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-[#1f1f1f] rounded-xl border border-[#414141]">
                  <p className="text-xs font-semibold text-[#A3A3A3] uppercase">Authentication Security</p>
                  <p className="font-mono text-sm font-bold text-[#ECECEC] mt-1">{system.password_hash}</p>
                  <p className="text-xs text-[#737373] mt-1">Zero plaintext storage; server-side SHA-256 session token digest</p>
                </div>

                <div className="p-3 bg-[#1f1f1f] rounded-xl border border-[#414141]">
                  <p className="text-xs font-semibold text-[#A3A3A3] uppercase">BYOK Credential Vault</p>
                  <p className="font-mono text-sm font-bold text-[#ECECEC] mt-1">{system.encryption_algorithm}</p>
                  <p className="text-xs text-[#737373] mt-1">Key-encrypting-key (KEK) wrapped master keys with owner-only policy</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-4">
              <h2 className="text-base font-bold text-[#ECECEC] flex items-center gap-2 border-b border-[#414141]/60 pb-3">
                <Database className="w-5 h-5 text-[#8DBB91]" />
                <span>Agricultural Registries & Sizing</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-[#1f1f1f] rounded-xl border border-[#414141] text-center">
                  <p className="text-xs font-semibold text-[#A3A3A3] uppercase">Registered Crops</p>
                  <p className="text-3xl font-extrabold text-[#8DBB91] mt-1">{system.registered_crops_count}</p>
                  <p className="text-xs text-[#737373] mt-1">Cited ICAR botanical records</p>
                </div>

                <div className="p-4 bg-[#1f1f1f] rounded-xl border border-[#414141] text-center">
                  <p className="text-xs font-semibold text-[#A3A3A3] uppercase">Geographic Scopes</p>
                  <p className="text-3xl font-extrabold text-[#8DBB91] mt-1">{system.registered_locations_count}</p>
                  <p className="text-xs text-[#737373] mt-1">State and district divisions</p>
                </div>

                <div className="p-4 bg-[#1f1f1f] rounded-xl border border-[#414141] text-center">
                  <p className="text-xs font-semibold text-[#A3A3A3] uppercase">Validated Coverage Pairs</p>
                  <p className="text-3xl font-extrabold text-[#8DBB91] mt-1">{system.coverage_pairs_count}</p>
                  <p className="text-xs text-[#737373] mt-1">Explicit crop-location pairs</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-4">
              <h2 className="text-base font-bold text-[#ECECEC] flex items-center gap-2 border-b border-[#414141]/60 pb-3">
                <Server className="w-5 h-5 text-[#8DBB91]" />
                <span>Runtime Environment</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-[#A3A3A3] font-medium">Framework:</span>
                  <p className="text-[#ECECEC] font-semibold mt-0.5">{system.framework}</p>
                </div>
                <div>
                  <span className="text-[#A3A3A3] font-medium">Database Engine:</span>
                  <p className="text-[#ECECEC] font-semibold mt-0.5">{system.storage_engine}</p>
                </div>
                <div>
                  <span className="text-[#A3A3A3] font-medium">Deployment Target:</span>
                  <p className="text-[#ECECEC] font-semibold mt-0.5">{system.environment}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
};

