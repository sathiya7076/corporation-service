import api from './api';

interface FacilityParams {
  type?: string;
  wasteType?: string;
  longitude?: number;
  latitude?: number;
  radius?: number;
  limit?: number;
}

class FacilityService {
  async getFacilities(params?: FacilityParams) {
    try {
      const queryParams: any = {};

      if (params?.type && params.type !== 'all') {
        queryParams.type = params.type;
      }

      if (params?.wasteType && params.wasteType !== 'all') {
        queryParams.wasteType = params.wasteType;
      }

      if (params?.longitude && params?.latitude) {
        queryParams.longitude = params.longitude;
        queryParams.latitude = params.latitude;
      }

      if (params?.radius) {
        queryParams.radius = params.radius;
      }

      if (params?.limit) {
        queryParams.limit = params.limit;
      }

      const response = await api.get('/facilities', { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching facilities:', error);
      throw error;
    }
  }

  async getFacility(id: string) {
    try {
      const response = await api.get(`/facilities/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching facility:', error);
      throw error;
    }
  }

  async addReview(facilityId: string, rating: number, comment?: string) {
    try {
      const response = await api.post(`/facilities/${facilityId}/review`, {
        rating,
        comment
      });
      return response.data;
    } catch (error) {
      console.error('Error adding review:', error);
      throw error;
    }
  }

  async getFacilityTypes() {
    try {
      const response = await api.get('/facilities/types/list');
      return response.data;
    } catch (error) {
      console.error('Error fetching facility types:', error);
      throw error;
    }
  }
}

export const facilityService = new FacilityService();