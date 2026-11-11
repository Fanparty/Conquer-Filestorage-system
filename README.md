# Conquer Files

The platform's shared file service (owner, 2026-11-11), the first of the shared services. It keeps
the index of every document clients and staff upload (client POs first, then ticket, quotation and
deal attachments), issues upload permits and hands out short-lived download links. The files are in
object storage: UploadThing now; a Vercel Blob driver can replace `src/domain/storage.ts` later.

It has no screens. The CRM, the Customer Portal and the CSP call it.

## Rules

- PDF, JPG, PNG, Excel (.xlsx), Word (.docx); at most **10 MB** a file and **5** at a time.
- A file's first bytes must match its type, or it is deleted and never listed.
- Files are **download only** (no preview). On UploadThing's free plan they are **public at an
  unguessable address** (no private ACL): the address is only handed out after the calling app has
  checked access, but it does not expire. With a paid plan, set `FILES_PRIVATE=true` and turn on
  private files on the dashboard: links then last 5 minutes.
- Each calling app has its own token and may only reach its own kinds of record
  (`src/domain/callers.ts`). The calling app checks its user may see or change the record first.

## How an upload works

1. The app's server (CRM or portal) checks the person may attach files to the record, then
   `POST /api/v1/permits` `{ ownerApp, ownerType, ownerId, uploader: { kind, id, name } }`
   with `Authorization: Bearer <its token>`. It gets a permit (10 minutes) and the limits.
2. The browser uploads with UploadThing's client to `<FILES_URL>/api/uploadthing` (route
   `document`), sending the permit in the `x-conquer-file-permit` header. Bytes go straight to
   storage, never through a Vercel function (which refuses bodies over 4.5 MB).
3. When storage has the file, this service checks its first bytes and records it against the
   record. The upload answers `{ fileId }` (or `rejected` with the reason).

## API (all with the caller's bearer token)

| Method and path | What |
|---|---|
| `POST /api/v1/permits` | An upload permit for one record |
| `GET /api/v1/files?ownerApp=&ownerType=&ownerId=` | A record's files, newest first (`ownerId` may be a comma list) |
| `GET /api/v1/files/:id/link?by=<name>` | A download link (5 minutes when private) |
| `DELETE /api/v1/files/:id` `{ by }` | Remove a file |
| `GET /api/health` | Up, and the database answers |

## Settings

| Name | What |
|---|---|
| `DATABASE_URL` | This service's own Neon database (the file index) |
| `UPLOADTHING_TOKEN` | The UploadThing app's token |
| `FILES_PERMIT_SECRET` | Signs upload permits (32+ characters) |
| `FILES_TOKEN_CRM`, `FILES_TOKEN_PORTAL`, `FILES_TOKEN_CSP` | Each caller's token (32+ characters); the same value is set on that app |
| `FILES_ALLOWED_ORIGINS` | Comma list of the sites whose pages upload (portal, CRM) |

| `FILES_PRIVATE` | `true` only on a paid UploadThing plan with private files turned on (default off) |

Paid plan only: on the UploadThing dashboard turn on **private files (ACL)** and **allow overriding
the signed URL expiry**, then set `FILES_PRIVATE=true`.

## Commands

    npm install
    npx prisma migrate deploy   # creates the tables (stored_files, file_events)
    npm run dev                 # http://localhost:3013
    npm test
