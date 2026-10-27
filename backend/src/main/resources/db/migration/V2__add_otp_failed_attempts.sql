-- Migration V2: Add failed_attempts counter to password_reset_otps for brute-force lockout
ALTER TABLE password_reset_otps
ADD COLUMN IF NOT EXISTS failed_attempts INTEGER NOT NULL DEFAULT 0;
