-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "stored_files" (
    "id" TEXT NOT NULL,
    "owner_app" TEXT NOT NULL,
    "owner_type" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storage" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "uploaded_by_kind" TEXT NOT NULL,
    "uploaded_by_id" TEXT,
    "uploaded_by_name" TEXT,
    "uploaded_via" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_name" TEXT,

    CONSTRAINT "stored_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_events" (
    "id" SERIAL NOT NULL,
    "file_id" TEXT,
    "action" TEXT NOT NULL,
    "by_app" TEXT NOT NULL,
    "by_name" TEXT,
    "detail" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stored_files_storage_key_key" ON "stored_files"("storage_key");

-- CreateIndex
CREATE INDEX "stored_files_owner_app_owner_type_owner_id_idx" ON "stored_files"("owner_app", "owner_type", "owner_id");

-- CreateIndex
CREATE INDEX "file_events_file_id_created_at_idx" ON "file_events"("file_id", "created_at");

-- AddForeignKey
ALTER TABLE "file_events" ADD CONSTRAINT "file_events_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "stored_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

