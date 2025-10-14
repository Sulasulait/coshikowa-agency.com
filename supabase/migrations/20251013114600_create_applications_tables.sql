/*
  # Create Applications Tables

  1. New Tables
    - `job_applications`
      - `id` (uuid, primary key)
      - `full_name` (text)
      - `email` (text)
      - `phone` (text)
      - `location` (text, nullable)
      - `education` (text, nullable)
      - `experience` (text, nullable)
      - `skills` (text, nullable)
      - `desired_position` (text)
      - `salary` (text, nullable)
      - `availability` (text, nullable)
      - `additional_info` (text, nullable)
      - `date_of_birth` (text, nullable)
      - `status` (text, default: 'new')
      - `created_at` (timestamptz)
      - `reviewed_at` (timestamptz, nullable)
      - `reviewed_by` (text, nullable)
      - `admin_notes` (text, nullable)

    - `hiring_requests`
      - `id` (uuid, primary key)
      - `company_name` (text)
      - `contact_person` (text)
      - `email` (text)
      - `phone` (text)
      - `industry` (text)
      - `position` (text)
      - `requirements` (text)
      - `urgency` (text)
      - `job_category` (text, nullable)
      - `age_range` (text, nullable)
      - `status` (text, default: 'new')
      - `created_at` (timestamptz)
      - `reviewed_at` (timestamptz, nullable)
      - `reviewed_by` (text, nullable)
      - `admin_notes` (text, nullable)

  2. Security
    - Enable RLS on both tables
    - No public access (admin only via service role)
*/

CREATE TABLE IF NOT EXISTS job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  location text,
  education text,
  experience text,
  skills text,
  desired_position text NOT NULL,
  salary text,
  availability text,
  additional_info text,
  date_of_birth text,
  status text DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'contacted', 'hired', 'rejected')),
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by text,
  admin_notes text
);

CREATE TABLE IF NOT EXISTS hiring_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_person text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  industry text NOT NULL,
  position text NOT NULL,
  requirements text NOT NULL,
  urgency text NOT NULL,
  job_category text,
  age_range text,
  status text DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'matched', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by text,
  admin_notes text
);

ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE hiring_requests ENABLE ROW LEVEL SECURITY;

-- No policies - admin access only via service role key