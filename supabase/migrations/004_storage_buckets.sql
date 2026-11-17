-- JHOIE SIGNATURES - Migration 004: Storage Buckets & Access Control Policies
-- Run this fourth in the Supabase SQL Editor.

-- 1. Public bucket for verified admin product photographs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 2. Strictly PRIVATE bucket for customer custom-order reference photographs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'custom-references',
  'custom-references',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Storage Policies for `product-images`
DROP POLICY IF EXISTS "Public reads product images" ON storage.objects;
CREATE POLICY "Public reads product images"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Admins upload product images" ON storage.objects;
CREATE POLICY "Admins upload product images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

DROP POLICY IF EXISTS "Admins update product images" ON storage.objects;
CREATE POLICY "Admins update product images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

DROP POLICY IF EXISTS "Admins delete product images" ON storage.objects;
CREATE POLICY "Admins delete product images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin());

-- Storage Policies for private `custom-references`
-- Visitors may upload a reference photo into `requests/...`, but cannot read, list, overwrite, or delete files.
DROP POLICY IF EXISTS "Customers upload private custom reference images" ON storage.objects;
CREATE POLICY "Customers upload private custom reference images"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'custom-references'
    AND (storage.foldername(name))[1] = 'requests'
    AND name ~* '^requests/[a-z0-9_-]+\.(jpg|jpeg|png|webp)$'
  );

DROP POLICY IF EXISTS "Admins and owners read custom reference images" ON storage.objects;
CREATE POLICY "Admins and owners read custom reference images"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'custom-references'
    AND (
      public.is_admin()
      OR owner = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins manage custom reference images" ON storage.objects;
CREATE POLICY "Admins manage custom reference images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'custom-references' AND public.is_admin());
