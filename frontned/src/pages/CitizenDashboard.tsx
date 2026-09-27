import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { wasteService } from '../services/wasteService';
import { trainingService } from '../services/trainingService';
import { 
  MapPin, 
  BookOpen, 
  Trophy, 
  AlertTriangle,
  Calendar,
  Plus,
  Clock,
  CheckCircle,
  Award
} from 'lucide-react';

interface DashboardStats {
  reportsSubmitted: number;
  trainingCompleted: number;
  pointsEarned: number;
  currentLevel: string;
}

interface RecentReport {
  _id: string;
  wasteType: string;
  status: string;
  createdAt: string;
  location: {
    address?: {
      city: string;
    };
  };
}

interface TrainingModule {
  _id: string;
  title: string;
  category: string;
  level: string;
  estimatedDuration: number;
  userProgress: {
    progress: number;
    isCompleted: boolean;
  };
}

const CitizenDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    reportsSubmitted: 0,
    trainingCompleted: 0,
    pointsEarned: 0,
    currentLevel: 'bronze'
  });
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [trainingModules, setTrainingModules] = useState<TrainingModule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

const loadDashboardData = async () => {
  try {
    const [reportsResponse, trainingResponse] = await Promise.all([
      wasteService.getReports({ limit: 5 }),
      trainingService.getTrainingModules() // returns TrainingModuleType[]
    ]);

    setRecentReports(reportsResponse.data.reports);

    // Map the API response to match TrainingModule type
    const mappedModules: TrainingModule[] = trainingResponse.map((m: any) => ({
      ...m,
      userProgress: m.userProgress || { progress: 0, isCompleted: false } // default if missing
    }));

    setTrainingModules(mappedModules.slice(0, 4));

    if (user) {
      setStats({
        reportsSubmitted: reportsResponse.data.pagination.total,
        trainingCompleted: mappedModules.filter((m) => m.userProgress.isCompleted).length,
        pointsEarned: user.rewards.points,
        currentLevel: user.rewards.level
      });
    }
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  } finally {
    setLoading(false);
  }
};


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'assigned': return 'text-orange-600 bg-orange-100';
      case 'reported': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'bronze': return 'text-orange-700 bg-orange-100';
      case 'silver': return 'text-gray-700 bg-gray-100';
      case 'gold': return 'text-yellow-700 bg-yellow-100';
      case 'platinum': return 'text-purple-700 bg-purple-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="text-gray-600">
            Here's what's happening in your environmental journey
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MapPin className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Reports Submitted</p>
                <p className="text-2xl font-bold text-gray-900">{stats.reportsSubmitted}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BookOpen className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Training Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.trainingCompleted}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Trophy className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Points Earned</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pointsEarned}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Award className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Current Level</p>
                <span className={`inline-flex px-2 py-1 text-sm font-semibold rounded-full capitalize ${getLevelColor(stats.currentLevel)}`}>
                  {stats.currentLevel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link
                  to="/report-waste"
                  className="flex items-center w-full p-4 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors duration-200"
                >
                  <Plus className="h-5 w-5 text-green-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Report Waste</p>
                    <p className="text-sm text-gray-500">Submit a new waste report</p>
                  </div>
                </Link>

                <Link
                  to="/training"
                  className="flex items-center w-full p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors duration-200"
                >
                  <BookOpen className="h-5 w-5 text-blue-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Training Modules</p>
                    <p className="text-sm text-gray-500">Learn about waste management</p>
                  </div>
                </Link>

                <Link
                  to="/facilities"
                  className="flex items-center w-full p-4 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors duration-200"
                >
                  <MapPin className="h-5 w-5 text-purple-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Find Facilities</p>
                    <p className="text-sm text-gray-500">Locate nearby centers</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Upcoming Collections */}
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Collection Schedule</h2>
              <div className="space-y-3">
                <div className="flex items-center p-3 bg-green-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-green-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Recyclables</p>
                    <p className="text-sm text-gray-500">Tomorrow, 8:00 AM</p>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Organic Waste</p>
                    <p className="text-sm text-gray-500">Friday, 9:00 AM</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Reports */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Recent Reports</h2>
                <Link 
                  to="/reports" 
                  className="text-green-600 hover:text-green-700 font-medium"
                >
                  View All
                </Link>
              </div>
              
              {recentReports.length > 0 ? (
                <div className="space-y-4">
                  {recentReports.map((report) => (
                    <div key={report._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                            <AlertTriangle className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900 capitalize">
                              {report.wasteType.replace('_', ' ')} Waste
                            </h3>
                            <p className="text-sm text-gray-500">
                              {report.location.address?.city || 'Location not specified'} • 
                              {new Date(report.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${getStatusColor(report.status)}`}>
                          {report.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No reports yet</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by reporting your first waste issue.</p>
                  <Link
                    to="/report-waste"
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Report Waste
                  </Link>
                </div>
              )}
            </div>

            {/* Training Progress */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Continue Learning</h2>
                <Link 
                  to="/training" 
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  View All
                </Link>
              </div>

              {trainingModules.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {trainingModules.map((module) => (
                    <Link
                      key={module._id}
                      to={`/training/${module._id}`}
                      className="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors duration-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900 text-sm">{module.title}</h3>
                        {module.userProgress.isCompleted ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 capitalize mb-2">
                        {module.category.replace('_', ' ')} • {module.level} • {module.estimatedDuration} min
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${module.userProgress.progress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {module.userProgress.progress}% complete
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <BookOpen className="mx-auto h-10 w-10 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No training modules available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitizenDashboard;
