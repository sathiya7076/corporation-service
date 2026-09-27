import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { wasteService } from '../services/wasteService';
import {
  Upload,
  AlertTriangle,
  CheckCircle,
  X,
  Navigation
} from 'lucide-react';

interface WasteReportForm {
  wasteType: string;
  category: string;
  severity: string;
  estimatedQuantity: string;
  description: string;
  location: {
    coordinates: [number, number] | null;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
    };
    description: string;
  };
}

const WasteReporting: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<WasteReportForm>({
    wasteType: 'mixed',
    category: 'household',
    severity: 'medium',
    estimatedQuantity: 'medium',
    description: '',
    location: {
      coordinates: null,
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: ''
      },
      description: ''
    }
  });
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const wasteTypes = [
    { value: 'organic', label: 'Organic Waste', icon: '🥬' },
    { value: 'plastic', label: 'Plastic', icon: '♻️' },
    { value: 'paper', label: 'Paper', icon: '📄' },
    { value: 'glass', label: 'Glass', icon: '🍾' },
    { value: 'metal', label: 'Metal', icon: '🔩' },
    { value: 'electronic', label: 'Electronic', icon: '📱' },
    { value: 'hazardous', label: 'Hazardous', icon: '⚠️' },
    { value: 'mixed', label: 'Mixed Waste', icon: '🗑️' }
  ];

  const categories = [
    { value: 'household', label: 'Household' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'industrial', label: 'Industrial' },
    { value: 'construction', label: 'Construction' },
    { value: 'medical', label: 'Medical' }
  ];

  const severityLevels = [
    { value: 'low', label: 'Low', color: 'text-green-600 bg-green-100' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600 bg-yellow-100' },
    { value: 'high', label: 'High', color: 'text-red-600 bg-red-100' },
    { value: 'critical', label: 'Critical', color: 'text-red-800 bg-red-200' }
  ];

  const quantities = [
    { value: 'small', label: 'Small (1-5 bags)' },
    { value: 'medium', label: 'Medium (6-15 bags)' },
    { value: 'large', label: 'Large (16-50 bags)' },
    { value: 'extra_large', label: 'Extra Large (50+ bags)' }
  ];

  useEffect(() => {
    return () => {
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name.startsWith('location.address.')) {
      const addressField = name.split('.')[2];
      setFormData(prev => ({
        ...prev,
        location: {
          ...prev.location,
          address: {
            ...prev.location.address,
            [addressField]: value
          }
        }
      }));
    } else if (name.startsWith('location.')) {
      const locationField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        location: {
          ...prev.location,
          [locationField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    if (error) setError('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    
    if (fileList && fileList.length > 0) {
      imagePreviews.forEach(url => URL.revokeObjectURL(url));

      const newFilesArray = Array.from(fileList);
      const combinedFiles = [...selectedFiles, ...newFilesArray].slice(0, 5);
      
      const validImageFiles = combinedFiles.filter(file => {
        return file.type.startsWith('image/') && file.size > 0 && file.size <= 5242880;
      });

      const newPreviews = validImageFiles.map(file => URL.createObjectURL(file));

      setSelectedFiles(validImageFiles);
      setImagePreviews(newPreviews);
      
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    
    URL.revokeObjectURL(imagePreviews[index]);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImagePreviews(newPreviews);
    
    if (fileInputRef.current && newFiles.length === 0) {
      fileInputRef.current.value = '';
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({
          ...prev,
          location: {
            ...prev.location,
            coordinates: [longitude, latitude]
          }
        }));
        setGettingLocation(false);
      },
      () => {
        setError('Unable to get your location. Please enter address manually.');
        setGettingLocation(false);
      }
    );
  };

  const validateForm = (): boolean => {
    if (!formData.description.trim()) {
      setError('Please provide a description of the waste issue.');
      return false;
    }

    if (!formData.location.coordinates && !formData.location.address.city) {
      setError('Please provide either your current location or address details.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const reportData = {
        ...formData,
        location: {
          ...formData.location,
          coordinates: formData.location.coordinates || [0, 0]
        }
      };

      let fileListToSend: FileList | undefined = undefined;
      
      if (selectedFiles.length > 0) {
        const dt = new DataTransfer();
        selectedFiles.forEach((file) => {
          dt.items.add(file);
        });
        fileListToSend = dt.files;
      }

      await wasteService.createReport(reportData, fileListToSend);
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      
    } catch (err: any) {
      console.error('Submit error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to submit waste report');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Report Submitted!</h2>
          <p className="text-gray-600 mb-4">
            Your waste report has been successfully submitted with {selectedFiles.length} image(s). You'll earn reward points once it's processed.
          </p>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
              <AlertTriangle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Report Waste Issue</h1>
              <p className="text-gray-600">Help keep your community clean by reporting waste issues</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Waste Type</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {wasteTypes.map((type) => (
                <label
                  key={type.value}
                  className={`cursor-pointer rounded-lg border-2 p-4 text-center transition-colors ${
                    formData.wasteType === type.value
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="wasteType"
                    value={type.value}
                    checked={formData.wasteType === type.value}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <div className="text-2xl mb-2">{type.icon}</div>
                  <div className="text-sm font-medium text-gray-900">{type.label}</div>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Severity
                </label>
                <select
                  name="severity"
                  value={formData.severity}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  {severityLevels.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Quantity
                </label>
                <select
                  name="estimatedQuantity"
                  value={formData.estimatedQuantity}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  {quantities.map((quantity) => (
                    <option key={quantity.value} value={quantity.value}>
                      {quantity.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Describe the waste issue in detail..."
                required
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>

            <div className="mb-4">
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {gettingLocation ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Navigation className="h-4 w-4 mr-2" />
                )}
                {gettingLocation ? 'Getting Location...' : 'Use Current Location'}
              </button>
              {formData.location.coordinates && (
                <p className="text-sm text-green-600 mt-2">
                  ✓ Location captured: {formData.location.coordinates[1].toFixed(6)}, {formData.location.coordinates[0].toFixed(6)}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address
                </label>
                <input
                  type="text"
                  name="location.address.street"
                  value={formData.location.address.street}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter street address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  name="location.address.city"
                  value={formData.location.address.city}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter city"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </label>
                <input
                  type="text"
                  name="location.address.state"
                  value={formData.location.address.state}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter state"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP Code
                </label>
                <input
                  type="text"
                  name="location.address.zipCode"
                  value={formData.location.address.zipCode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter ZIP code"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location Description
              </label>
              <input
                type="text"
                name="location.description"
                value={formData.location.description}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="e.g., Near the bus stop, behind the school..."
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Images</h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload up to 5 photos to help us better understand the waste issue
            </p>

            <div className="mb-4">
              <label className="cursor-pointer">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">
                    Click to upload images ({selectedFiles.length}/5 selected)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>
              </label>
            </div>

            {imagePreviews.length > 0 && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                        {selectedFiles[index]?.name}
                      </div>
                    </div>
                  ))}
                </div>
                
                {selectedFiles.length < 5 && (
                  <div className="text-center">
                    <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors">
                      <Upload className="h-4 w-4 mr-2" />
                      Add More Images ({5 - selectedFiles.length} remaining)
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        multiple
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Submitting...' : `Submit Report ${selectedFiles.length > 0 ? `(${selectedFiles.length} images)` : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WasteReporting;