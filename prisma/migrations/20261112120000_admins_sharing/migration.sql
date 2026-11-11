-- Admin sign-in for the home page, sharing a file with the client, the record's label, and when
-- each calling app last used its token (owner, 2026-11-11). Additive.
ALTER TABLE "stored_files" ADD COLUMN IF NOT EXISTS "owner_label" TEXT;
ALTER TABLE "stored_files" ADD COLUMN IF NOT EXISTS "shared_with_client" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "admins_email_key" ON "admins"("email");

CREATE TABLE IF NOT EXISTS "caller_uses" (
    "caller" TEXT NOT NULL,
    "last_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "caller_uses_pkey" PRIMARY KEY ("caller")
);
