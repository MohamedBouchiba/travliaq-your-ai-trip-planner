-- Table to persist planner sessions linked to user accounts
CREATE TABLE public.planner_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_session_id TEXT NOT NULL,
  
  -- Snapshot of localStorage data
  flight_memory JSONB DEFAULT '{}',
  accommodation_memory JSONB DEFAULT '{}',
  travel_memory JSONB DEFAULT '{}',
  chat_messages JSONB DEFAULT '[]',
  
  -- Metadata
  title TEXT DEFAULT 'Nouvelle conversation',
  preview TEXT DEFAULT 'Démarrez la conversation...',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unique constraint: one session per chat_session_id per user
  CONSTRAINT unique_user_chat_session UNIQUE (user_id, chat_session_id)
);

-- Index for fast lookups by user
CREATE INDEX idx_planner_sessions_user_id ON public.planner_sessions(user_id);

-- Index for lookup by chat_session_id
CREATE INDEX idx_planner_sessions_chat_session_id ON public.planner_sessions(chat_session_id);

-- Enable RLS
ALTER TABLE public.planner_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can only access their own sessions
CREATE POLICY "Users can view own sessions"
  ON public.planner_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON public.planner_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.planner_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON public.planner_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_planner_sessions_updated_at
  BEFORE UPDATE ON public.planner_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();