import React, { useState, useEffect } from 'react';
import type { 
  AutomationSchedule, 
  PlantProfile, 
  PumpLog, 
  SystemSettingValue,
  ScheduleFormData,
  PlantProfileFormData
} from '../types/automation';
import { AutomationService } from '../services/automationService';
import { supabase } from '../supabaseClient';

const automationService = new AutomationService();

export default function AutomationPage() {
  const [user, setUser] = useState<any>(null);
  const [schedules, setSchedules] = useState<AutomationSchedule[]>([]);
  const [plantProfiles, setPlantProfiles] = useState<PlantProfile[]>([]);
  const [pumpLogs, setPumpLogs] = useState<PumpLog[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettingValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'schedules' | 'plants' | 'logs' | 'settings'>('schedules');

  useEffect(() => {
    const checkUser = async () => {
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      }
    };
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadAutomationData();
    }
  }, [user]);

  const loadAutomationData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [scheduleData, plantData, logData, settingsData] = await Promise.all([
        automationService.getSchedules(user.id),
        automationService.getPlantProfiles(user.id),
        automationService.getPumpLogs(user.id, 50),
        automationService.getSystemSettings(user.id)
      ]);
      
      setSchedules(scheduleData);
      setPlantProfiles(plantData);
      setPumpLogs(logData);
      setSystemSettings(settingsData);
    } catch (error) {
      console.error('Error loading automation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async (scheduleData: ScheduleFormData) => {
    if (!user) return;
    
    try {
      const newSchedule = await automationService.createSchedule({
        ...scheduleData,
        user_id: user.id
      });
      setSchedules(prev => [...prev, newSchedule]);
    } catch (error) {
      console.error('Error creating schedule:', error);
    }
  };

  const handleUpdateSchedule = async (id: number, updates: Partial<AutomationSchedule>) => {
    try {
      const updatedSchedule = await automationService.updateSchedule(id, updates);
      setSchedules(prev => prev.map(s => s.id === id ? updatedSchedule : s));
    } catch (error) {
      console.error('Error updating schedule:', error);
    }
  };

  const handleDeleteSchedule = async (id: number) => {
    try {
      await automationService.deleteSchedule(id);
      setSchedules(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  const handleCreatePlantProfile = async (profileData: PlantProfileFormData) => {
    if (!user) return;
    
    try {
      const newProfile = await automationService.createPlantProfile({
        ...profileData,
        user_id: user.id
      });
      setPlantProfiles(prev => [...prev, newProfile]);
    } catch (error) {
      console.error('Error creating plant profile:', error);
    }
  };

  const handleUpdatePlantProfile = async (id: number, updates: Partial<PlantProfile>) => {
    try {
      const updatedProfile = await automationService.updatePlantProfile(id, updates);
      setPlantProfiles(prev => prev.map(p => p.id === id ? updatedProfile : p));
    } catch (error) {
      console.error('Error updating plant profile:', error);
    }
  };

  const handleDeletePlantProfile = async (id: number) => {
    try {
      await automationService.deletePlantProfile(id);
      setPlantProfiles(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting plant profile:', error);
    }
  };

  const handleUpdateSettings = async (updates: Partial<SystemSettingValue>) => {
    if (!user) return;
    
    try {
      const updatedSettings = await automationService.updateSystemSettings(user.id, updates);
      setSystemSettings(updatedSettings);
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Automation & Control</h1>
          <p className="mt-2 text-gray-600">Smart irrigation and automation settings</p>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Automation Status</h3>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-green-600">
                {systemSettings?.automation_enabled ? 'Active' : 'Inactive'}
              </span>
              <div className={`w-3 h-3 rounded-full ${systemSettings?.automation_enabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Schedules</h3>
            <div className="text-2xl font-bold text-blue-600">
              {schedules.filter(s => s.is_active).length}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Plant Profiles</h3>
            <div className="text-2xl font-bold text-green-600">
              {plantProfiles.filter(p => p.is_active).length}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Last Watering</h3>
            <div className="text-sm text-gray-600">
              {pumpLogs[0]?.created_at ? new Date(pumpLogs[0].created_at).toLocaleString() : 'Never'}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: 'schedules', name: 'Schedules', count: schedules.length },
                { id: 'plants', name: 'Plant Profiles', count: plantProfiles.length },
                { id: 'logs', name: 'Pump Logs', count: pumpLogs.length },
                { id: 'settings', name: 'Settings', count: 0 }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.name}
                  {tab.count > 0 && (
                    <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'schedules' && (
              <ScheduleTab
                schedules={schedules}
                onCreate={handleCreateSchedule}
                onUpdate={handleUpdateSchedule}
                onDelete={handleDeleteSchedule}
              />
            )}
            
            {activeTab === 'plants' && (
              <PlantProfilesTab
                profiles={plantProfiles}
                onCreate={handleCreatePlantProfile}
                onUpdate={handleUpdatePlantProfile}
                onDelete={handleDeletePlantProfile}
              />
            )}
            
            {activeTab === 'logs' && (
              <PumpLogsTab logs={pumpLogs} />
            )}
            
            {activeTab === 'settings' && (
              <SettingsTab
                settings={systemSettings}
                onUpdate={handleUpdateSettings}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Schedule Tab Component
function ScheduleTab({ 
  schedules, 
  onCreate, 
  onUpdate, 
  onDelete 
}: {
  schedules: AutomationSchedule[];
  onCreate: (data: ScheduleFormData) => void;
  onUpdate: (id: number, updates: Partial<AutomationSchedule>) => void;
  onDelete: (id: number) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<ScheduleFormData>({
    name: '',
    zone: 'default',
    is_active: true,
    start_time: '06:00',
    end_time: '08:00',
    days_of_week: [1, 3, 5],
    soil_moisture_threshold: 40,
    watering_duration: 30
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
    setShowForm(false);
    setFormData({
      name: '',
      zone: 'default',
      is_active: true,
      start_time: '06:00',
      end_time: '08:00',
      days_of_week: [1, 3, 5],
      soil_moisture_threshold: 40,
      watering_duration: 30
    });
  };

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Automation Schedules</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Add Schedule
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Schedule</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Schedule Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Zone</label>
                <input
                  type="text"
                  value={formData.zone}
                  onChange={(e) => setFormData({...formData, zone: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Time</label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End Time</label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Days of Week</label>
              <div className="mt-2 grid grid-cols-7 gap-2">
                {daysOfWeek.map((day, index) => (
                  <label key={day} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.days_of_week.includes(index)}
                      onChange={(e) => {
                        const newDays = e.target.checked
                          ? [...formData.days_of_week, index]
                          : formData.days_of_week.filter(d => d !== index);
                        setFormData({...formData, days_of_week: newDays});
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{day.slice(0, 3)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Moisture Threshold (%)</label>
                <input
                  type="number"
                  value={formData.soil_moisture_threshold}
                  onChange={(e) => setFormData({...formData, soil_moisture_threshold: parseInt(e.target.value)})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Watering Duration (seconds)</label>
                <input
                  type="number"
                  value={formData.watering_duration}
                  onChange={(e) => setFormData({...formData, watering_duration: parseInt(e.target.value)})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  min="10"
                  max="300"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Active</span>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Schedule
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {schedules.map((schedule) => (
          <div key={schedule.id} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">{schedule.name}</h3>
                <p className="text-sm text-gray-600 mt-1">Zone: {schedule.zone}</p>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Time:</span>
                    <span className="ml-2 font-medium">{schedule.start_time} - {schedule.end_time || '23:59'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Days:</span>
                    <span className="ml-2 font-medium">
                      {schedule.days_of_week.map(d => daysOfWeek[d]).join(', ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Threshold:</span>
                    <span className="ml-2 font-medium">{schedule.soil_moisture_threshold || 'N/A'}%</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  schedule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {schedule.is_active ? 'Active' : 'Inactive'}
                </span>
                <button
                  onClick={() => onUpdate(schedule.id, { is_active: !schedule.is_active })}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {schedule.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => onDelete(schedule.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Plant Profiles Tab Component
function PlantProfilesTab({ 
  profiles, 
  onCreate, 
  onUpdate, 
  onDelete 
}: {
  profiles: PlantProfile[];
  onCreate: (data: PlantProfileFormData) => void;
  onUpdate: (id: number, updates: Partial<PlantProfile>) => void;
  onDelete: (id: number) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<PlantProfileFormData>({
    name: '',
    plant_type: '',
    zone: 'default',
    soil_moisture_min: 30,
    soil_moisture_max: 70,
    watering_frequency_days: 2,
    watering_duration: 30,
    growth_stage: 'mature',
    is_active: true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
    setShowForm(false);
    setFormData({
      name: '',
      plant_type: '',
      zone: 'default',
      soil_moisture_min: 30,
      soil_moisture_max: 70,
      watering_frequency_days: 2,
      watering_duration: 30,
      growth_stage: 'mature',
      is_active: true
    });
  };

  const growthStages = ['seedling', 'vegetative', 'flowering', 'mature'];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Plant Profiles</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          Add Plant Profile
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Plant Profile</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Plant Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Plant Type</label>
                <input
                  type="text"
                  value={formData.plant_type}
                  onChange={(e) => setFormData({...formData, plant_type: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Zone</label>
                <input
                  type="text"
                  value={formData.zone}
                  onChange={(e) => setFormData({...formData, zone: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Growth Stage</label>
                <select
                  value={formData.growth_stage}
                  onChange={(e) => setFormData({...formData, growth_stage: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {growthStages.map(stage => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Min Moisture (%)</label>
                <input
                  type="number"
                  value={formData.soil_moisture_min}
                  onChange={(e) => setFormData({...formData, soil_moisture_min: parseInt(e.target.value)})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Max Moisture (%)</label>
                <input
                  type="number"
                  value={formData.soil_moisture_max}
                  onChange={(e) => setFormData({...formData, soil_moisture_max: parseInt(e.target.value)})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Watering Duration (seconds)</label>
                <input
                  type="number"
                  value={formData.watering_duration}
                  onChange={(e) => setFormData({...formData, watering_duration: parseInt(e.target.value)})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  min="10"
                  max="300"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Watering Frequency (days)</label>
                <input
                  type="number"
                  value={formData.watering_frequency_days}
                  onChange={(e) => setFormData({...formData, watering_frequency_days: parseInt(e.target.value)})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  min="1"
                  max="14"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Active</span>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Create Profile
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {profiles.map((profile) => (
          <div key={profile.id} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">{profile.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{profile.plant_type || 'Unknown type'} • {profile.growth_stage}</p>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Zone:</span>
                    <span className="ml-2 font-medium">{profile.zone}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Moisture Range:</span>
                    <span className="ml-2 font-medium">{profile.soil_moisture_min}% - {profile.soil_moisture_max}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Duration:</span>
                    <span className="ml-2 font-medium">{profile.watering_duration}s</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  profile.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {profile.is_active ? 'Active' : 'Inactive'}
                </span>
                <button
                  onClick={() => onUpdate(profile.id, { is_active: !profile.is_active })}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {profile.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => onDelete(profile.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Pump Logs Tab Component
function PumpLogsTab({ logs }: { logs: PumpLog[] }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Pump Activity Logs</h2>
      
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      log.action === 'ON' ? 'bg-green-100 text-green-800' :
                      log.action === 'OFF' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.zone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.duration ? `${log.duration}s` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.reason || 'Manual'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Settings Tab Component
function SettingsTab({ 
  settings, 
  onUpdate 
}: {
  settings: SystemSettingValue | null;
  onUpdate: (updates: Partial<SystemSettingValue>) => void;
}) {
  if (!settings) return null;

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">System Settings</h2>
      
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Automation Control</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Enable Automation</label>
                <p className="text-sm text-gray-500">Allow automatic watering based on schedules and thresholds</p>
              </div>
              <button
                onClick={() => onUpdate({ automation_enabled: !settings.automation_enabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                  settings.automation_enabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.automation_enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Weather Integration</label>
                <p className="text-sm text-gray-500">Use weather data to optimize watering decisions</p>
              </div>
              <button
                onClick={() => onUpdate({ weather_integration_enabled: !settings.weather_integration_enabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                  settings.weather_integration_enabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.weather_integration_enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Email Notifications</label>
                <p className="text-sm text-gray-500">Receive email alerts for critical conditions</p>
              </div>
              <button
                onClick={() => onUpdate({ 
                  notification_settings: { ...settings.notification_settings, email: !settings.notification_settings.email }
                })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                  settings.notification_settings.email ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.notification_settings.email ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Push Notifications</label>
                <p className="text-sm text-gray-500">Receive browser push notifications</p>
              </div>
              <button
                onClick={() => onUpdate({ 
                  notification_settings: { ...settings.notification_settings, push: !settings.notification_settings.push }
                })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                  settings.notification_settings.push ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.notification_settings.push ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Threshold Alerts</label>
                <p className="text-sm text-gray-500">Get notified when moisture levels are critical</p>
              </div>
              <button
                onClick={() => onUpdate({ 
                  notification_settings: { ...settings.notification_settings, threshold_alerts: !settings.notification_settings.threshold_alerts }
                })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                  settings.notification_settings.threshold_alerts ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.notification_settings.threshold_alerts ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">General Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Default Zone</label>
              <input
                type="text"
                value={settings.default_zone}
                onChange={(e) => onUpdate({ default_zone: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Measurement Units</label>
              <select
                value={settings.measurement_units}
                onChange={(e) => onUpdate({ measurement_units: e.target.value as 'metric' | 'imperial' })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="metric">Metric (°C, %)</option>
                <option value="imperial">Imperial (°F, %)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}