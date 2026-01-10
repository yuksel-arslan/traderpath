-- Add first login tracking fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS registration_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS first_login_bonus_received BOOLEAN DEFAULT FALSE;

-- Set registration_email for existing users based on their current email
UPDATE users SET registration_email = email WHERE registration_email IS NULL;
