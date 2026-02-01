-- Profiles table (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Daily scores table
CREATE TABLE IF NOT EXISTS daily_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  guest_name TEXT,
  challenge_date DATE NOT NULL,
  spotify_track_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  accuracy DECIMAL(5,2) NOT NULL,
  max_combo INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Either user_id or guest_name must be set
  CONSTRAINT user_or_guest CHECK (
    (user_id IS NOT NULL AND guest_name IS NULL) OR
    (user_id IS NULL AND guest_name IS NOT NULL)
  )
);

-- Index for fast leaderboard queries
CREATE INDEX idx_daily_scores_leaderboard
  ON daily_scores(challenge_date, score DESC);

-- Index for user's scores
CREATE INDEX idx_daily_scores_user
  ON daily_scores(user_id, challenge_date);

-- Enable RLS
ALTER TABLE daily_scores ENABLE ROW LEVEL SECURITY;

-- Anyone can read scores
CREATE POLICY "Scores are publicly readable"
  ON daily_scores FOR SELECT
  USING (true);

-- Authenticated users can insert their own scores
CREATE POLICY "Users can insert own scores"
  ON daily_scores FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow guest score inserts (will be done via edge function or service role)
CREATE POLICY "Allow guest score inserts"
  ON daily_scores FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL AND guest_name IS NOT NULL);
