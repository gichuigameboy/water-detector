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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_user_history_user_id ON user_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_history_created_at ON user_history(created_at);