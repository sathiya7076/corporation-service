import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { wasteService } from '../services/wasteService';
import { 
  MapPin, 
  Clock, 
  CheckCircle,
  Truck,
  Calendar,
  Filter,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  X,
  Navigation,
  Eye,
  Plus,
  Users,
  Package
} from 'lucide-react';

interface AssignedReport {
  _id: string;
  wasteType: string;
  status: string;
  severity: string;
  estimatedQuantity: string;
  description: string;
  createdAt: string;
  updatedAt?: string;
  location: {
    type: string;
    coordinates: [number, number];
    address?: {
      street: string;
      city: string;
      state: string;
      zipCode?: string;
    };
    description?: string;
  };
  reporter?: {
    _id?: string;
    name: string;
    email: string;
  };
  images: Array<{
    filename: string;
    url: string;
    caption?: string;
    originalName?: string;
    mimetype?: string;
    size?: number;
  }>;
  assignedWorker?: {
    _id: string;
    name: string;
    email?: string;
  };
  actualCollection?: {
    date: string;
    worker: {
      _id: string;
      name: string;
    };
    notes?: string;
  };
  notes?: string;
}

const WorkerDashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [reports, setReports] = useState<AssignedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'my' | 'all'>('my');
  const [selectedReport, setSelectedReport] = useState<AssignedReport | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [trackingReport, setTrackingReport] = useState<AssignedReport | null>(null);

  useEffect(() => {
    if (user && user._id) {
      loadReports();
    }
  }, [filter, viewMode, user]);

  const loadReports = async () => {
    if (!user || !user._id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const params: any = {
        viewType: viewMode,
        limit: 100
      };
      
      if (filter !== 'all') {
        params.status = filter;
      }
      
      const response = await wasteService.getReports(params);
      
      let reportData: AssignedReport[] = [];
      
      if (response?.data?.data?.reports) {
        reportData = response.data.data.reports;
      } else if (response?.data?.reports) {
        reportData = response.data.reports;
      } else if (Array.isArray(response?.data)) {
        reportData = response.data;
      }

      reportData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setReports(reportData);
      
    } catch (error) {
      console.error('Error loading reports:', error);
      setError('Failed to load reports. Please try again.');
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const claimReport = async (reportId: string) => {
    setActionLoading(reportId);
    
    try {
      const response = await wasteService.claimReport(reportId);
      
      setSuccessMessage(response.message || 'Report claimed successfully!');
      await loadReports();
      
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (error: any) {
      console.error('Error claiming report:', error);
      
      let errorMessage = 'Failed to claim report';
      
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    } finally {
      setActionLoading(null);
    }
  };

  const updateReportStatus = async (reportId: string, newStatus: string, notes?: string) => {
    setActionLoading(reportId);
    
    try {
      await wasteService.updateReportStatus(reportId, newStatus, notes);
      
      setSuccessMessage(`Report status updated to ${newStatus}!`);
      await loadReports();
      setSelectedReport(null);
      
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (error) {
      console.error('Error updating report status:', error);
      setError('Failed to update report status');
      setTimeout(() => setError(null), 5000);
    } finally {
      setActionLoading(null);
    }
  };

  const openLocationTracker = (report: AssignedReport) => {
    setTrackingReport(report);
  };

  const getDirectionsToLocation = (coordinates: [number, number]) => {
    const [longitude, latitude] = coordinates;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    window.open(url, '_blank');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reported': return 'text-gray-600 bg-gray-100';
      case 'assigned': return 'text-orange-600 bg-orange-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      case 'critical': return 'text-red-800 bg-red-200';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'reported': return <Package className="h-4 w-4" />;
      case 'assigned': return <Clock className="h-4 w-4" />;
      case 'in_progress': return <Truck className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatLocation = (location: AssignedReport['location']) => {
    if (location.address?.street) {
      return `${location.address.street}, ${location.address.city}${location.address.state ? `, ${location.address.state}` : ''}`;
    }
    return `Coordinates: ${location.coordinates[1]?.toFixed(4)}, ${location.coordinates[0]?.toFixed(4)}`;
  };

  const getImageUrl = (filename: string) => {
    const token = localStorage.getItem('token');
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const imageUrl = `${baseUrl}/api/waste/image/${filename}${token ? `?token=${token}` : ''}`;
    return imageUrl;
  };

  const myReports = reports.filter(r => r.assignedWorker?._id === user?._id);
  const availableReports = reports.filter(r => !r.assignedWorker);
  const otherWorkersReports = reports.filter(r => r.assignedWorker && r.assignedWorker._id !== user?._id);

  const myPendingReports = myReports.filter(r => r.status === 'assigned' || r.status === 'in_progress');
  const myCompletedReports = myReports.filter(r => r.status === 'completed');

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome, {user?.name}</h1>
              <p className="text-gray-600">Manage your waste collection tasks</p>
            </div>
            <button
              onClick={loadReports}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)}>
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)}>
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center">
              <Truck className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">My Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{myReports.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{myPendingReports.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{myCompletedReports.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Available</p>
                <p className="text-2xl font-bold text-gray-900">{availableReports.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200 p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-4">
                <Filter className="h-5 w-5 text-gray-400" />
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('my')}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      viewMode === 'my'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Truck className="h-4 w-4 inline mr-1" />
                    My Tasks ({myReports.length})
                  </button>
                  <button
                    onClick={() => setViewMode('all')}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      viewMode === 'all'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Users className="h-4 w-4 inline mr-1" />
                    All Tasks ({reports.length})
                  </button>
                </div>
              </div>

              {viewMode === 'my' && (
                <div className="flex gap-2">
                  {['all', 'assigned', 'in_progress', 'completed'].map(option => (
                    <button
                      key={option}
                      onClick={() => setFilter(option)}
                      className={`px-3 py-2 rounded-md text-sm font-medium capitalize ${
                        filter === option
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {option.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {viewMode === 'my' && myReports.length > 0 ? (
              myReports.map(report => (
                <ReportCard
                  key={report._id}
                  report={report}
                  user={user}
                  onClaim={claimReport}
                  onUpdateStatus={updateReportStatus}
                  onViewDetails={setSelectedReport}
                  onTrack={openLocationTracker}
                  actionLoading={actionLoading}
                  getStatusColor={getStatusColor}
                  getSeverityColor={getSeverityColor}
                  getStatusIcon={getStatusIcon}
                  formatDate={formatDate}
                  formatLocation={formatLocation}
                  getImageUrl={getImageUrl}
                />
              ))
            ) : viewMode === 'all' ? (
              <>
                {availableReports.length > 0 && (
                  <div className="p-6 bg-purple-50">
                    <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
                      <Plus className="h-5 w-5 mr-2" />
                      Available Tasks - Claim Now! ({availableReports.length})
                    </h3>
                    <div className="space-y-4">
                      {availableReports.map(report => (
                        <ReportCard
                          key={report._id}
                          report={report}
                          user={user}
                          onClaim={claimReport}
                          onUpdateStatus={updateReportStatus}
                          onViewDetails={setSelectedReport}
                          onTrack={openLocationTracker}
                          actionLoading={actionLoading}
                          getStatusColor={getStatusColor}
                          getSeverityColor={getSeverityColor}
                          getStatusIcon={getStatusIcon}
                          formatDate={formatDate}
                          formatLocation={formatLocation}
                          getImageUrl={getImageUrl}
                          showClaimButton
                        />
                      ))}
                    </div>
                  </div>
                )}

                {myReports.length > 0 && (
                  <div className="p-6 bg-blue-50">
                    <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                      <Truck className="h-5 w-5 mr-2" />
                      My Active Tasks ({myReports.length})
                    </h3>
                    <div className="space-y-4">
                      {myReports.map(report => (
                        <ReportCard
                          key={report._id}
                          report={report}
                          user={user}
                          onClaim={claimReport}
                          onUpdateStatus={updateReportStatus}
                          onViewDetails={setSelectedReport}
                          onTrack={openLocationTracker}
                          actionLoading={actionLoading}
                          getStatusColor={getStatusColor}
                          getSeverityColor={getSeverityColor}
                          getStatusIcon={getStatusIcon}
                          formatDate={formatDate}
                          formatLocation={formatLocation}
                          getImageUrl={getImageUrl}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {otherWorkersReports.length > 0 && (
                  <div className="p-6 bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Other Workers' Tasks ({otherWorkersReports.length})
                    </h3>
                    <div className="space-y-4">
                      {otherWorkersReports.map(report => (
                        <ReportCard
                          key={report._id}
                          report={report}
                          user={user}
                          onClaim={claimReport}
                          onUpdateStatus={updateReportStatus}
                          onViewDetails={setSelectedReport}
                          onTrack={openLocationTracker}
                          actionLoading={actionLoading}
                          getStatusColor={getStatusColor}
                          getSeverityColor={getSeverityColor}
                          getStatusIcon={getStatusIcon}
                          formatDate={formatDate}
                          formatLocation={formatLocation}
                          getImageUrl={getImageUrl}
                          readOnly
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Truck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
                <p className="text-gray-500">No tasks available at the moment.</p>
              </div>
            )}
          </div>
        </div>

        {trackingReport && (
          <LocationModal
            report={trackingReport}
            onClose={() => setTrackingReport(null)}
            onGetDirections={getDirectionsToLocation}
            formatLocation={formatLocation}
          />
        )}

        {selectedReport && (
          <DetailModal
            report={selectedReport}
            user={user}
            onClose={() => setSelectedReport(null)}
            onUpdateStatus={updateReportStatus}
            onTrack={openLocationTracker}
            onGetDirections={getDirectionsToLocation}
            actionLoading={actionLoading}
            getStatusColor={getStatusColor}
            getSeverityColor={getSeverityColor}
            getStatusIcon={getStatusIcon}
            formatDate={formatDate}
            formatLocation={formatLocation}
            getImageUrl={getImageUrl}
          />
        )}
      </div>
    </div>
  );
};

const ReportCard: React.FC<any> = ({
  report,
  user,
  onClaim,
  onUpdateStatus,
  onViewDetails,
  onTrack,
  actionLoading,
  getStatusColor,
  getSeverityColor,
  getStatusIcon,
  formatDate,
  formatLocation,
  getImageUrl,
  showClaimButton = false,
  readOnly = false
}) => {
  const isMyReport = report.assignedWorker?._id === user?._id;
  
  return (
    <div className={`p-6 hover:bg-gray-50 transition-colors ${showClaimButton ? 'border-2 border-purple-200' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-lg font-medium text-gray-900 capitalize">
              {report.wasteType.replace(/_/g, ' ')} Waste
            </h3>
            <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full capitalize ${getStatusColor(report.status)}`}>
              {getStatusIcon(report.status)}
              <span className="ml-1">{report.status.replace(/_/g, ' ')}</span>
            </span>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${getSeverityColor(report.severity)}`}>
              {report.severity}
            </span>
          </div>
          
          <p className="text-gray-600 mb-3 line-clamp-2">{report.description}</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-500 mb-3">
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
              <span className="truncate">{formatLocation(report.location)}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1 flex-shrink-0" />
              <span>{formatDate(report.createdAt)}</span>
            </div>
          </div>
          
          <div className="text-sm text-gray-500">
            {report.reporter && (
              <>
                <strong>Reporter:</strong> {report.reporter.name}
              </>
            )}
            {report.assignedWorker && (
              <span className={report.reporter ? "ml-4" : ""}>
                <strong>Assigned to:</strong> {report.assignedWorker.name}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex flex-col space-y-2 ml-6">
          {showClaimButton && !report.assignedWorker && (
            <button
              onClick={() => onClaim(report._id)}
              disabled={actionLoading === report._id}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 text-sm flex items-center justify-center min-w-[120px]"
            >
              {actionLoading === report._id ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Claim Task
                </>
              )}
            </button>
          )}

          {!readOnly && isMyReport && report.status === 'assigned' && (
            <button
              onClick={() => onUpdateStatus(report._id, 'in_progress')}
              disabled={actionLoading === report._id}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {actionLoading === report._id ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Start Task'}
            </button>
          )}
          
          {!readOnly && isMyReport && report.status === 'in_progress' && (
            <button
              onClick={() => onUpdateStatus(report._id, 'completed')}
              disabled={actionLoading === report._id}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
            >
              {actionLoading === report._id ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Complete'}
            </button>
          )}
          
          <button
            onClick={() => onTrack(report)}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm flex items-center justify-center"
          >
            <Navigation className="h-4 w-4 mr-1" />
            Track
          </button>
          
          <button
            onClick={() => onViewDetails(report)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm flex items-center justify-center"
          >
            View Details
            <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>
      
      {report.images && report.images.length > 0 && (
        <div className="mt-4 flex space-x-2 overflow-x-auto">
          {report.images.slice(0, 4).map((image: any, index: number) => {
            const imageUrl = getImageUrl(image.filename);
            return (
              <img
                key={index}
                src={imageUrl}
                alt={image.originalName || `Report image ${index + 1}`}
                className="w-16 h-16 object-cover rounded-md border cursor-pointer hover:opacity-80"
                onClick={() => onViewDetails(report)}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect width="64" height="64" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

const LocationModal: React.FC<any> = ({ report, onClose, onGetDirections, formatLocation }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg max-w-2xl w-full">
      <div className="border-b p-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Track Location</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="h-6 w-6" />
        </button>
      </div>
      
      <div className="p-6 space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">Location</h3>
          <p className="text-blue-700">{formatLocation(report.location)}</p>
          <p className="text-sm text-blue-600 mt-2">
            {report.location.coordinates[1]?.toFixed(6)}, {report.location.coordinates[0]?.toFixed(6)}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => onGetDirections(report.location.coordinates)}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center"
          >
            <Navigation className="h-5 w-5 mr-2" />
            Get Directions
          </button>
          
          <button
            onClick={() => {
              const [lng, lat] = report.location.coordinates;
              window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
            }}
            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center"
          >
            <Eye className="h-5 w-5 mr-2" />
            View on Map
          </button>
        </div>
      </div>
    </div>
  </div>
);

const DetailModal: React.FC<any> = ({
  report,
  user,
  onClose,
  onUpdateStatus,
  onTrack,
  onGetDirections,
  actionLoading,
  getStatusColor,
  getSeverityColor,
  getStatusIcon,
  formatDate,
  formatLocation,
  getImageUrl
}) => {
  const isMyReport = report.assignedWorker?._id === user?._id;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="border-b p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 capitalize">
              {report.wasteType.replace(/_/g, ' ')} Waste Report
            </h2>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full capitalize ${getStatusColor(report.status)}`}>
                {getStatusIcon(report.status)}
                <span className="ml-1">{report.status.replace(/_/g, ' ')}</span>
              </span>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${getSeverityColor(report.severity)}`}>
                {report.severity}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="space-y-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Description</h3>
              <p className="text-gray-600">{report.description}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 block">Status</label>
                  <p className="capitalize font-medium">{report.status.replace(/_/g, ' ')}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500 block">Severity</label>
                  <p className="capitalize font-medium">{report.severity}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500 block">Quantity</label>
                  <p className="capitalize font-medium">{report.estimatedQuantity.replace(/_/g, ' ')}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 block">Reported On</label>
                  <p className="font-medium">{formatDate(report.createdAt)}</p>
                </div>
                
                {report.reporter && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 block">Reporter</label>
                    <p className="font-medium">{report.reporter.name}</p>
                    <p className="text-sm text-gray-500">{report.reporter.email}</p>
                  </div>
                )}
                
                {report.assignedWorker && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 block">Assigned Worker</label>
                    <p className="font-medium">{report.assignedWorker.name}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500 block mb-2">Location</label>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="font-medium">{formatLocation(report.location)}</p>
                {report.location.description && (
                  <p className="text-gray-600 mt-1">{report.location.description}</p>
                )}
                <p className="text-sm text-gray-500 mt-2">
                  Coordinates: {report.location.coordinates[1]?.toFixed(6)}, {report.location.coordinates[0]?.toFixed(6)}
                </p>
                <div className="flex space-x-2 mt-3">
                  <button
                    onClick={() => onGetDirections(report.location.coordinates)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center"
                  >
                    <Navigation className="h-4 w-4 mr-1" />
                    Directions
                  </button>
                  <button
                    onClick={() => {
                      const [lng, lat] = report.location.coordinates;
                      window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
                    }}
                    className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm flex items-center"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Map
                  </button>
                </div>
              </div>
            </div>
            
            {/* Line 1087-1098: Fixed - Added check for worker object existence */}
            {report.actualCollection && report.actualCollection.worker && (
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-2">Collection Details</label>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm"><strong>Completed by:</strong> {report.actualCollection.worker.name || 'Unknown'}</p>
                  <p className="text-sm"><strong>Date:</strong> {formatDate(report.actualCollection.date)}</p>
                  {report.actualCollection.notes && (
                    <p className="text-sm mt-2"><strong>Notes:</strong> {report.actualCollection.notes}</p>
                  )}
                </div>
              </div>
            )}
            {report.images && report.images.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-3">Images ({report.images.length})</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {report.images.map((image: any, index: number) => (
                    <div key={index} className="relative group">
                      <img
                        src={getImageUrl(image.filename)}
                        alt={image.originalName || `Report image ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(getImageUrl(image.filename), '_blank')}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect width="200" height="200" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="14"%3EImage Error%3C/text%3E%3C/svg%3E';
                        }}
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="truncate">{image.originalName || 'Image'}</p>
                        {image.size && (
                          <p className="text-gray-300">{(image.size / 1024).toFixed(1)} KB</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="border-t p-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {isMyReport && report.status === 'assigned' && (
              <button
                onClick={() => onUpdateStatus(report._id, 'in_progress')}
                disabled={actionLoading === report._id}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
              >
                {actionLoading === report._id ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                Start Task
              </button>
            )}
            
            {isMyReport && report.status === 'in_progress' && (
              <button
                onClick={() => onUpdateStatus(report._id, 'completed')}
                disabled={actionLoading === report._id}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
              >
                {actionLoading === report._id ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                Mark Complete
              </button>
            )}
            
            <button
              onClick={() => onTrack(report)}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center justify-center"
            >
              <Navigation className="h-4 w-4 mr-2" />
              Track Location
            </button>
            
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerDashboard;