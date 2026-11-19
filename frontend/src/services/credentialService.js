import apiClient from './apiClient';

export const credentialService = {
  async listCredentials() {
    const res = await apiClient.get('/credentials');
    return res.data;
  },

  async createCredential({ provider_id, secret }) {
    const res = await apiClient.post('/credentials', {
      provider_id,
      secret,
    });
    return res.data;
  },

  async rotateCredential(credentialId, { secret }) {
    const res = await apiClient.put(`/credentials/${encodeURIComponent(credentialId)}`, {
      secret,
    });
    return res.data;
  },

  async deleteCredential(credentialId) {
    const res = await apiClient.delete(`/credentials/${encodeURIComponent(credentialId)}`);
    return res.data;
  },

  async testStoredCredential(credentialId) {
    const res = await apiClient.post(`/credentials/${encodeURIComponent(credentialId)}/test`);
    return res.data;
  },

  async testUnsavedCredential({ provider_id, secret }) {
    const res = await apiClient.post('/credentials/test', {
      provider_id,
      secret,
    });
    return res.data;
  },
};
