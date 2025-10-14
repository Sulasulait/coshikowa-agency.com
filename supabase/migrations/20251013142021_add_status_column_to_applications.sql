/*
  # Add status column to applications tables

  1. Changes
    - Add `status` column to `job_applications` table
    - Add `status` column to `hiring_requests` table
    - Set default value to 'new' for both columns
  
  2. Purpose
    - Track the status of job applications (new, reviewing, interviewed, hired, rejected)
    - Track the status of hiring requests (new, in_progress, completed, cancelled)
*/

-- Add status column to job_applications if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_applications' AND column_name = 'status'
  ) THEN
    ALTER TABLE job_applications ADD COLUMN status text DEFAULT 'new' NOT NULL;
  END IF;
END $$;

-- Add status column to hiring_requests if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hiring_requests' AND column_name = 'status'
  ) THEN
    ALTER TABLE hiring_requests ADD COLUMN status text DEFAULT 'new' NOT NULL;
  END IF;
END $$;
