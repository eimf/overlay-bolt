/*
  # Create sketches table for Overlay Notes

  1. New Tables
    - `sketches`
      - `id` (uuid, primary key) - unique sketch identifier
      - `user_id` (uuid) - owner reference to auth.users
      - `title` (text) - user-provided name for the sketch
      - `strokes` (jsonb) - array of stroke objects (path points, color, width, tool)
      - `mode` (text) - 'fullscreen' or 'floating'
      - `opacity` (numeric) - canvas opacity 0..1
      - `background` (text) - background color / 'transparent'
      - `created_at` (timestamptz) - creation timestamp
      - `updated_at` (timestamptz) - last modification timestamp

  2. Security
    - Enable RLS on `sketches`
    - Policies restricting read/write to the owner only
*/

CREATE TABLE IF NOT EXISTS sketches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled Sketch',
  strokes jsonb NOT NULL DEFAULT '[]'::jsonb,
  mode text NOT NULL DEFAULT 'fullscreen',
  opacity numeric NOT NULL DEFAULT 1.0,
  background text NOT NULL DEFAULT 'transparent',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sketches_user_id_idx ON sketches(user_id);
CREATE INDEX IF NOT EXISTS sketches_updated_at_idx ON sketches(updated_at DESC);

ALTER TABLE sketches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sketches"
  ON sketches FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sketches"
  ON sketches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sketches"
  ON sketches FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sketches"
  ON sketches FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
