import React, { useState, useEffect } from 'react';
import { MapPin, Search, Star, Clock, Phone, Globe, ChevronRight, X, Filter, MapPinned } from 'lucide-react';

interface Facility {
  _id: string;
  name: string;
  type: string;
  location: {
    coordinates: [number, number];
    address: {
      street: string;
      city: string;
      district: string;
      state: string;
      zipCode: string;
    };
  };
  contact: {
    phone: string;
    email?: string;
    website?: string;
  };
  operatingHours: {
    [key: string]: {
      open: string;
      close: string;
      closed: boolean;
    };
  };
  acceptedWasteTypes: string[];
  rating: {
    average: number;
    count: number;
  };
  distance?: number;
}

interface District {
  name: string;
  city: string;
  lat: number;
  lon: number;
}

const FacilitiesMapView: React.FC = () => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [filteredFacilities, setFilteredFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('Chennai');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [wasteTypeFilter, setWasteTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [showFilters, setShowFilters] = useState(false);

  const tamilNaduDistricts: District[] = [
    { name: 'Chennai', city: 'Chennai', lat: 13.0827, lon: 80.2707 },
    { name: 'Coimbatore', city: 'Coimbatore', lat: 11.0168, lon: 76.9558 },
    { name: 'Madurai', city: 'Madurai', lat: 9.9252, lon: 78.1198 },
    { name: 'Tiruchirappalli', city: 'Tiruchirappalli', lat: 10.7905, lon: 78.7047 },
    { name: 'Salem', city: 'Salem', lat: 11.6643, lon: 78.1460 },
    { name: 'Tirunelveli', city: 'Tirunelveli', lat: 8.7139, lon: 77.7567 },
    { name: 'Erode', city: 'Erode', lat: 11.3410, lon: 77.7172 },
    { name: 'Vellore', city: 'Vellore', lat: 12.9165, lon: 79.1325 },
    { name: 'Thoothukudi', city: 'Thoothukudi', lat: 8.7642, lon: 78.1348 },
    { name: 'Dindigul', city: 'Dindigul', lat: 10.3673, lon: 77.9803 },
    { name: 'Thanjavur', city: 'Thanjavur', lat: 10.7870, lon: 79.1378 },
    { name: 'Kanchipuram', city: 'Kanchipuram', lat: 12.8342, lon: 79.7036 },
    { name: 'Tiruppur', city: 'Tiruppur', lat: 11.1075, lon: 77.3398 },
    { name: 'Krishnagiri', city: 'Hosur', lat: 12.7409, lon: 77.8253 },
    { name: 'Kanyakumari', city: 'Nagercoil', lat: 8.1790, lon: 77.4305 },
    { name: 'Cuddalore', city: 'Cuddalore', lat: 11.7480, lon: 79.7714 },
    { name: 'Nagapattinam', city: 'Nagapattinam', lat: 10.7672, lon: 79.8449 },
    { name: 'Karur', city: 'Karur', lat: 10.9577, lon: 78.0766 },
    { name: 'Namakkal', city: 'Namakkal', lat: 11.2189, lon: 78.1677 },
    { name: 'Pudukkottai', city: 'Pudukkottai', lat: 10.3833, lon: 78.8000 },
    { name: 'Ramanathapuram', city: 'Ramanathapuram', lat: 9.3639, lon: 78.8370 },
    { name: 'Sivaganga', city: 'Sivaganga', lat: 9.8433, lon: 78.4809 },
    { name: 'Theni', city: 'Theni', lat: 10.0104, lon: 77.4777 },
    { name: 'Virudhunagar', city: 'Virudhunagar', lat: 9.5810, lon: 77.9624 },
    { name: 'Villupuram', city: 'Villupuram', lat: 11.9401, lon: 79.4861 },
    { name: 'Tiruvannamalai', city: 'Tiruvannamalai', lat: 12.2253, lon: 79.0747 },
    { name: 'Dharmapuri', city: 'Dharmapuri', lat: 12.1211, lon: 78.1582 },
    { name: 'Nilgiris', city: 'Ooty', lat: 11.4102, lon: 76.6950 },
    { name: 'Ariyalur', city: 'Ariyalur', lat: 11.1401, lon: 79.0782 },
    { name: 'Perambalur', city: 'Perambalur', lat: 11.2324, lon: 78.8798 },
    { name: 'Ranipet', city: 'Ranipet', lat: 12.9249, lon: 79.3333 },
    { name: 'Tirupattur', city: 'Tirupattur', lat: 12.4960, lon: 78.5720 },
    { name: 'Kallakurichi', city: 'Kallakurichi', lat: 11.7401, lon: 78.9597 },
    { name: 'Tenkasi', city: 'Tenkasi', lat: 8.9600, lon: 77.3152 },
    { name: 'Chengalpattu', city: 'Chengalpattu', lat: 12.6919, lon: 79.9718 },
    { name: 'Tirupur', city: 'Tirupur', lat: 11.1085, lon: 77.3411 }
  ];

  useEffect(() => {
    loadDistrictFacilities(selectedDistrict);
  }, [selectedDistrict]);

  useEffect(() => {
    applyFilters();
  }, [facilities, searchTerm, typeFilter, wasteTypeFilter]);

  const loadDistrictFacilities = (districtName: string) => {
    setLoading(true);
    
    const district = tamilNaduDistricts.find(d => d.name === districtName);
    
    if (!district) {
      setLoading(false);
      return;
    }

    setTimeout(() => {
      const generatedFacilities = generateDistrictFacilities(district);
      setFacilities(generatedFacilities);
      setLoading(false);
    }, 500);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const generateDistrictFacilities = (district: District): Facility[] => {
    const facilityTemplates = [
      {
        namePattern: `${district.city} Municipal Recycling Center`,
        type: 'recycling_center',
        wasteTypes: ['plastic', 'paper', 'glass', 'metal'],
        offset: [0.01, 0.01]
      },
      {
        namePattern: `${district.name} District Scrap Collection Point`,
        type: 'scrap_shop',
        wasteTypes: ['metal', 'plastic', 'paper', 'electronic'],
        offset: [-0.02, 0.015]
      },
      {
        namePattern: `${district.city} E-Waste Management Center`,
        type: 'e_waste_center',
        wasteTypes: ['electronic'],
        offset: [0.025, -0.01]
      },
      {
        namePattern: `${district.city} Organic Waste Composting Unit`,
        type: 'composting_facility',
        wasteTypes: ['organic'],
        offset: [-0.015, -0.02]
      },
      {
        namePattern: `${district.name} Waste Treatment Plant`,
        type: 'waste_treatment_plant',
        wasteTypes: ['plastic', 'paper', 'glass', 'metal', 'organic'],
        offset: [0.03, 0.02]
      },
      {
        namePattern: `Green ${district.city} Recycling Hub`,
        type: 'recycling_center',
        wasteTypes: ['plastic', 'paper', 'glass'],
        offset: [-0.025, 0.025]
      },
      {
        namePattern: `${district.city} Central Scrap Dealer`,
        type: 'scrap_shop',
        wasteTypes: ['metal', 'plastic'],
        offset: [0.018, -0.018]
      },
      {
        namePattern: `${district.city} Biogas & Composting Plant`,
        type: 'composting_facility',
        wasteTypes: ['organic'],
        offset: [-0.028, 0.008]
      },
      {
        namePattern: `${district.name} Electronics Recycling Facility`,
        type: 'e_waste_center',
        wasteTypes: ['electronic'],
        offset: [0.012, 0.022]
      },
      {
        namePattern: `${district.city} Integrated Waste Management Center`,
        type: 'waste_treatment_plant',
        wasteTypes: ['plastic', 'paper', 'glass', 'metal', 'organic', 'electronic'],
        offset: [-0.032, -0.015]
      }
    ];

    return facilityTemplates.map((template, index) => {
      const facilityLat = district.lat + template.offset[1];
      const facilityLon = district.lon + template.offset[0];
      const distance = calculateDistance(district.lat, district.lon, facilityLat, facilityLon);
      
      return {
        _id: `facility-${district.name}-${index}`,
        name: template.namePattern,
        type: template.type,
        location: {
          coordinates: [facilityLon, facilityLat] as [number, number],
          address: {
            street: `${Math.floor(Math.random() * 999) + 1} ${['Main Road', 'Industrial Area', 'Market Street', 'Station Road', 'Ring Road', 'Bypass Road', 'Old Town', 'Gandhi Nagar'][Math.floor(Math.random() * 8)]}`,
            city: district.city,
            district: district.name,
            state: 'Tamil Nadu',
            zipCode: `${600000 + Math.floor(Math.random() * 99999)}`
          }
        },
        contact: {
          phone: '+91 ' + generatePhone(),
          website: index % 3 === 0 ? `https://${template.type.replace(/_/g, '')}-${district.city.toLowerCase()}.example.com` : undefined
        },
        operatingHours: getDefaultHours(),
        acceptedWasteTypes: template.wasteTypes,
        rating: {
          average: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
          count: Math.floor(Math.random() * 200) + 20
        },
        distance: distance
      };
    }).sort((a, b) => (a.distance || 0) - (b.distance || 0));
  };

  const generatePhone = () => {
    const prefixes = ['98765', '99876', '97654', '96543', '95432', '94321', '93210'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const number = Math.floor(Math.random() * 90000) + 10000;
    return `${prefix} ${number}`;
  };

  const getDefaultHours = () => ({
    monday: { open: '09:00', close: '18:00', closed: false },
    tuesday: { open: '09:00', close: '18:00', closed: false },
    wednesday: { open: '09:00', close: '18:00', closed: false },
    thursday: { open: '09:00', close: '18:00', closed: false },
    friday: { open: '09:00', close: '18:00', closed: false },
    saturday: { open: '10:00', close: '16:00', closed: false },
    sunday: { open: '00:00', close: '00:00', closed: true }
  });

  const applyFilters = () => {
    let filtered = facilities;

    if (searchTerm) {
      filtered = filtered.filter(facility =>
        facility.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        facility.location.address.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        facility.location.address.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
        facility.location.address.street.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(facility => facility.type === typeFilter);
    }

    if (wasteTypeFilter !== 'all') {
      filtered = filtered.filter(facility =>
        facility.acceptedWasteTypes.includes(wasteTypeFilter)
      );
    }

    setFilteredFacilities(filtered);
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      recycling_center: 'bg-green-100 text-green-800',
      scrap_shop: 'bg-blue-100 text-blue-800',
      waste_treatment_plant: 'bg-purple-100 text-purple-800',
      composting_facility: 'bg-yellow-100 text-yellow-800',
      e_waste_center: 'bg-red-100 text-red-800',
      default: 'bg-gray-100 text-gray-800'
    };
    return colors[type] || colors.default;
  };

  const getTodaysHours = (operatingHours: Facility['operatingHours']) => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const hours = operatingHours[today];

    if (!hours || hours.closed) {
      return 'Closed today';
    }

    return `${hours.open} - ${hours.close}`;
  };

  const isOpenNow = (operatingHours: Facility['operatingHours']) => {
    const now = new Date();
    const today = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const hours = operatingHours[today];

    if (!hours || hours.closed) {
      return false;
    }

    const currentTime = now.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });

    return currentTime >= hours.open && currentTime <= hours.close;
  };

  const facilityTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'recycling_center', label: 'Recycling Center' },
    { value: 'scrap_shop', label: 'Scrap Shop' },
    { value: 'waste_treatment_plant', label: 'Treatment Plant' },
    { value: 'composting_facility', label: 'Composting Facility' },
    { value: 'e_waste_center', label: 'E-Waste Center' }
  ];

  const wasteTypes = [
    { value: 'all', label: 'All Waste Types' },
    { value: 'plastic', label: 'Plastic' },
    { value: 'paper', label: 'Paper' },
    { value: 'glass', label: 'Glass' },
    { value: 'metal', label: 'Metal' },
    { value: 'electronic', label: 'Electronic' },
    { value: 'organic', label: 'Organic' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600 mb-2 font-medium">Loading facilities...</p>
          <p className="text-sm text-gray-500">Finding waste management centers in {selectedDistrict}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Waste Facilities in Tamil Nadu</h1>
              <div className="flex items-center gap-2 mt-1">
                <MapPinned className="h-4 w-4 text-green-600" />
                <p className="text-sm text-gray-600">
                  Browse facilities across all districts
                </p>
              </div>
            </div>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                }`}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'map' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                }`}
              >
                Map
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow-sm p-6 mb-6 border border-green-100">
          <div className="flex items-center gap-3 mb-3">
            <MapPin className="h-6 w-6 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Select Your District</h2>
          </div>
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="w-full px-4 py-3 border-2 border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-base font-medium"
          >
            {tamilNaduDistricts.map((district) => (
              <option key={district.name} value={district.name}>
                {district.name} ({district.city})
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-600 mt-2">
            Showing {filteredFacilities.length} waste management facilities in {selectedDistrict} district
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center gap-3 mb-4 lg:mb-0">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden flex items-center px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </button>
          </div>

          <div className={`grid grid-cols-1 lg:grid-cols-3 gap-4 ${showFilters ? '' : 'hidden lg:grid'}`}>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search facilities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              {facilityTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            <select
              value={wasteTypeFilter}
              onChange={(e) => setWasteTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              {wasteTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {viewMode === 'map' && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
            <div
              className="w-full bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center"
              style={{ height: '600px' }}
            >
              <div className="text-center p-8">
                <MapPin className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <p className="text-gray-900 font-medium mb-2 text-lg">Interactive Map View</p>
                <p className="text-sm text-gray-600 mb-4">
                  {filteredFacilities.length} facilities in {selectedDistrict}
                </p>
                <div className="bg-white rounded-lg p-4 max-w-md mx-auto shadow-sm">
                  <p className="text-xs text-gray-500">
                    Integrate Google Maps or Leaflet.js for interactive mapping with markers for each facility
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'list' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredFacilities.map((facility) => (
              <div key={facility._id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {facility.name}
                      </h3>
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full capitalize ${getTypeColor(facility.type)}`}>
                        {facility.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {facility.rating.count > 0 && (
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 mr-1 fill-current" />
                        <span className="text-sm font-medium">{facility.rating.average.toFixed(1)}</span>
                        <span className="text-xs text-gray-500 ml-1">({facility.rating.count})</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start">
                      <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-1 flex-shrink-0" />
                      <div className="text-sm text-gray-600">
                        <p>{facility.location.address.street}</p>
                        <p>{facility.location.address.city}, {facility.location.address.district}</p>
                        <p className="text-gray-500">{facility.location.address.state}</p>
                        {facility.distance !== undefined && (
                          <p className="text-green-600 font-medium mt-1">
                            {facility.distance.toFixed(1)} km from city center
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">
                        {getTodaysHours(facility.operatingHours)}
                      </span>
                      {isOpenNow(facility.operatingHours) && (
                        <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full font-medium">
                          Open Now
                        </span>
                      )}
                    </div>

                    <div className="flex items-center">
                      <Phone className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">{facility.contact.phone}</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-medium text-gray-700 mb-2">Accepted Waste:</p>
                    <div className="flex flex-wrap gap-2">
                      {facility.acceptedWasteTypes.slice(0, 4).map((type) => (
                        <span key={type} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full capitalize">
                          {type}
                        </span>
                      ))}
                      {facility.acceptedWasteTypes.length > 4 && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                          +{facility.acceptedWasteTypes.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between">
                    <button
                      onClick={() => setSelectedFacility(facility)}
                      className="flex items-center text-green-600 hover:text-green-700 font-medium text-sm"
                    >
                      View Details
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </button>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${facility.location.coordinates[1]},${facility.location.coordinates[0]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors"
                    >
                      Directions
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredFacilities.length === 0 && !loading && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No facilities found</h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your filters or search criteria.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setTypeFilter('all');
                setWasteTypeFilter('all');
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {selectedFacility && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">{selectedFacility.name}</h2>
              <button
                onClick={() => setSelectedFacility(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Facility Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500 block mb-1">Type</label>
                    <p className="text-sm font-medium capitalize">{selectedFacility.type.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 block mb-1">Rating</label>
                    <div className="text-sm">
                      {selectedFacility.rating.count > 0 ? (
                        <span className="flex items-center">
                          {selectedFacility.rating.average.toFixed(1)}
                          <Star className="h-4 w-4 text-yellow-400 ml-1 fill-current" />
                          <span className="text-gray-500 ml-1">({selectedFacility.rating.count})</span>
                        </span>
                      ) : (
                        <span className="text-gray-500">No reviews yet</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">Contact Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Phone className="h-4 w-4 text-gray-400 mr-2" />
                    <span>{selectedFacility.contact.phone}</span>
                  </div>
                  {selectedFacility.contact.website && (
                    <div className="flex items-center text-sm">
                      <Globe className="h-4 w-4 text-gray-400 mr-2" />
                      <a
                        href={selectedFacility.contact.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-700"
                      >
                        Visit Website
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">Address</h3>
                <div className="flex items-start">
                  <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-1" />
                  <div className="text-sm text-gray-600">
                    <p>{selectedFacility.location.address.street}</p>
                    <p>{selectedFacility.location.address.city}, {selectedFacility.location.address.district}</p>
                    <p>{selectedFacility.location.address.state} {selectedFacility.location.address.zipCode}</p>
                    {selectedFacility.distance !== undefined && (
                      <p className="text-green-600 font-medium mt-1">{selectedFacility.distance.toFixed(1)} km from city center</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">Operating Hours</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  {Object.entries(selectedFacility.operatingHours).map(([day, hours]) => (
                    <div key={day} className="flex justify-between text-sm">
                      <span className="capitalize font-medium text-gray-700">{day}:</span>
                      <span className={hours.closed ? 'text-red-600' : 'text-gray-600'}>
                        {hours.closed ? 'Closed' : `${hours.open} - ${hours.close}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">Accepted Waste Types</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedFacility.acceptedWasteTypes.map((type) => (
                    <span key={type} className="px-3 py-1.5 text-sm bg-green-100 text-green-800 rounded-full capitalize font-medium">
                      {type.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedFacility.location.coordinates[1]},${selectedFacility.location.coordinates[0]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center font-medium transition-colors"
                >
                  Get Directions
                </a>
                <button
                  onClick={() => setSelectedFacility(null)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacilitiesMapView;