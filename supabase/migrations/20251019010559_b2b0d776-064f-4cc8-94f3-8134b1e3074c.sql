-- Fix questionnaire_responses RLS policy to require authentication
-- This prevents unauthenticated users from inserting questionnaire responses

-- First, remove existing records with NULL user_id (these are the security vulnerability)
DELETE FROM public.questionnaire_responses WHERE user_id IS NULL;

-- Drop the insecure policy that allows anyone to insert
DROP POLICY IF EXISTS "Anyone can submit questionnaire" ON public.questionnaire_responses;

-- Create a secure policy that requires authentication and proper user_id
CREATE POLICY "Authenticated users can submit questionnaire"
ON public.questionnaire_responses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Make user_id NOT NULL to prevent future unassociated responses
ALTER TABLE public.questionnaire_responses 
ALTER COLUMN user_id SET NOT NULL;