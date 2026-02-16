INSERT INTO storage.buckets (id, name, public) VALUES ('bug-reports', 'bug-reports', false);

CREATE POLICY "Authenticated users can upload bug reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bug-reports');