import api from './api';

class AdminService {
  async getDashboardData() {
    const response = await api.get('/admin/dashboard');
    return response.data;
  }

  async getReportAnalytics(params?: {
    startDate?: string;
    endDate?: string;
    groupBy?: string;
  }) {
    const response = await api.get('/admin/analytics/reports', { params });
    return response.data;
  }

  async getUsers(params?: {
    page?: number;
    limit?: number;
    role?: string;
    status?: string;
    search?: string;
  }) {
    const response = await api.get('/admin/users', { params });
    return response.data;
  }

  async updateUserStatus(userId: string, isActive: boolean) {
    const response = await api.put(`/admin/users/${userId}/status`, { isActive });
    return response.data;
  }
}

export const adminService = new AdminService();