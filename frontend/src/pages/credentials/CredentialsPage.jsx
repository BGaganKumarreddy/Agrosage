import React, { useState, useEffect, useCallback } from 'react';
import {
  KeyRound,
  Plus,
  Trash2,
  ShieldCheck,
  Lock,
  ExternalLink,
  CheckCircle2,
  Eye,
  EyeOff,
  RotateCw,
  Activity,
  AlertTriangle,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { credentialService } from '../../services/credentialService';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, CardSkeleton, Alert } from '../../components/ui/Feedback';

const PROVIDER_METADATA = {
  cerebras: {
    name: 'Cerebras Cloud Inference',
    model: 'gpt-oss-120b (Wafer-scale 30k TPM)',
    desc: 'Ultra-fast inference with dedicated token reservation.',
    docs: 'https://cloud.cerebras.ai',
    badge: 'Fastest',
    prefix: 'csk-',
  },
  gemini: {
    name: 'Google Gemini AI Studio',
    model: 'gemini-2.5-flash / gemini-2.5-pro',
    desc: 'DeepMind multimodal reasoning via Google AI Studio API key.',
    docs: 'https://aistudio.google.com',
    badge: 'Multimodal',
    prefix: 'AIza',
  },
  groq: {
    name: 'Groq Cloud LPU',
    model: 'llama-3.3-70b-versatile (7.2k TPM)',
    desc: 'Low-latency language processing unit with strict token ceilings.',
    docs: 'https://console.groq.com',
    badge: 'LPU Engine',
    prefix: 'gsk_',
  },
  'data.gov.in': {
    name: 'Agmarknet Mandi Prices (data.gov.in)',
    model: 'Ministry of Agriculture Mandi Data',
    desc: 'API token for querying live APMC market prices across India.',
    docs: 'https://data.gov.in',
    badge: 'Market Feed',
    prefix: 'data',
  },
};

const EXECUTION_MODES = [
  {
    id: 'deterministic',
    name: 'Deterministic Baseline',
    desc: 'Rule-based expert agricultural reasoning. Zero LLM cost or cloud calls.',
    requiresKey: null,
  },
  {
    id: 'cerebras',
    name: 'Cerebras Cloud Inference',
    desc: 'Hardware wafer-scale speed with full 7-agent synthesis.',
    requiresKey: 'cerebras',
  },
  {
    id: 'groq',
    name: 'Groq Cloud LPU',
    desc: 'Ultra low-latency Llama-3.3-70B multi-agent inference.',
    requiresKey: 'groq',
  },
  {
    id: 'gemini',
    name: 'Google Gemini AI Studio',
    desc: 'DeepMind reasoning engine via Google AI Studio key.',
    requiresKey: 'gemini',
  },
];

export const CredentialsPage = () => {
  const toast = useToast();

  const [credentials, setCredentials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active provider selector state
  const [activeProvider, setActiveProvider] = useState(() => {
    try {
      return localStorage.getItem('agrosage_active_provider') || 'deterministic';
    } catch {
      return 'deterministic';
    }
  });

  // New Credential Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('cerebras');
  const [secretKey, setSecretKey] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [addError, setAddError] = useState('');
  const [addTestResult, setAddTestResult] = useState(null);
  const [isTestingAdd, setIsTestingAdd] = useState(false);

  // Replace / Rotate Credential Modal State
  const [rotateTarget, setRotateTarget] = useState(null);
  const [rotateSecret, setRotateSecret] = useState('');
  const [showRotateSecret, setShowRotateSecret] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [rotateError, setRotateError] = useState('');
  const [rotateTestResult, setRotateTestResult] = useState(null);
  const [isTestingRotate, setIsTestingRotate] = useState(false);

  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Live test status per credential ID: { [credId]: { loading: bool, result: object | null } }
  const [testStatuses, setTestStatuses] = useState({});

  const loadCredentials = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await credentialService.listCredentials();
      setCredentials(data.items || []);
    } catch (err) {
      toast.error('Failed to load stored BYOK credentials');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  const handleActiveProviderChange = (newMode) => {
    setActiveProvider(newMode);
    try {
      localStorage.setItem('agrosage_active_provider', newMode);
      localStorage.setItem('agrosage_execution_mode', newMode);
    } catch {}
    toast.success(`Active AI provider set to ${newMode.toUpperCase()}`, 'Workspace Updated');
  };

  const handleCreateCredential = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!secretKey.trim()) {
      setAddError('Please enter the provider API secret key');
      return;
    }

    setAddError('');
    setIsSaving(true);

    try {
      await credentialService.createCredential({
        provider_id: selectedProvider,
        secret: secretKey.trim(),
      });

      setSecretKey('');
      setShowSecret(false);
      setAddTestResult(null);
      setIsAddOpen(false);
      toast.success(
        `Enrolled ${selectedProvider} API key with AES-256-GCM encryption`,
        'Credential Stored'
      );
      loadCredentials();
    } catch (err) {
      setAddError(err?.message || 'Failed to enroll credential in vault');
      toast.error(err?.message || 'Enrollment failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestUnsaved = async () => {
    if (!secretKey.trim()) {
      setAddError('Please enter an API key to test connectivity');
      return;
    }
    setIsTestingAdd(true);
    setAddTestResult(null);
    setAddError('');
    try {
      const result = await credentialService.testUnsavedCredential({
        provider_id: selectedProvider,
        secret: secretKey.trim(),
      });
      setAddTestResult(result);
      if (result.ok) {
        toast.success(`Connected in ${result.latency_ms}ms`, 'Connection Verified');
      } else {
        toast.error(result.message || 'Connection test failed', 'Provider Verification');
      }
    } catch (err) {
      setAddTestResult({
        ok: false,
        status: 'connection_error',
        message: err?.message || 'Connection test failed',
      });
      toast.error(err?.message || 'Connection test failed');
    } finally {
      setIsTestingAdd(false);
    }
  };

  const handleRotateCredential = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!rotateTarget || !rotateSecret.trim()) {
      setRotateError('Please enter the replacement API key');
      return;
    }

    setRotateError('');
    setIsRotating(true);

    try {
      await credentialService.rotateCredential(rotateTarget.credential_id, {
        secret: rotateSecret.trim(),
      });

      setRotateSecret('');
      setShowRotateSecret(false);
      setRotateTestResult(null);
      setRotateTarget(null);
      toast.success(
        `Rotated credential for ${rotateTarget.provider_id}. Incrementing generation.`,
        'Key Rotated'
      );
      loadCredentials();
    } catch (err) {
      setRotateError(err?.message || 'Failed to rotate credential');
      toast.error(err?.message || 'Rotation failed');
    } finally {
      setIsRotating(false);
    }
  };

  const handleTestRotate = async () => {
    if (!rotateSecret.trim() || !rotateTarget) {
      setRotateError('Please enter an API key to test');
      return;
    }
    setIsTestingRotate(true);
    setRotateTestResult(null);
    setRotateError('');
    try {
      const result = await credentialService.testUnsavedCredential({
        provider_id: rotateTarget.provider_id,
        secret: rotateSecret.trim(),
      });
      setRotateTestResult(result);
      if (result.ok) {
        toast.success(`Connected in ${result.latency_ms}ms`, 'Connection Verified');
      } else {
        toast.error(result.message || 'Connection test failed');
      }
    } catch (err) {
      setRotateTestResult({
        ok: false,
        status: 'connection_error',
        message: err?.message || 'Connection test failed',
      });
    } finally {
      setIsTestingRotate(false);
    }
  };

  const handleTestStored = async (cred) => {
    setTestStatuses((prev) => ({
      ...prev,
      [cred.credential_id]: { loading: true, result: null },
    }));

    try {
      const result = await credentialService.testStoredCredential(cred.credential_id);
      setTestStatuses((prev) => ({
        ...prev,
        [cred.credential_id]: { loading: false, result },
      }));
      if (result.ok) {
        toast.success(
          `${result.provider_id.toUpperCase()} responded in ${result.latency_ms}ms`,
          'Connected'
        );
      } else {
        toast.error(result.message || 'Connection test failed', 'Provider Offline');
      }
    } catch (err) {
      setTestStatuses((prev) => ({
        ...prev,
        [cred.credential_id]: {
          loading: false,
          result: {
            ok: false,
            status: 'connection_error',
            message: err?.message || 'Network error',
          },
        },
      }));
      toast.error(err?.message || 'Connection test failed');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await credentialService.deleteCredential(deleteTarget.credential_id);
      toast.success(
        `Deleted credential for ${deleteTarget.provider_id}`,
        'Vault Updated'
      );
      setDeleteTarget(null);
      loadCredentials();
    } catch (err) {
      toast.error(err?.message || 'Failed to delete credential');
    } finally {
      setIsDeleting(false);
    }
  };

  const enrolledProviderIds = new Set(
    credentials.map((c) => c.provider_id.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#414141]/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="active" size="sm">Zero-Knowledge Vault</Badge>
            <span className="text-xs text-[#A3A3A3]">• AES-256-GCM Envelope Encryption</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#ECECEC] tracking-tight">
            AI Providers & BYOK Credential Vault
          </h1>
          <p className="text-sm text-[#A3A3A3] mt-0.5">
            Manage your AI inference providers and secure API credentials. Plaintext keys are encrypted on save and never leaked.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={Plus}
          onClick={() => {
            setAddError('');
            setSecretKey('');
            setShowSecret(false);
            setAddTestResult(null);
            setIsAddOpen(true);
          }}
        >
          Add Provider Key
        </Button>
      </div>

      {/* Security Architecture Callout */}
      <div className="p-4 rounded-2xl bg-[#1e2a21] border border-[#8DBB91]/50 flex items-start gap-3.5">
        <ShieldCheck className="w-5 h-5 text-[#8DBB91] shrink-0 mt-0.5" />
        <div className="text-xs text-[#A3A3A3] leading-relaxed">
          <span className="font-bold text-[#ECECEC]">Hardware-Backed Security Guarantee: </span>
          Each API key is encrypted with a unique Data Encryption Key (DEK) and wrapped with an OS-level Key Encryption Key (KEK) via Windows DPAPI / Credential Manager. Plaintext keys are never returned across the network and never exposed to other tenant users.
        </div>
      </div>

      {/* Active Workspace Provider Selector */}
      <Card
        title="Active Workspace AI Provider"
        subtitle="Select the primary inference engine used for new agricultural consultations"
        headerIcon={Sparkles}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {EXECUTION_MODES.map((mode) => {
            const isSelected = activeProvider === mode.id;
            const hasEnrolledKey = mode.requiresKey ? enrolledProviderIds.has(mode.requiresKey) : true;

            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => handleActiveProviderChange(mode.id)}
                className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#8DBB91] bg-[#1a2e20]/60 ring-2 ring-[#8DBB91]/30'
                    : 'border-[#414141] bg-[#1f1f1f] hover:border-[#8DBB91]/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-[#ECECEC]">
                      {mode.name}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] bg-[#8DBB91] text-[#171717] font-bold px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#A3A3A3] leading-relaxed mb-3">
                    {mode.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#414141]/50 flex items-center justify-between text-[10px]">
                  {mode.requiresKey ? (
                    hasEnrolledKey ? (
                      <span className="text-[#8DBB91] flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3 h-3" /> Key Ready
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1 font-medium">
                        <AlertTriangle className="w-3 h-3" /> Key Required
                      </span>
                    )
                  ) : (
                    <span className="text-[#A3A3A3] font-medium">No Key Needed</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Active Enrolled Credentials List */}
      <Card
        title="Enrolled Provider Credentials"
        subtitle="Active encrypted keys available for multi-agent execution"
        headerIcon={KeyRound}
      >
        {isLoading ? (
          <div className="space-y-3">
            <CardSkeleton />
          </div>
        ) : credentials.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title="No BYOK Credentials Enrolled"
            description="You are currently using the local Deterministic Baseline. To enable Cerebras, Gemini, Groq, or live Mandi prices, add your API key."
            action={
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => {
                  setAddError('');
                  setSecretKey('');
                  setShowSecret(false);
                  setAddTestResult(null);
                  setIsAddOpen(true);
                }}
              >
                Add Your First Key
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {credentials.map((cred) => {
              const meta = PROVIDER_METADATA[cred.provider_id.toLowerCase()] || {
                name: cred.provider_id,
                desc: 'External provider key',
                prefix: 'key-',
              };

              const testState = testStatuses[cred.credential_id] || { loading: false, result: null };

              return (
                <div
                  key={cred.credential_id}
                  className="p-4 rounded-xl border border-[#414141] bg-[#1f1f1f] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-[#8DBB91]/50"
                >
                  <div className="min-w-0 space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-[#ECECEC]">
                        {meta.name}
                      </span>
                      <Badge variant="completed" size="sm">
                        {cred.state}
                      </Badge>
                      {meta.badge && (
                        <span className="text-[10px] bg-[#2a2a2a] border border-[#414141] text-[#8DBB91] font-semibold px-2 py-0.5 rounded-md">
                          {meta.badge}
                        </span>
                      )}
                      {testState.result && (
                        testState.result.ok ? (
                          <span className="text-[10px] bg-emerald-950/80 border border-emerald-600/60 text-emerald-300 font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Connected ({testState.result.latency_ms}ms)
                          </span>
                        ) : (
                          <span className="text-[10px] bg-red-950/80 border border-red-600/60 text-red-300 font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-red-400" /> {testState.result.status.replace('_', ' ')}
                          </span>
                        )
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#A3A3A3]">
                      <span>Key: <code className="bg-[#171717] px-1.5 py-0.5 rounded border border-[#414141] font-mono text-[#8DBB91]">••••••••••••••••</code></span>
                      <span>•</span>
                      <span className="truncate">ID: <code className="bg-[#171717] px-1.5 py-0.5 rounded border border-[#414141] font-mono text-[#ECECEC]">{cred.credential_id}</code></span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#737373]">
                      <span>Generation: <strong className="text-[#A3A3A3]">{cred.generation}</strong></span>
                      <span>•</span>
                      <span>Updated: <strong className="text-[#A3A3A3]">{new Date(cred.updated_at).toLocaleDateString()}</strong></span>
                      <span>•</span>
                      <span className="text-[#8DBB91] font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Encrypted at rest
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Activity}
                      isLoading={testState.loading}
                      onClick={() => handleTestStored(cred)}
                      title="Test live API connectivity with this provider"
                    >
                      Test Connection
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      icon={RotateCw}
                      onClick={() => {
                        setRotateTarget(cred);
                        setRotateSecret('');
                        setShowRotateSecret(false);
                        setRotateError('');
                        setRotateTestResult(null);
                      }}
                      title="Replace/rotate this key with a new secret"
                    >
                      Replace Key
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      icon={Trash2}
                      className="text-red-400 hover:bg-red-950/40 hover:border-red-800/60"
                      onClick={() => setDeleteTarget(cred)}
                      title="Permanently erase this credential"
                    >
                      Delete Key
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Supported Providers Catalog */}
      <div>
        <h3 className="text-sm font-bold text-[#ECECEC] mb-3">Supported BYOK Ecosystem</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(PROVIDER_METADATA).map(([key, p]) => (
            <Card key={key} padding="p-4" className="flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="active" size="sm">{key}</Badge>
                  <a
                    href={p.docs}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#A3A3A3] hover:text-[#8DBB91]"
                    title="API Documentation"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <h4 className="font-semibold text-xs text-[#ECECEC] mb-1">{p.name}</h4>
                <p className="text-[11px] text-[#A3A3A3] leading-relaxed mb-2">{p.desc}</p>
              </div>
              <div className="pt-2 border-t border-[#414141]/60 text-[10px] text-[#8DBB91] font-medium">
                {p.model}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Add Credential Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Enroll BYOK Provider Key"
        subtitle="Keys are encrypted with AES-256-GCM and bound to your tenant"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              icon={Activity}
              onClick={handleTestUnsaved}
              isLoading={isTestingAdd}
              disabled={isSaving || !secretKey.trim()}
            >
              Test Connection
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateCredential}
                isLoading={isSaving}
                icon={Lock}
              >
                Encrypt & Store
              </Button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleCreateCredential} className="space-y-4">
          {addError && <Alert type="error">{addError}</Alert>}

          {addTestResult && (
            <div
              className={`p-3 rounded-xl border text-xs leading-relaxed flex items-center gap-2.5 ${
                addTestResult.ok
                  ? 'bg-emerald-950/60 border-emerald-600/70 text-emerald-200'
                  : 'bg-red-950/60 border-red-600/70 text-red-200'
              }`}
            >
              {addTestResult.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <div>
                <span className="font-bold">{addTestResult.status.toUpperCase()}: </span>
                <span>{addTestResult.message}</span>
                {addTestResult.latency_ms && (
                  <span className="block text-[10px] text-[#A3A3A3] mt-0.5">
                    Latency: {addTestResult.latency_ms} ms
                  </span>
                )}
              </div>
            </div>
          )}

          <Select
            label="Inference / Data Provider"
            id="provider_select"
            value={selectedProvider}
            onChange={(e) => {
              setSelectedProvider(e.target.value);
              setAddTestResult(null);
            }}
            options={[
              { value: 'cerebras', label: 'Cerebras Cloud Inference (Recommended)' },
              { value: 'gemini', label: 'Google Gemini AI Studio' },
              { value: 'groq', label: 'Groq Cloud LPU' },
              { value: 'data.gov.in', label: 'data.gov.in Agmarknet Mandi Rates' },
            ]}
            required
          />

          <div className="space-y-1">
            <div className="relative">
              <Input
                label="Provider API Secret Key"
                id="secret_key"
                type={showSecret ? 'text' : 'password'}
                placeholder="Paste raw API key (e.g. csk-..., AIza..., gsk_...)"
                icon={Lock}
                value={secretKey}
                onChange={(e) => {
                  setSecretKey(e.target.value);
                  setAddTestResult(null);
                }}
                helperText="The secret is encrypted immediately using Windows Credential Manager KEK and never returned."
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowSecret((p) => !p)}
                className="absolute right-3 top-8 text-[#A3A3A3] hover:text-[#ECECEC] p-1 focus:outline-none"
                aria-label={showSecret ? 'Hide secret' : 'Show secret'}
                title={showSecret ? 'Hide secret' : 'Show secret'}
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Replace / Rotate Credential Modal */}
      <Modal
        isOpen={!!rotateTarget}
        onClose={() => setRotateTarget(null)}
        title="Rotate Provider Key"
        subtitle={`Replace API key for ${rotateTarget?.provider_id} (Generation ${rotateTarget?.generation} -> ${(rotateTarget?.generation || 0) + 1})`}
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              icon={Activity}
              onClick={handleTestRotate}
              isLoading={isTestingRotate}
              disabled={isRotating || !rotateSecret.trim()}
            >
              Test New Key
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRotateTarget(null)}
                disabled={isRotating}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRotateCredential}
                isLoading={isRotating}
                icon={RotateCw}
              >
                Rotate & Save
              </Button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleRotateCredential} className="space-y-4">
          {rotateError && <Alert type="error">{rotateError}</Alert>}

          {rotateTestResult && (
            <div
              className={`p-3 rounded-xl border text-xs leading-relaxed flex items-center gap-2.5 ${
                rotateTestResult.ok
                  ? 'bg-emerald-950/60 border-emerald-600/70 text-emerald-200'
                  : 'bg-red-950/60 border-red-600/70 text-red-200'
              }`}
            >
              {rotateTestResult.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <div>
                <span className="font-bold">{rotateTestResult.status.toUpperCase()}: </span>
                <span>{rotateTestResult.message}</span>
                {rotateTestResult.latency_ms && (
                  <span className="block text-[10px] text-[#A3A3A3] mt-0.5">
                    Latency: {rotateTestResult.latency_ms} ms
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="p-3 bg-[#171717] rounded-xl border border-[#414141] text-xs text-[#A3A3A3]">
            Rotating this key will atomically invalidate the previous generation and encrypt the new key with a fresh Data Encryption Key (DEK).
          </div>

          <div className="space-y-1">
            <div className="relative">
              <Input
                label="New API Secret Key"
                id="rotate_secret_key"
                type={showRotateSecret ? 'text' : 'password'}
                placeholder="Enter replacement API key"
                icon={Lock}
                value={rotateSecret}
                onChange={(e) => {
                  setRotateSecret(e.target.value);
                  setRotateTestResult(null);
                }}
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowRotateSecret((p) => !p)}
                className="absolute right-3 top-8 text-[#A3A3A3] hover:text-[#ECECEC] p-1 focus:outline-none"
                aria-label={showRotateSecret ? 'Hide secret' : 'Show secret'}
                title={showRotateSecret ? 'Hide secret' : 'Show secret'}
              >
                {showRotateSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Confirm Key Deletion"
        subtitle="Are you sure you want to delete this encrypted credential?"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeleteConfirm}
              isLoading={isDeleting}
              icon={Trash2}
            >
              Permanently Delete
            </Button>
          </>
        }
      >
        <p className="text-xs text-[#A3A3A3] leading-relaxed">
          Deleting credential <strong className="text-[#ECECEC]">{deleteTarget?.credential_id}</strong> for <strong className="text-[#ECECEC]">{deleteTarget?.provider_id}</strong> will immediately erase the ciphertext from SQLite. Consultations in deterministic mode will continue functioning normally.
        </p>
      </Modal>
    </div>
  );
};
