interface PlaceResult {
  place_id: string;
  name: string;
  vicinity?: string;
  formatted_address?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  formatted_phone_number?: string;
  website?: string;
  business_status?: string;
}

interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  formatted_phone_number?: string;
  website?: string;
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
    periods?: Array<{
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }>;
  };
  types?: string[];
}

// Define the operating hours type with proper index signature
type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

type OperatingHours = Record<DayOfWeek, DayHours>;

export class GoogleMapsService {
  private placesService: any;

  constructor(_apiKey: string) {
    // apiKey is passed but not stored as it's only needed during initialization
  }

  initializeService(mapInstance: any) {
    if (window.google && window.google.maps) {
      this.placesService = new window.google.maps.places.PlacesService(mapInstance);
    }
  }

  async searchNearbyFacilities(
    latitude: number,
    longitude: number,
    radius: number = 5000
  ): Promise<any[]> {
    return new Promise((resolve, reject) => {
      console.log('searchNearbyFacilities called with:', { latitude, longitude, radius });

      if (!this.placesService) {
        console.error('Places service not initialized');
        reject(new Error('Places service not initialized'));
        return;
      }

      const location = new window.google.maps.LatLng(latitude, longitude);

      const keywords = [
        'recycling center',
        'waste management',
        'scrap dealer',
        'waste disposal',
        'e-waste collection',
        'composting facility'
      ];

      console.log('Searching with keywords:', keywords);

      const searchPromises = keywords.map((keyword, index) => {
        return new Promise<PlaceResult[]>((resolveSearch) => {
          const request = {
            location: location,
            radius: radius,
            keyword: keyword
          };

          this.placesService.nearbySearch(
            request,
            (results: PlaceResult[] | null, status: any) => {
              const statusName = Object.keys(window.google.maps.places.PlacesServiceStatus).find(
                key => (window.google.maps.places.PlacesServiceStatus as any)[key] === status
              );
              console.log(`Search ${index + 1}/${keywords.length} (${keyword}):`, statusName || status, results?.length || 0);

              if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
                resolveSearch(results);
              } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                console.log(`Zero results for "${keyword}"`);
                resolveSearch([]);
              } else {
                console.warn(`Search failed for "${keyword}", status:`, statusName || status);
                resolveSearch([]);
              }
            }
          );
        });
      });

      Promise.all(searchPromises)
        .then(resultsArrays => {
          console.log('All searches completed');
          const allResults = resultsArrays.flat();
          console.log('Total results before dedup:', allResults.length);
          const uniqueResults = this.removeDuplicates(allResults);
          console.log('Unique results:', uniqueResults.length);

          const detailsPromises = uniqueResults.slice(0, 20).map(place =>
            this.getPlaceDetails(place.place_id)
          );

          console.log('Fetching details for', detailsPromises.length, 'places');
          return Promise.all(detailsPromises);
        })
        .then(detailedResults => {
          console.log('Details fetched, converting to facilities');
          const facilities = detailedResults
            .filter(result => result !== null)
            .map(place => this.convertToFacility(place!, latitude, longitude));
          console.log('Final facilities count:', facilities.length);
          resolve(facilities);
        })
        .catch(error => {
          console.error('Error searching facilities:', error);
          reject(error);
        });
    });
  }

  private getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
    return new Promise((resolve) => {
      if (!this.placesService) {
        resolve(null);
        return;
      }

      const request = {
        placeId: placeId,
        fields: [
          'place_id',
          'name',
          'formatted_address',
          'geometry',
          'rating',
          'user_ratings_total',
          'formatted_phone_number',
          'website',
          'opening_hours',
          'types'
        ]
      };

      this.placesService.getDetails(
        request,
        (place: PlaceDetails | null, status: any) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
            resolve(place);
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  private removeDuplicates(places: PlaceResult[]): PlaceResult[] {
    const seen = new Set();
    return places.filter(place => {
      if (seen.has(place.place_id)) {
        return false;
      }
      seen.add(place.place_id);
      return true;
    });
  }

  private convertToFacility(place: PlaceDetails, userLat: number, userLng: number): any {
    const address = this.parseAddress(place.formatted_address);
    const facilityType = this.determineFacilityType(place.types || [], place.name);
    const acceptedWasteTypes = this.determineWasteTypes(facilityType, place.name);
    const operatingHours = this.parseOperatingHours(place.opening_hours);
    const distance = this.calculateDistance(
      userLat,
      userLng,
      place.geometry.location.lat,
      place.geometry.location.lng
    );

    return {
      _id: place.place_id,
      name: place.name,
      type: facilityType,
      location: {
        coordinates: [place.geometry.location.lng, place.geometry.location.lat],
        address: address
      },
      contact: {
        phone: place.formatted_phone_number || 'Not available',
        website: place.website
      },
      operatingHours: operatingHours,
      acceptedWasteTypes: acceptedWasteTypes,
      rating: {
        average: place.rating || 0,
        count: place.user_ratings_total || 0
      },
      distance: distance
    };
  }

  private parseAddress(formattedAddress: string): any {
    const parts = formattedAddress.split(',').map(p => p.trim());

    return {
      street: parts[0] || '',
      city: parts[1] || '',
      state: parts[2] || '',
      zipCode: parts[parts.length - 1]?.match(/\d{5,6}/)?.[0] || ''
    };
  }

  private determineFacilityType(_types: string[], name: string): string {
    const nameLower = name.toLowerCase();

    if (nameLower.includes('e-waste') || nameLower.includes('electronic')) {
      return 'e_waste_center';
    }
    if (nameLower.includes('compost')) {
      return 'composting_facility';
    }
    if (nameLower.includes('scrap')) {
      return 'scrap_shop';
    }
    if (nameLower.includes('treatment') || nameLower.includes('disposal')) {
      return 'waste_treatment_plant';
    }
    if (nameLower.includes('recycl')) {
      return 'recycling_center';
    }

    return 'recycling_center';
  }

  private determineWasteTypes(facilityType: string, name: string): string[] {
    const nameLower = name.toLowerCase();
    const wasteTypes: string[] = [];

    if (facilityType === 'e_waste_center' || nameLower.includes('electronic')) {
      wasteTypes.push('electronic');
    }
    if (facilityType === 'composting_facility' || nameLower.includes('organic')) {
      wasteTypes.push('organic');
    }
    if (facilityType === 'scrap_shop') {
      wasteTypes.push('metal', 'plastic', 'electronic');
    }
    if (facilityType === 'recycling_center') {
      wasteTypes.push('plastic', 'paper', 'glass', 'metal');
    }
    if (facilityType === 'waste_treatment_plant') {
      wasteTypes.push('plastic', 'paper', 'glass', 'metal', 'organic');
    }

    return wasteTypes.length > 0 ? wasteTypes : ['plastic', 'paper'];
  }

  private parseOperatingHours(openingHours?: PlaceDetails['opening_hours']): OperatingHours {
    const defaultHours: OperatingHours = {
      monday: { open: '09:00', close: '18:00', closed: false },
      tuesday: { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday: { open: '09:00', close: '18:00', closed: false },
      friday: { open: '09:00', close: '18:00', closed: false },
      saturday: { open: '09:00', close: '14:00', closed: false },
      sunday: { open: '', close: '', closed: true }
    };

    if (!openingHours?.weekday_text) {
      return defaultHours;
    }

    const daysMap: Record<string, DayOfWeek> = {
      'Monday': 'monday',
      'Tuesday': 'tuesday',
      'Wednesday': 'wednesday',
      'Thursday': 'thursday',
      'Friday': 'friday',
      'Saturday': 'saturday',
      'Sunday': 'sunday'
    };

    const hours: Partial<OperatingHours> = {};

    openingHours.weekday_text.forEach(dayText => {
      const [day, timeRange] = dayText.split(': ');
      const dayKey = daysMap[day];

      if (dayKey) {
        if (timeRange.toLowerCase().includes('closed')) {
          hours[dayKey] = { open: '', close: '', closed: true };
        } else {
          const times = timeRange.match(/(\d{1,2}:\d{2}\s*[AP]M)/gi);
          if (times && times.length >= 2) {
            hours[dayKey] = {
              open: this.convertTo24Hour(times[0]),
              close: this.convertTo24Hour(times[1]),
              closed: false
            };
          } else {
            hours[dayKey] = defaultHours[dayKey];
          }
        }
      }
    });

    return { ...defaultHours, ...hours };
  }

  private convertTo24Hour(time12h: string): string {
    const [time, modifier] = time12h.trim().split(/\s+/);
    let [hours, minutes] = time.split(':');

    if (hours === '12') {
      hours = modifier.toLowerCase() === 'am' ? '00' : '12';
    } else if (modifier.toLowerCase() === 'pm') {
      hours = String(parseInt(hours, 10) + 12);
    }

    return `${hours.padStart(2, '0')}:${minutes}`;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

export const createGoogleMapsService = (apiKey: string) => {
  return new GoogleMapsService(apiKey);
};