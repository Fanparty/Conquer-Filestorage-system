/**
 * What may be uploaded (owner, 2026-11-11): PDF, JPG and PNG (a phone photo of a PO), Excel and
 * Word; up to 10 MB a file and 5 files at a time. Download only: files are never shown inline.
 */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_FILES = 5;

export const ALLOWED_TYPES: Record<string, { label: string; magic: number[][] }> = {
  'application/pdf': { label: 'PDF', magic: [[0x25, 0x50, 0x44, 0x46]] }, // %PDF
  'image/jpeg': { label: 'JPG', magic: [[0xff, 0xd8, 0xff]] },
  'image/png': { label: 'PNG', magic: [[0x89, 0x50, 0x4e, 0x47]] },
  // Excel and Word files are zip archives.
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { label: 'Excel', magic: [[0x50, 0x4b, 0x03, 0x04]] },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { label: 'Word', magic: [[0x50, 0x4b, 0x03, 0x04]] },
  // Older Word (.doc): an OLE compound file.
  'application/msword': { label: 'Word', magic: [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]] },
};

/**
 * A PO's documents are PDF or Word only (owner, 2026-11-13): the PO a client sends or staff
 * record (PENDING, then PURCHASE_ORDER). Other records keep every allowed type.
 */
const PO_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const PO_OWNERS = ['PENDING', 'PURCHASE_ORDER'];
export const typesFor = (ownerType?: string) => (ownerType && PO_OWNERS.includes(ownerType) ? PO_TYPES : Object.keys(ALLOWED_TYPES));
const wordsFor = (ownerType?: string) => (ownerType && PO_OWNERS.includes(ownerType) ? 'PDF or Word (.doc, .docx)' : TYPE_WORDS);

export const TYPE_WORDS = 'PDF, JPG, PNG, Excel (.xlsx) or Word (.doc, .docx)';

/** Problems with the files a browser is about to upload; empty means they may. */
export function checkBatch(files: readonly { name: string; size: number; type: string }[], ownerType?: string): string[] {
  const problems: string[] = [];
  if (files.length === 0) problems.push('Choose a file to upload.');
  if (files.length > MAX_FILES) problems.push(`Upload at most ${MAX_FILES} files at a time.`);
  for (const f of files) {
    if (!ALLOWED_TYPES[f.type] || !typesFor(ownerType).includes(f.type)) problems.push(`${f.name}: only ${wordsFor(ownerType)} files can be uploaded.`);
    if (f.size > MAX_FILE_BYTES) problems.push(`${f.name} is larger than 10 MB.`);
    if (f.size === 0) problems.push(`${f.name} is empty.`);
  }
  return problems;
}

/** Whether the file's first bytes are what its type says (a renamed file is refused). */
export function looksLike(type: string, head: Uint8Array): boolean {
  const spec = ALLOWED_TYPES[type];
  if (!spec) return false;
  return spec.magic.some((sig) => sig.every((b, i) => head[i] === b));
}
