import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { trainingService, TrainingModuleType, UserProgress } from '../services/trainingService';
import { BookOpen, CheckCircle, Award, TrendingUp, Play, Search, Clock, AlertCircle } from 'lucide-react';

interface Stats {
  totalStarted: number;
  totalCompleted: number;
  totalPoints: number;
  averageScore: number;
}

interface ModuleWithProgress extends TrainingModuleType {
  userProgress?: UserProgress | null;
}

const Training: React.FC = () => {
  const [modules, setModules] = useState<ModuleWithProgress[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalStarted: 0,
    totalCompleted: 0,
    totalPoints: 0,
    averageScore: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => { loadTrainingData(); }, [categoryFilter, levelFilter]);

  const loadTrainingData = async () => {
    setLoading(true);
    try {
      const [modulesResponse, progressResponse] = await Promise.all([
        trainingService.getTrainingModules(),
        trainingService.getProgress()
      ]);

      console.group('🔍 Training Data Debug - DETAILED');
      console.log('Modules Response:', modulesResponse);
      console.log('Progress Response:', progressResponse);
      console.log('Progress Array:', progressResponse.progress);
      console.log('Stats:', progressResponse.stats);

      // DETAILED LOGGING - Log each progress entry completely
      if (progressResponse.progress && Array.isArray(progressResponse.progress)) {
        progressResponse.progress.forEach((p: any, index: number) => {
          console.group(`📦 Progress Entry ${index}:`);
          console.log('Full Object:', p);
          console.log('All Keys:', Object.keys(p));
          console.log('All Values:', Object.values(p));
          
          // Log each possible field
          console.log('Field Analysis:', {
            '_id': p._id,
            'trainingModule': p.trainingModule,
            'moduleId': p.moduleId,
            'module': p.module,
            'trainingModuleId': p.trainingModuleId,
            'progress': p.progress,
            'isCompleted': p.isCompleted,
            'videoCompleted': p.videoCompleted
          });
          console.groupEnd();
        });
      }

      // Create a map of progress data indexed by module ID for faster lookup
      const progressMap = new Map();
      
      if (progressResponse.progress && Array.isArray(progressResponse.progress)) {
        progressResponse.progress.forEach((p: any, progressIndex: number) => {
          let moduleId = null;
          
          // Get all keys to see what's actually in the object
          const allKeys = Object.keys(p);
          console.log(`🔑 Checking progress entry ${progressIndex}, keys:`, allKeys);
          
          // Try ALL possible variations and log each attempt
          const attempts = [
            { name: 'trainingModule', value: p.trainingModule },
            { name: 'moduleId', value: p.moduleId },
            { name: 'module', value: p.module },
            { name: 'trainingModuleId', value: p.trainingModuleId }
          ];
          
          for (const attempt of attempts) {
            console.log(`  Testing ${attempt.name}:`, attempt.value);
            if (attempt.value) {
              moduleId = typeof attempt.value === 'string' ? attempt.value : attempt.value._id;
              if (moduleId) {
                console.log(`  ✓ Found moduleId in ${attempt.name}: ${moduleId}`);
                break;
              }
            }
          }
          
          // If still no moduleId, try to extract from the object keys themselves
          if (!moduleId) {
            console.warn('❌ Could not find module ID in any standard field, checking all keys...');
            for (const key of allKeys) {
              const value = p[key];
              console.log(`  Checking key "${key}":`, value);
              if (value && typeof value === 'string' && value.length === 24) {
                // Looks like a MongoDB ObjectId
                console.log(`  Potential ObjectId found in "${key}": ${value}`);
                moduleId = value;
                break;
              } else if (value && typeof value === 'object' && value._id) {
                console.log(`  Object with _id found in "${key}":`, value._id);
                moduleId = value._id;
                break;
              }
            }
          }
          
          if (moduleId) {
            const normalizedId = String(moduleId);
            progressMap.set(normalizedId, p);
            console.log(`✅ Successfully mapped progress for module: ${normalizedId}`);
          } else {
            console.error('❌ FAILED to extract module ID from progress entry:', p);
          }
        });
      }

      console.log('📊 Progress Map Size:', progressMap.size);
      console.log('📊 Progress Map Contents:', Array.from(progressMap.entries()));
      console.groupEnd();

      // Map user progress to modules using the progress map
      const modulesWithProgress: ModuleWithProgress[] = modulesResponse.map(module => {
        const normalizedModuleId = String(module._id);
        const progress = progressMap.get(normalizedModuleId);
        
        // Create a proper UserProgress object or null
        const userProgress: UserProgress | null = progress ? {
          progress: Number(progress.progress) || 0,
          currentSection: progress.currentSection || 0,
          isCompleted: Boolean(progress.isCompleted),
          videoCompleted: Boolean(progress.videoCompleted),
          videoCompletedAt: progress.videoCompletedAt,
          quizAttempts: progress.quizAttempts || []
        } : null;
        
        console.log(`🎯 Module: "${module.title}" (${module._id})`, {
          foundProgress: !!progress,
          userProgress: userProgress
        });
        
        return { ...module, userProgress };
      });

      console.log('🎊 Final Modules with Progress:', modulesWithProgress);

      setModules(modulesWithProgress);
      setStats(progressResponse.stats || { totalStarted: 0, totalCompleted: 0, totalPoints: 0, averageScore: 0 });
    } catch (error) {
      console.error('❌ Error loading training data:', error);
      setModules([]);
      setStats({ totalStarted: 0, totalCompleted: 0, totalPoints: 0, averageScore: 0 });
    } finally {
      setLoading(false);
    }
  };

  // Filter modules by search and category/level
  const filteredModules = modules.filter(m =>
    (m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.description.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (categoryFilter === 'all' || m.category === categoryFilter) &&
    (levelFilter === 'all' || m.level === levelFilter)
  );

  const getCategoryColor = (category: string) => ({
    waste_sorting: 'bg-blue-100 text-blue-800',
    recycling: 'bg-green-100 text-green-800',
    composting: 'bg-yellow-100 text-yellow-800',
    hazardous_waste: 'bg-red-100 text-red-800',
    reduction_tips: 'bg-purple-100 text-purple-800',
    environmental_impact: 'bg-indigo-100 text-indigo-800'
  }[category] || 'bg-gray-100 text-gray-800');

  const getLevelColor = (level: string) => ({
    beginner: 'bg-green-100 text-green-800',
    intermediate: 'bg-orange-100 text-orange-800',
    advanced: 'bg-red-100 text-red-800'
  }[level] || 'bg-gray-100 text-gray-800');

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
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">Training Center</h1>
          <button
            onClick={() => setDebugMode(!debugMode)}
            className="text-xs px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            {debugMode ? 'Hide Debug' : 'Show Debug'}
          </button>
        </div>
        <p className="text-gray-600 mb-8">Enhance your waste management knowledge and earn rewards</p>

        {/* Debug Info */}
        {debugMode && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-2 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Debug Information
            </h3>
            <div className="text-xs space-y-1">
              <p>Total Modules: {modules.length}</p>
              <p>Modules with Progress: {modules.filter(m => m.userProgress).length}</p>
              <p>Completed Modules: {modules.filter(m => m.userProgress?.isCompleted).length}</p>
              <p>Stats - Started: {stats.totalStarted}, Completed: {stats.totalCompleted}</p>
            </div>
            <button
              onClick={loadTrainingData}
              className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            >
              Reload Data
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Started</p>
                <p className="text-2xl font-bold">{stats.totalStarted}</p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completed</p>
                <p className="text-2xl font-bold">{stats.totalCompleted}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Points</p>
                <p className="text-2xl font-bold">{stats.totalPoints}</p>
              </div>
              <Award className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Avg Score</p>
                <p className="text-2xl font-bold">{stats.averageScore.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search modules..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              <option value="waste_sorting">Waste Sorting</option>
              <option value="recycling">Recycling</option>
              <option value="composting">Composting</option>
              <option value="hazardous_waste">Hazardous Waste</option>
              <option value="reduction_tips">Reduction Tips</option>
              <option value="environmental_impact">Environmental Impact</option>
            </select>
            <select
              value={levelFilter}
              onChange={e => setLevelFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModules.map(module => {
            const completed = module.userProgress?.isCompleted === true;
            const progress = module.userProgress?.progress || 0;
            const hasStarted = module.userProgress !== null && module.userProgress !== undefined;
            
            return (
              <div key={module._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h2 className="text-xl font-semibold text-gray-900">{module.title}</h2>
                    {completed && (
                      <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 ml-2" />
                    )}
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{module.description}</p>
                  
                  {debugMode && (
                    <div className="mb-3 p-2 bg-gray-100 rounded text-xs">
                      <p>Has Progress: {hasStarted ? 'Yes' : 'No'}</p>
                      <p>Progress: {progress}%</p>
                      <p>Completed: {completed ? 'Yes' : 'No'}</p>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(module.category)}`}>
                      {module.category.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getLevelColor(module.level)}`}>
                      {module.level.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>{module.estimatedDuration} min</span>
                    </div>
                    <div className="flex items-center">
                      <Award className="h-4 w-4 mr-1" />
                      <span>{module.pointsReward} pts</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Progress</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          completed ? 'bg-green-500' : hasStarted ? 'bg-blue-500' : 'bg-gray-300'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex items-center justify-between">
                    {completed ? (
                      <>
                        <span className="text-sm font-medium text-green-600 flex items-center">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Completed
                        </span>
                        <Link
                          to={`/training/${module._id}`}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition text-sm font-medium"
                        >
                          Review
                        </Link>
                      </>
                    ) : hasStarted && progress > 0 ? (
                      <Link
                        to={`/training/${module._id}`}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm font-medium text-center flex items-center justify-center"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Continue
                      </Link>
                    ) : (
                      <Link
                        to={`/training/${module._id}`}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition text-sm font-medium text-center flex items-center justify-center"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Start
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredModules.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No modules found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Training;