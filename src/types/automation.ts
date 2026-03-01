export interface AutomationSchedule {
  id: number;
  user_id: string;
  name: string;
  zone: string;
  is_active: boolean;
  start_time: string;
  end_time: string | null;
  days_of_week: number[];
  soil_moisture_threshold: number | null;
  watering_duration: number | null;
  created_at: string;
  updated_at: string;
}

export interface PlantProfile {
  id: number;
  user_id: string;
  name: string;
  plant_type: string | null;
  zone: string;
  soil_moisture_min: number;
  soil_moisture_max: number;
  watering_frequency_days: number;
  watering_duration: number;
  growth_stage: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PumpLog {
  id: number;
  user_id: string;
  zone: string;
  action: 'ON' | 'OFF' | 'AUTO' | 'MANUAL';
  duration: number | null;
  reason: string | null;
  created_at: string;
}

export interface WeatherData {
  id: number;
  user_id: string;
  zone: string;
  temperature: number | null;
  humidity: number | null;
  precipitation: number | null;
  weather_condition: string | null;
  forecast_data: WeatherForecast;
  created_at: string;
}

export interface WeatherForecast {
  current: {
    temperature: number;
    humidity: number;
    condition: string;
    wind_speed: number;
  };
  hourly: Array<{
    time: string;
    temperature: number;
    precipitation: number;
    condition: string;
  }>;
  daily: Array<{
    date: string;
    temp_min: number;
    temp_max: number;
    precipitation: number;
    condition: string;
  }>;
}

export interface SystemSetting {
  id: number;
  user_id: string;
  setting_key: string;
  setting_value: SystemSettingValue;
  created_at: string;
  updated_at: string;
}

export interface SystemSettingValue {
  automation_enabled: boolean;
  weather_integration_enabled: boolean;
  notification_settings: {
    email: boolean;
    push: boolean;
    threshold_alerts: boolean;
  };
  default_zone: string;
  measurement_units: 'metric' | 'imperial';
}

export interface ZoneConfig {
  id: string;
  name: string;
  description: string;
  sensors: {
    soil_moisture_1: boolean;
    soil_moisture_2: boolean;
    temperature: boolean;
    humidity: boolean;
  };
  pumps: {
    main: boolean;
    backup: boolean;
  };
}

export interface AutomationStatus {
  is_active: boolean;
  current_zone: string;
  last_watering: string | null;
  next_scheduled: string | null;
  weather_affected: boolean;
  manual_override: boolean;
}

export interface ThresholdConfig {
  soil_moisture_min: number;
  soil_moisture_max: number;
  temperature_min: number;
  temperature_max: number;
  humidity_min: number;
  humidity_max: number;
}

export interface ScheduleFormData {
  name: string;
  zone: string;
  is_active: boolean;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  soil_moisture_threshold: number;
  watering_duration: number;
}

export interface PlantProfileFormData {
  name: string;
  plant_type: string;
  zone: string;
  soil_moisture_min: number;
  soil_moisture_max: number;
  watering_frequency_days: number;
  watering_duration: number;
  growth_stage: string;
  is_active: boolean;
}

export interface WeatherConfig {
  api_key: string;
  location: {
    latitude: number;
    longitude: number;
  };
  enabled: boolean;
  update_interval: number; // minutes
}

export interface AutomationRule {
  id: string;
  name: string;
  condition: {
    type: 'moisture' | 'time' | 'weather' | 'manual';
    threshold?: number;
    time?: string;
    weather_conditions?: string[];
  };
  action: {
    type: 'water' | 'stop' | 'notify';
    duration?: number;
    zones?: string[];
  };
  priority: number;
  enabled: boolean;
}