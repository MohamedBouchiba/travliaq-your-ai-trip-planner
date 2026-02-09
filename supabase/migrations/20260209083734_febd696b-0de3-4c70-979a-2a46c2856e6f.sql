-- Backfill the one orphaned trip_summaries record that has a matching auth user
UPDATE trip_summaries 
SET user_id = '146b5edd-8ebe-49a1-a2f4-666ee4071dcb'
WHERE id = '6db1a0f1-15cc-40d6-b81b-5a87d3101f29' 
  AND user_id IS NULL;

-- Update RLS policy to remove the insecure email fallback
-- The remaining 3 orphaned records belong to users who never signed up
-- They will remain inaccessible (which is safer than email-based access)
DROP POLICY IF EXISTS "Users can view own trip summaries" ON public.trip_summaries;

CREATE POLICY "Users can view own trip summaries"
ON public.trip_summaries
FOR SELECT
USING (
  (auth.uid() = user_id) 
  OR has_role(auth.uid(), 'admin')
);