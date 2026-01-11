-- Add unique constraint to credit_packages.name
CREATE UNIQUE INDEX IF NOT EXISTS "credit_packages_name_key" ON "credit_packages"("name");
