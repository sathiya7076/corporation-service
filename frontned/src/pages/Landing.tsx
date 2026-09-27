import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Recycle, 
  MapPin, 
  Users, 
  Award,
  ArrowRight,
  CheckCircle,
  Smartphone,
  BarChart3,
  Shield
} from 'lucide-react';

const Landing: React.FC = () => {
  const { user } = useAuth();

  const features = [
    {
      icon: <Smartphone className="h-8 w-8 text-green-600" />,
      title: 'Easy Waste Reporting',
      description: 'Report waste issues with just a few taps. Upload photos and location data to help us respond quickly.'
    },
    {
      icon: <MapPin className="h-8 w-8 text-blue-600" />,
      title: 'Smart Facility Finder',
      description: 'Locate nearby recycling centers, waste treatment plants, and disposal facilities with our interactive map.'
    },
    {
      icon: <Users className="h-8 w-8 text-purple-600" />,
      title: 'Community Engagement',
      description: 'Join a network of eco-conscious citizens working together to create cleaner, more sustainable communities.'
    },
    {
      icon: <Award className="h-8 w-8 text-orange-600" />,
      title: 'Rewards & Recognition',
      description: 'Earn points and badges for your environmental contributions. Track your impact and climb the leaderboard.'
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-green-600" />,
      title: 'Real-time Analytics',
      description: 'Access comprehensive data and insights about waste management in your area through detailed dashboards.'
    },
    {
      icon: <Shield className="h-8 w-8 text-red-600" />,
      title: 'Secure & Reliable',
      description: 'Your data is protected with enterprise-grade security. Built for scalability and reliability.'
    }
  ];

  const stats = [
    { number: '50,000+', label: 'Active Users' },
    { number: '25,000+', label: 'Waste Reports' },
    { number: '500+', label: 'Facilities' },
    { number: '95%', label: 'Success Rate' }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-green-50 via-blue-50 to-green-100 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Smart Waste Management for
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600"> Sustainable Communities</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Empower your community with intelligent waste tracking, citizen engagement, and data-driven insights. 
              Join thousands of users making a real environmental impact.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {user ? (
                <Link
                  to="/dashboard"
                  className="bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center"
                >
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center"
                  >
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                  <Link
                    to="/facilities"
                    className="border-2 border-green-600 text-green-700 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-green-600 hover:text-white transition-all duration-200"
                  >
                    Explore Facilities
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 hidden lg:block">
          <div className="bg-white p-4 rounded-full shadow-lg animate-bounce">
            <Recycle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="absolute bottom-20 right-10 hidden lg:block">
          <div className="bg-white p-4 rounded-full shadow-lg animate-pulse">
            <MapPin className="h-8 w-8 text-blue-600" />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index} className="space-y-2">
                <div className="text-3xl md:text-4xl font-bold text-gray-900">
                  {stat.number}
                </div>
                <div className="text-gray-600 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Powerful Features for Everyone
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From citizens to administrators, our platform provides the tools needed to create 
              more efficient and sustainable waste management systems.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-200 border border-gray-100">
                <div className="flex items-center mb-4">
                  {feature.icon}
                  <h3 className="text-xl font-semibold text-gray-900 ml-3">
                    {feature.title}
                  </h3>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Get started in minutes and make an immediate impact in your community
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="bg-gradient-to-r from-green-100 to-green-200 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-200">
                <span className="text-2xl font-bold text-green-700">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Sign Up & Learn</h3>
              <p className="text-gray-600">
                Create your account and complete our interactive training modules to learn about proper waste management.
              </p>
            </div>

            <div className="text-center group">
              <div className="bg-gradient-to-r from-blue-100 to-blue-200 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-200">
                <span className="text-2xl font-bold text-blue-700">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Report & Engage</h3>
              <p className="text-gray-600">
                Report waste issues, find facilities, and engage with your community to drive positive environmental change.
              </p>
            </div>

            <div className="text-center group">
              <div className="bg-gradient-to-r from-purple-100 to-purple-200 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-200">
                <span className="text-2xl font-bold text-purple-700">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Earn & Track</h3>
              <p className="text-gray-600">
                Earn reward points, track your environmental impact, and see real-time data about your community's progress.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Why Choose EcoManage?
              </h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-300 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">Proven Impact</h3>
                    <p className="text-green-100">Over 95% success rate in waste collection and community engagement.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-300 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">User-Friendly</h3>
                    <p className="text-green-100">Intuitive design that works for all ages and technical skill levels.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-300 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">Real-Time Data</h3>
                    <p className="text-green-100">Live tracking and analytics to measure your environmental impact.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-300 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">Community Focused</h3>
                    <p className="text-green-100">Built by the community, for the community with continuous feedback integration.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-white mb-6">Ready to Make a Difference?</h3>
              <p className="text-green-100 mb-6">
                Join thousands of users who are already making their communities cleaner and more sustainable.
              </p>
              {!user && (
                <Link
                  to="/register"
                  className="inline-flex items-center bg-white text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200"
                >
                  Start Your Journey
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Start Building a Sustainable Future Today
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Every action counts. Join our community and be part of the solution.
          </p>
          {!user && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:from-green-700 hover:to-green-800 transition-all duration-200"
              >
                Sign Up Now
              </Link>
              <Link
                to="/login"
                className="border-2 border-green-600 text-green-400 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-green-600 hover:text-white transition-all duration-200"
              >
                Already a Member?
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Landing;