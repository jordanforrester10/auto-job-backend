// frontend/src/utils/adminService.js
import api from './axios';

class AdminService {
  /**
   * Get admin dashboard data
   */
  async getDashboardData() {
    try {
      const response = await api.get('/admin/dashboard');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  }

  /**
   * Get detailed user information
   * @param {string} userId - User ID
   */
  async getUserDetail(userId) {
    try {
      const response = await api.get(`/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user detail:', error);
      throw error;
    }
  }

  /**
   * Update user subscription
   * @param {string} userId - User ID
   * @param {Object} subscriptionData - Subscription data to update
   */
  async updateUserSubscription(userId, subscriptionData) {
    try {
      const response = await api.put(`/admin/users/${userId}/subscription`, subscriptionData);
      return response.data;
    } catch (error) {
      console.error('Error updating user subscription:', error);
      throw error;
    }
  }

  /**
   * Get system statistics
   */
  async getSystemStats() {
    try {
      const response = await api.get('/admin/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching system stats:', error);
      throw error;
    }
  }

  /**
   * Export user data (future feature)
   */
  async exportUserData(format = 'csv') {
    try {
      const response = await api.get(`/admin/export/users?format=${format}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw error;
    }
  }

  /**
   * Get user activity logs (future feature)
   */
  async getUserActivityLogs(userId, limit = 50) {
    try {
      const response = await api.get(`/admin/users/${userId}/activity?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user activity logs:', error);
      throw error;
    }
  }

  /**
   * Send notification to user (future feature)
   */
  async sendUserNotification(userId, notification) {
    try {
      const response = await api.post(`/admin/users/${userId}/notify`, notification);
      return response.data;
    } catch (error) {
      console.error('Error sending user notification:', error);
      throw error;
    }
  }

  /**
   * Bulk update users (future feature)
   */
  async bulkUpdateUsers(userIds, updateData) {
    try {
      const response = await api.put('/admin/users/bulk-update', {
        userIds,
        updateData
      });
      return response.data;
    } catch (error) {
      console.error('Error bulk updating users:', error);
      throw error;
    }
  }
}

export default new AdminService();