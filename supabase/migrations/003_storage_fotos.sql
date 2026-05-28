-- Storage bucket for desvio photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'desvios',
  'desvios',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "desvios_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'desvios');

-- Anon upload (internal tool)
CREATE POLICY "desvios_anon_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'desvios');

-- Anon delete
CREATE POLICY "desvios_anon_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'desvios');
