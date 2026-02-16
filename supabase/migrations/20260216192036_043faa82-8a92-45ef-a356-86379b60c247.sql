-- Allow anon users to also upload bug reports
CREATE POLICY "Anon users can upload bug reports"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'bug-reports');