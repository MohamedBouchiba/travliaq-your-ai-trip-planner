-- Storage RLS policies for Images_blog (private bucket, public read) and TRIPS (public bucket)
-- Create policies only if they don't already exist

-- Images_blog: Public read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read Images_blog'
  ) THEN
    CREATE POLICY "Public read Images_blog"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'Images_blog');
  END IF;
END $$;

-- Images_blog: Admin insert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admin insert Images_blog'
  ) THEN
    CREATE POLICY "Admin insert Images_blog"
    ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'Images_blog' AND public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Images_blog: Admin update
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admin update Images_blog'
  ) THEN
    CREATE POLICY "Admin update Images_blog"
    ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'Images_blog' AND public.has_role(auth.uid(), 'admin'))
    WITH CHECK (bucket_id = 'Images_blog' AND public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Images_blog: Admin delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admin delete Images_blog'
  ) THEN
    CREATE POLICY "Admin delete Images_blog"
    ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'Images_blog' AND public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- TRIPS: Public read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read TRIPS'
  ) THEN
    CREATE POLICY "Public read TRIPS"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'TRIPS');
  END IF;
END $$;

-- TRIPS: Admin insert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admin insert TRIPS'
  ) THEN
    CREATE POLICY "Admin insert TRIPS"
    ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'TRIPS' AND public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- TRIPS: Admin update
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admin update TRIPS'
  ) THEN
    CREATE POLICY "Admin update TRIPS"
    ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'TRIPS' AND public.has_role(auth.uid(), 'admin'))
    WITH CHECK (bucket_id = 'TRIPS' AND public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- TRIPS: Admin delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admin delete TRIPS'
  ) THEN
    CREATE POLICY "Admin delete TRIPS"
    ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'TRIPS' AND public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;