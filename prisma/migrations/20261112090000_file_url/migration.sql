-- The file's address in storage (owner, 2026-11-11: UploadThing's free plan, no private files, so
-- downloads use the file's own unguessable address, handed out only after the caller checked access).
ALTER TABLE "stored_files" ADD COLUMN IF NOT EXISTS "url" TEXT;
