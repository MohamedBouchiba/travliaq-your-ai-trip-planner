
-- Create rate_limits table for persistent rate limiting across edge function cold starts
CREATE TABLE public.rate_limits (
  ip TEXT NOT NULL,
  function_name TEXT NOT NULL DEFAULT 'default',
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (ip, function_name)
);

-- Enable RLS (only edge functions access this via service role)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No public policies: accessed only via service_role key from edge functions

-- Index for cleanup queries
CREATE INDEX idx_rate_limits_window ON public.rate_limits (window_start);

-- Auto-cleanup: delete expired entries older than 2 hours
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  DELETE FROM public.rate_limits WHERE window_start < now() - interval '2 hours';
$$;
