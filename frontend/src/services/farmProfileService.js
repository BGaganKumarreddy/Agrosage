import apiClient from './apiClient';

export const farmProfileService = {
  /**
   * Retrieve the saved farm profile for the authenticated user and tenant.
   */
  async getProfile() {
    const res = await apiClient.get('/profile/farm');
    return res.data;
  },

  /**
   * Create or update the persistent saved farm profile for the authenticated user and tenant.
   */
  async updateProfile(profileData) {
    const res = await apiClient.put('/profile/farm', profileData);
    return res.data;
  },

  /**
   * Delete the saved farm profile for the authenticated user and tenant.
   */
  async deleteProfile() {
    const res = await apiClient.delete('/profile/farm');
    return res.data;
  },
};

export default farmProfileService;
