-- SQL migrations for Arduino Dashboard

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Create user_history table for tracking user activities
CREATE TABLE IF NOT EXISTS user_history (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security) on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Enable RLS on user_history
ALTER TABLE user_history ENABLE ROW LEVEL SECURITY;

-- Create policies for user_history
CREATE POLICY "Users can view own history" ON user_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own history" ON user_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to automatically create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create a table for automation schedules
CREATE TABLE automation_schedules (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  zone VARCHAR(50) DEFAULT 'default',
  is_active BOOLEAN DEFAULT true,
  start_time TIME NOT NULL,
  end_time TIME,
  days_of_week INTEGER[], -- 0=Sunday, 1=Monday, etc.
  soil_moisture_threshold DECIMAL(5,2),
  watering_duration INTEGER, -- in seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a table for plant profiles
CREATE TABLE plant_profiles (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  plant_type VARCHAR(100),
  zone VARCHAR(50) DEFAULT 'default',
  soil_moisture_min DECIMAL(5,2) DEFAULT 30.0,
  soil_moisture_max DECIMAL(5,2) DEFAULT 70.0,
  watering_frequency_days INTEGER DEFAULT 2,
  watering_duration INTEGER DEFAULT 30, -- in seconds
  growth_stage VARCHAR(50) DEFAULT 'mature',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a table for pump logs
CREATE TABLE pump_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  zone VARCHAR(50) DEFAULT 'default',
  action VARCHAR(20) NOT NULL, -- 'ON', 'OFF', 'AUTO', 'MANUAL'
  duration INTEGER, -- in seconds
  reason VARCHAR(100), -- 'schedule', 'threshold', 'manual', 'weather'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a table for weather data
CREATE TABLE weather_data (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  zone VARCHAR(50) DEFAULT 'default',
  temperature DECIMAL(5,2),
  humidity DECIMAL(5,2),
  precipitation DECIMAL(5,2),
  weather_condition VARCHAR(100),
  forecast_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a table for system settings
CREATE TABLE system_settings (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  setting_key VARCHAR(100) NOT NULL,
  setting_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, setting_key)
);

-- Enable Row Level Security on new tables
ALTER TABLE automation_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE plant_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pump_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for automation_schedules
CREATE POLICY "Users can view own automation schedules" ON automation_schedules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own automation schedules" ON automation_schedules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own automation schedules" ON automation_schedules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own automation schedules" ON automation_schedules FOR DELETE USING (auth.uid() = user_id);

-- Create policies for plant_profiles
CREATE POLICY "Users can view own plant profiles" ON plant_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own plant profiles" ON plant_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own plant profiles" ON plant_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own plant profiles" ON plant_profiles FOR DELETE USING (auth.uid() = user_id);

-- Create policies for pump_logs
CREATE POLICY "Users can view own pump logs" ON pump_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pump logs" ON pump_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policies for weather_data
CREATE POLICY "Users can view own weather data" ON weather_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own weather data" ON weather_data FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policies for system_settings
CREATE POLICY "Users can view own system settings" ON system_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own system settings" ON system_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own system settings" ON system_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own system settings" ON system_settings FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_user_history_user_id ON user_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_history_created_at ON user_history(created_at);
CREATE INDEX IF NOT EXISTS idx_automation_schedules_user_id ON automation_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_schedules_active ON automation_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_plant_profiles_user_id ON plant_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_plant_profiles_active ON plant_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_pump_logs_user_id ON pump_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_pump_logs_created_at ON pump_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_weather_data_user_id ON weather_data(user_id);
CREATE INDEX IF NOT EXISTS idx_weather_data_created_at ON weather_data(created_at);
CREATE INDEX IF NOT EXISTS idx_system_settings_user_id ON system_settings(user_id);
