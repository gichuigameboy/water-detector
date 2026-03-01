import { supabase } from '../supabaseClient';
import type { 
  AutomationSchedule, 
  PlantProfile, 
  PumpLog, 
  WeatherData, 
  SystemSettingValue
} from '../types/automation';

export class AutomationService {
  // Automation Schedules
  async createSchedule(schedule: Omit<AutomationSchedule, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('automation_schedules')
      .insert(schedule)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getSchedules(userId: string): Promise<AutomationSchedule[]> {
    const { data, error } = await supabase
      .from('automation_schedules')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async updateSchedule(id: number, updates: Partial<AutomationSchedule>) {
    const { data, error } = await supabase
      .from('automation_schedules')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteSchedule(id: number) {
    const { error } = await supabase
      .from('automation_schedules')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Plant Profiles
  async createPlantProfile(profile: Omit<PlantProfile, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('plant_profiles')
      .insert(profile)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getPlantProfiles(userId: string): Promise<PlantProfile[]> {
    const { data, error } = await supabase
      .from('plant_profiles')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async updatePlantProfile(id: number, updates: Partial<PlantProfile>) {
    const { data, error } = await supabase
      .from('plant_profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deletePlantProfile(id: number) {
    const { error } = await supabase
      .from('plant_profiles')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Pump Logs
  async logPumpAction(log: Omit<PumpLog, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('pump_logs')
      .insert(log)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getPumpLogs(userId: string, limit: number = 100): Promise<PumpLog[]> {
    const { data, error } = await supabase
      .from('pump_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async getPumpStats(userId: string, days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('pump_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    const stats = {
      total_activations: data?.length || 0,
      total_duration: data?.reduce((sum: number, log: any) => sum + (log.duration || 0), 0) || 0,
      auto_activations: data?.filter((log: PumpLog) => log.reason === 'threshold').length || 0,
      manual_activations: data?.filter((log: PumpLog) => log.reason === 'manual').length || 0,
      scheduled_activations: data?.filter((log: PumpLog) => log.reason === 'schedule').length || 0
    };

    return stats;
  }

  // Weather Data
  async saveWeatherData(data: Omit<WeatherData, 'id' | 'created_at'>) {
    const { error } = await supabase
      .from('weather_data')
      .insert(data);

    if (error) throw error;
  }

  async getLatestWeatherData(userId: string, zone: string = 'default'): Promise<WeatherData | null> {
    const { data, error } = await supabase
      .from('weather_data')
      .select('*')
      .eq('user_id', userId)
      .eq('zone', zone)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  // System Settings
  async getSystemSettings(userId: string): Promise<SystemSettingValue> {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('user_id', userId)
      .eq('setting_key', 'automation_config')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    return data?.setting_value || this.getDefaultSettings();
  }

  async updateSystemSettings(userId: string, settings: Partial<SystemSettingValue>) {
    const currentSettings = await this.getSystemSettings(userId);
    const updatedSettings = { ...currentSettings, ...settings };

    const { data, error } = await supabase
      .from('system_settings')
      .upsert({
        user_id: userId,
        setting_key: 'automation_config',
        setting_value: updatedSettings,
        updated_at: new Date().toISOString()
      }, { onConflict: ['user_id', 'setting_key'] })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  private getDefaultSettings(): SystemSettingValue {
    return {
      automation_enabled: true,
      weather_integration_enabled: false,
      notification_settings: {
        email: false,
        push: false,
        threshold_alerts: true
      },
      default_zone: 'default',
      measurement_units: 'metric'
    };
  }

  // Automation Logic
  async checkAutomationRules(userId: string, sensorData: {
    soil_moisture_1: number;
    soil_moisture_2: number;
    temperature: number;
    humidity: number;
  }) {
    const schedules = await this.getSchedules(userId);
    const plantProfiles = await this.getPlantProfiles(userId);
    const settings = await this.getSystemSettings(userId);

    if (!settings.automation_enabled) {
      return { should_water: false, reason: 'automation_disabled' };
    }

    // Check moisture-based rules
    for (const profile of plantProfiles) {
      if (!profile.is_active) continue;

      const avgMoisture = (sensorData.soil_moisture_1 + sensorData.soil_moisture_2) / 2;

      if (avgMoisture < profile.soil_moisture_min) {
        return {
          should_water: true,
          reason: 'moisture_threshold',
          zone: profile.zone,
          duration: profile.watering_duration
        };
      }
    }

    // Check schedule-based rules
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    for (const schedule of schedules) {
      if (!schedule.is_active) continue;
      if (!schedule.days_of_week.includes(dayOfWeek)) continue;

      const scheduleStart = schedule.start_time.slice(0, 5);
      const scheduleEnd = schedule.end_time?.slice(0, 5) || '23:59';

      if (currentTime >= scheduleStart && currentTime <= scheduleEnd) {
        return {
          should_water: true,
          reason: 'schedule',
          zone: schedule.zone,
          duration: schedule.watering_duration || 30
        };
      }
    }

    return { should_water: false, reason: 'no_rules_match' };
  }

  // Utility functions
  async getAutomationStatus(userId: string) {
    const schedules = await this.getSchedules(userId);
    const logs = await this.getPumpLogs(userId, 1);
    const settings = await this.getSystemSettings(userId);

    const activeSchedules = schedules.filter(s => s.is_active);
    const lastWatering = logs[0];

    // Calculate next scheduled watering
    let nextScheduled: string | null = null;
    const now = new Date();

    for (const schedule of activeSchedules) {
      if (!schedule.is_active) continue;

      const scheduleTime = new Date();
      scheduleTime.setHours(
        parseInt(schedule.start_time.split(':')[0]),
        parseInt(schedule.start_time.split(':')[1])
      );

      if (scheduleTime > now && schedule.days_of_week.includes(now.getDay())) {
        nextScheduled = scheduleTime.toISOString();
        break;
      }
    }

    return {
      is_active: settings.automation_enabled,
      current_zone: settings.default_zone,
      last_watering: lastWatering?.created_at || null,
      next_scheduled: nextScheduled,
      weather_affected: settings.weather_integration_enabled,
      manual_override: false
    };
  }
}