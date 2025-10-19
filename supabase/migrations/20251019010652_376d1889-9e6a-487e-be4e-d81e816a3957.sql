-- Fix questionnaire_responses RLS policy to require authentication
-- This prevents unauthenticated users from inserting questionnaire responses

-- First, drop the old insecure policy if it exists
DROP POLICY IF EXISTS "Anyone can submit questionnaire" ON public.questionnaire_responses;

-- Drop the policy if it was already created, to recreate it properly
DROP POLICY IF EXISTS "Authenticated users can submit questionnaire" ON public.questionnaire_responses;

-- Create the secure policy that requires authentication and proper user_id
CREATE POLICY "Authenticated users can submit questionnaire"
ON public.questionnaire_responses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Make user_id NOT NULL to prevent unassociated responses
-- First, set any NULL user_ids to a placeholder (if any exist)
-- This step is safe because the edge function should have already set user_id for all records
UPDATE public.questionnaire_responses 
SET user_id = '00000000-0000-0000-0000-000000000000'::uuid
WHERE user_id IS NULL;

-- Now make the column NOT NULL
ALTER TABLE public.questionnaire_responses 
ALTER COLUMN user_id SET NOT NULL;