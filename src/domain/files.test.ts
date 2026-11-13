import { describe, expect, it, beforeAll } from 'vitest';
import { checkBatch, looksLike, MAX_FILE_BYTES } from './limits';
import { callerOf, mayTouch } from './callers';
import { issuePermit, readPermit } from './permits';
import { originAllowed } from './origins';

const PDF = 'application/pdf';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

describe('what may be uploaded', () => {
  it('PDF, JPG, PNG, Excel and Word, up to 10 MB, 5 at a time', () => {
    expect(checkBatch([{ name: 'po.pdf', size: 1000, type: PDF }])).toEqual([]);
    expect(checkBatch([{ name: 'big.pdf', size: MAX_FILE_BYTES + 1, type: PDF }])[0]).toMatch(/larger than 10 MB/);
    expect(checkBatch([{ name: 'x.exe', size: 10, type: 'application/x-msdownload' }])[0]).toMatch(/only PDF/);
    expect(checkBatch(Array.from({ length: 6 }, (_, i) => ({ name: `${i}.pdf`, size: 10, type: PDF })))[0]).toMatch(/at most 5/);
    expect(checkBatch([])).toEqual(['Choose a file to upload.']);
    // A PO's documents: PDF or Word only (owner, 2026-11-13).
    expect(checkBatch([{ name: 'po.png', size: 10, type: 'image/png' }], 'PENDING')[0]).toMatch(/only PDF or Word/);
    expect(checkBatch([{ name: 'po.doc', size: 10, type: 'application/msword' }], 'PURCHASE_ORDER')).toEqual([]);
    expect(checkBatch([{ name: 'photo.png', size: 10, type: 'image/png' }], 'TICKET')).toEqual([]);
  });

  it('a renamed file is caught by its first bytes', () => {
    expect(looksLike(PDF, new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe(true);
    expect(looksLike(PDF, new Uint8Array([0x4d, 0x5a, 0x90, 0x00]))).toBe(false); // an .exe
    expect(looksLike(XLSX, new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toBe(true);
  });
});

describe('who may call', () => {
  beforeAll(() => {
    process.env.FILES_TOKEN_CRM = 'c'.repeat(40);
    process.env.FILES_TOKEN_PORTAL = 'p'.repeat(40);
    process.env.FILES_PERMIT_SECRET = 's'.repeat(40);
  });
  const req = (token?: string) => new Request('http://x', { headers: token ? { authorization: `Bearer ${token}` } : {} });

  it('each app by its own token; a portal only reaches POs and requests', () => {
    expect(callerOf(req('c'.repeat(40)))).toBe('CRM');
    expect(callerOf(req('p'.repeat(40)))).toBe('PORTAL');
    expect(callerOf(req('wrong'))).toBe(null);
    expect(callerOf(req())).toBe(null);
    expect(mayTouch('PORTAL', 'CRM', 'PURCHASE_ORDER')).toBe(true);
    expect(mayTouch('PORTAL', 'CRM', 'QUOTATION')).toBe(false);
    expect(mayTouch('CSP', 'CRM', 'PURCHASE_ORDER')).toBe(false);
  });

  it('a permit says where the files go, and a forged one is refused', async () => {
    const { permit } = await issuePermit({ ownerApp: 'CRM', ownerType: 'PURCHASE_ORDER', ownerId: '12', via: 'PORTAL', uploader: { kind: 'CLIENT', id: '7', name: 'Asha' } });
    expect((await readPermit(permit))?.ownerId).toBe('12');
    expect(await readPermit(permit.slice(0, -2) + 'xx')).toBe(null);
    expect(await readPermit(null)).toBe(null);
  });
});

describe('which pages may upload', () => {
  const list = 'https://crm.conquer-tech.com,https://*-conquer.vercel.app';
  it('exact addresses and patterns; nothing else', () => {
    expect(originAllowed('https://crm.conquer-tech.com', list)).toBe(true);
    expect(originAllowed('https://crm-web-git-staging-conquer.vercel.app', list)).toBe(true);
    expect(originAllowed('https://evil.example.com', list)).toBe(false);
    expect(originAllowed('https://x-conquer.vercel.app.evil.com', list)).toBe(false);
    expect(originAllowed('', list)).toBe(false);
  });
});
