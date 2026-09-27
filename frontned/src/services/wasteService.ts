import api from './api';

export interface WasteReportData {
  location: {
    coordinates: [number, number];
    address?: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
    };
    description?: string;
  };
  wasteType: string;
  category?: string;
  severity?: string;
  estimatedQuantity: string;
  description: string;
}

class WasteService {
  async createReport(reportData: WasteReportData, images?: FileList) {
    console.log('=== CREATING WASTE REPORT ===');
    
    const formData = new FormData();

    // Add basic fields
    formData.append('wasteType', reportData.wasteType);
    if (reportData.category) formData.append('category', reportData.category);
    if (reportData.severity) formData.append('severity', reportData.severity);
    formData.append('estimatedQuantity', reportData.estimatedQuantity);
    formData.append('description', reportData.description);

    // Add location
    formData.append('location.coordinates.0', String(reportData.location.coordinates[0]));
    formData.append('location.coordinates.1', String(reportData.location.coordinates[1]));
    
    if (reportData.location.address) {
      formData.append('location.address.street', reportData.location.address.street || '');
      formData.append('location.address.city', reportData.location.address.city || '');
      formData.append('location.address.state', reportData.location.address.state || '');
      formData.append('location.address.zipCode', reportData.location.address.zipCode || '');
    }
    
    if (reportData.location.description) {
      formData.append('location.description', reportData.location.description);
    }

    // Add images
    if (images && images.length > 0) {
      Array.from(images).forEach((file) => {
        if (file.name && file.size > 0 && file.type.startsWith('image/')) {
          formData.append('images', file, file.name);
        }
      });
    }

    const token = localStorage.getItem('token');
    const response = await api.post('/waste/report', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      timeout: 30000,
    });

    console.log('Report created:', response.data);
    return response.data;
  }

  // Get reports with viewType support
  async getReports(params?: {
    page?: number;
    limit?: number;
    status?: string;
    wasteType?: string;
    viewType?: 'my' | 'all'; // NEW: View mode for workers
  }) {
    console.log('=== GETTING REPORTS ===');
    console.log('Query parameters:', params);
    
    const response = await api.get('/waste/reports', { 
      params,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      }
    });
    
    console.log('Reports API response:', response.data);
    return response.data;
  }

  // Get nearby reports for workers
  async getNearbyReports(
    longitude: number, 
    latitude: number, 
    radius: number = 10000,
    includeAssigned: boolean = false
  ) {
    console.log('=== GETTING NEARBY REPORTS ===');
    
    const response = await api.get('/waste/reports/nearby', {
      params: { 
        longitude, 
        latitude, 
        radius,
        includeAssigned: includeAssigned ? 'true' : 'false'
      },
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      }
    });
    
    return response.data;
  }

  // Get only available (unassigned) reports
  async getAvailableReports(params?: {
    page?: number;
    limit?: number;
    wasteType?: string;
    severity?: string;
  }) {
    console.log('=== GETTING AVAILABLE REPORTS ===');
    
    const response = await api.get('/waste/reports/available', {
      params,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      }
    });
    
    return response.data;
  }

  // Worker claims an unassigned report
  async claimReport(reportId: string) {
    console.log('=== CLAIMING REPORT ===');
    console.log('Report ID:', reportId);
    
    const response = await api.put(`/waste/reports/${reportId}/claim`, {}, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      }
    });
    
    console.log('Claim response:', response.data);
    return response.data;
  }

  async getReport(id: string) {
    const response = await api.get(`/waste/reports/${id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      }
    });
    
    return response.data;
  }

  async updateReportStatus(id: string, status: string, notes?: string) {
    console.log('=== UPDATING REPORT STATUS ===');
    
    const response = await api.put(`/waste/reports/${id}/status`, { 
      status, 
      notes 
    }, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      }
    });
    
    return response.data;
  }

  // Admin manually assigns worker
  async assignWorker(reportId: string, workerId: string) {
    const response = await api.put(`/waste/reports/${reportId}/assign`, { 
      workerId 
    }, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      }
    });
    
    return response.data;
  }

  // Get all workers (for admin)
  async getWorkers() {
    const response = await api.get('/waste/workers', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      }
    });
    
    return response.data;
  }

  // Get dashboard statistics
  async getDashboardStats() {
    const response = await api.get('/waste/dashboard/stats', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      }
    });
    
    return response.data;
  }

  getImageUrl(filename: string) {
    const token = localStorage.getItem('token');
    // Dynamically get the base URL from the current page
    const baseUrl = window.location.origin.includes('5173') 
      ? 'http://localhost:5000'  // Vite dev server runs on 5173, API on 5000
      : window.location.origin;   // In production, same origin
    return `${baseUrl}/api/waste/image/${filename}${token ? `?token=${token}` : ''}`;
  }
}

export const wasteService = new WasteService();