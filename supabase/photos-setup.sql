-- ============================================
-- Pocket Matip - Photos Table Setup
-- ============================================

-- 1. Create photos table for metadata
CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text NOT NULL,
  work_date date NOT NULL DEFAULT CURRENT_DATE,
  photo_type text NOT NULL CHECK (photo_type IN ('before', 'after', 'issue', 'other')),
  storage_path text NOT NULL UNIQUE,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL,
  description text,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_photos_project_id ON photos(project_id);
CREATE INDEX IF NOT EXISTS idx_photos_work_date ON photos(work_date);
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at DESC);

-- 3. Enable RLS
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Allow authenticated users to view all photos (adjust based on your needs)
CREATE POLICY "photos_select_policy" ON photos
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert their own photos
CREATE POLICY "photos_insert_policy" ON photos
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by OR uploaded_by IS NULL);

-- Allow users to update their own photos
CREATE POLICY "photos_update_policy" ON photos
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = uploaded_by)
  WITH CHECK (auth.uid() = uploaded_by);

-- Allow users to delete their own photos
CREATE POLICY "photos_delete_policy" ON photos
  FOR DELETE
  TO authenticated
  USING (auth.uid() = uploaded_by);

-- Allow anonymous access for demo (remove in production)
CREATE POLICY "photos_anon_select" ON photos
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "photos_anon_insert" ON photos
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "photos_anon_delete" ON photos
  FOR DELETE
  TO anon
  USING (true);

-- 5. Updated_at trigger
CREATE OR REPLACE FUNCTION update_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER photos_updated_at_trigger
  BEFORE UPDATE ON photos
  FOR EACH ROW
  EXECUTE FUNCTION update_photos_updated_at();

-- ============================================
-- Storage Bucket Setup (Run in Supabase Dashboard)
-- ============================================
--
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create new bucket: "site-photos"
-- 3. Set as PRIVATE (not public)
-- 4. Add the following policies:
--
-- Policy for SELECT (view/download):
-- Name: "Allow authenticated users to view photos"
-- Allowed operation: SELECT
-- Policy definition: (auth.role() = 'authenticated') OR (auth.role() = 'anon')
--
-- Policy for INSERT (upload):
-- Name: "Allow authenticated users to upload photos"
-- Allowed operation: INSERT
-- Policy definition: (auth.role() = 'authenticated') OR (auth.role() = 'anon')
--
-- Policy for DELETE:
-- Name: "Allow authenticated users to delete photos"
-- Allowed operation: DELETE
-- Policy definition: (auth.role() = 'authenticated') OR (auth.role() = 'anon')

-- ============================================
-- Helper function to get signed URL (optional)
-- ============================================
-- Note: Signed URLs are typically generated client-side using supabase-js
-- This is just for reference if you need server-side generation

-- Example query to get photos with filters:
-- SELECT * FROM photos
-- WHERE project_id = 'PROJECT_ID'
-- AND work_date BETWEEN '2024-01-01' AND '2024-12-31'
-- ORDER BY created_at DESC;
