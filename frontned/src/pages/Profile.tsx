import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  User, Mail, Phone, MapPin, Award, Calendar, Edit, Save, X, Camera, Trophy, Star, AlertCircle 
} from 'lucide-react';
import api from '../services/api';

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: {
      street: user?.address?.street || '',
      city: user?.address?.city || '',
      state: user?.address?.state || '',
      zipCode: user?.address?.zipCode || ''
    },
    profile: {
      bio: user?.profile?.bio || '',
      dateOfBirth: user?.profile?.dateOfBirth || ''
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else if (name.startsWith('profile.')) {
      const profileField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          [profileField]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const form = new FormData();
      form.append('name', formData.name);
      form.append('phone', formData.phone);
      form.append('address', JSON.stringify(formData.address));
      form.append('profile', JSON.stringify(formData.profile));
      if (imageFile) form.append('avatar', imageFile);

      await api.put('/users/profile', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      await updateUser(); // refresh user
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      phone: user?.phone || '',
      address: {
        street: user?.address?.street || '',
        city: user?.address?.city || '',
        state: user?.address?.state || '',
        zipCode: user?.address?.zipCode || ''
      },
      profile: {
        bio: user?.profile?.bio || '',
        dateOfBirth: user?.profile?.dateOfBirth || ''
      }
    });
    setIsEditing(false);
    setImageFile(null);
    setError('');
    setSuccess('');
  };

  const getLevelColor = (level: string) => {
    const colors = {
      bronze: 'text-orange-700 bg-orange-100',
      silver: 'text-gray-700 bg-gray-100',
      gold: 'text-yellow-700 bg-yellow-100',
      platinum: 'text-purple-700 bg-purple-100'
    };
    return colors[level as keyof typeof colors] || 'text-gray-700 bg-gray-100';
  };

  if (!user) return null;

  const badges = user.rewards?.badges || [];
  const penalties = user.penalties || [];
  const training = user.training || {};
  const stats = user.statistics || {};

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-2">Manage your account information and preferences</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4 flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="ml-3 text-sm text-red-800">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4 flex">
            <Trophy className="h-5 w-5 text-green-400" />
            <p className="ml-3 text-sm text-green-800">{success}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* MAIN PROFILE */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-semibold">Personal Information</h2>
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} className="flex items-center px-4 py-2 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md">
                    <Edit className="h-4 w-4 mr-2" /> Edit
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button onClick={handleSave} disabled={loading} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md">
                      <Save className="h-4 w-4 mr-2" /> {loading ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={handleCancel} className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md">
                      <X className="h-4 w-4 mr-2" /> Cancel
                    </button>
                  </div>
                )}
              </div>

              <div className="p-6">
                {/* PROFILE PICTURE */}
                <div className="flex items-center mb-6">
                  <div className="relative">
                    <div className="w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center">
                      {user.profile?.avatar ? (
                        <img src={user.profile.avatar} alt="Profile" className="w-20 h-20 rounded-full object-cover" />
                      ) : (
                        <User className="h-8 w-8 text-gray-600" />
                      )}
                    </div>
                    {isEditing && (
                      <>
                        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="avatarUpload" />
                        <label htmlFor="avatarUpload" className="absolute bottom-0 right-0 bg-green-600 text-white rounded-full p-2 cursor-pointer">
                          <Camera className="h-3 w-3" />
                        </label>
                      </>
                    )}
                  </div>
                  <div className="ml-6">
                    <h3 className="text-lg font-medium">{user.name}</h3>
                    <p className="text-gray-600 capitalize">{user.role?.replace('_', ' ')}</p>
                    <div className="flex items-center mt-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${getLevelColor(user.rewards?.level || 'bronze')}`}>
                        {user.rewards?.level || 'bronze'} Level
                      </span>
                      <span className="ml-2 text-sm text-gray-500">{user.rewards?.points || 0} points</span>
                    </div>
                  </div>
                </div>

                {/* Editable Fields */}
                <div className="space-y-4">
                  <div className="flex items-center"><Mail className="h-5 w-5 mr-2 text-gray-400" /><span>{user.email}</span></div>
                  <div className="flex items-center"><Phone className="h-5 w-5 mr-2 text-gray-400" /><span>{user.phone || 'N/A'}</span></div>
                  <div className="flex items-center"><MapPin className="h-5 w-5 mr-2 text-gray-400" /><span>{`${user.address?.street || ''} ${user.address?.city || ''}`}</span></div>
                  <div className="flex items-center"><Calendar className="h-5 w-5 mr-2 text-gray-400" /><span>Member since {new Date(user.createdAt).toLocaleDateString()}</span></div>
                </div>

                {/* Training & Reports */}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2">Progress</h3>
                  <p>Reports Submitted: {stats.reportsSubmitted || 0}</p>
                  <p>Training Completed: {stats.trainingCompleted || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="space-y-6">
            {/* Rewards */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Rewards</h3>
              <p>Level: {user.rewards?.level}</p>
              <p>Total Points: {user.rewards?.totalEarned}</p>
              <p>Badges: {badges.length}</p>
            </div>

            {/* Badges */}
            {badges.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">Badges</h3>
                {badges.map((badge, i) => (
                  <div key={i} className="flex items-center space-x-3 mb-3">
                    <Star className="text-yellow-600" />
                    <div>
                      <p className="font-medium">{badge.name}</p>
                      <p className="text-sm text-gray-500">{badge.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Penalties */}
            {penalties.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">Penalties</h3>
                {penalties.map((penalty, i) => (
                  <div key={i} className="flex justify-between items-center bg-red-50 p-3 rounded-lg mb-2">
                    <div>
                      <p className="font-medium text-red-900">{penalty.reason}</p>
                      <p className="text-sm text-red-600">${penalty.amount}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${penalty.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {penalty.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
