import type { NextRequest } from 'next/server';
import { createRouteHandler } from 'uploadthing/next';
import { fileRouter } from './core';
import { originAllowed } from '@/domain/origins';

/**
 * UploadThing's endpoint. The Customer Portal and the CRM upload from their own pages, so their
 * origins (FILES_ALLOWED_ORIGINS, comma-separated) may call it from the browser.
 */
// A cold start plus the permit check and UploadThing's own call can run past a short default.
export const maxDuration = 60;

const handler = createRouteHandler({ router: fileRouter, config: { token: process.env.UPLOADTHING_TOKEN } });

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  if (!originAllowed(origin)) {
    if (origin) console.warn(`[files] upload from ${origin} refused: add it to FILES_ALLOWED_ORIGINS`);
    return {};
  }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    // What the uploader sends, whatever its version adds.
    'Access-Control-Allow-Headers': req.headers.get('access-control-request-headers') || 'content-type, x-conquer-file-permit, x-uploadthing-package, x-uploadthing-version, traceparent, b3',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

async function withCors(req: NextRequest, run: (req: NextRequest) => Promise<Response>): Promise<Response> {
  const res = await run(req);
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(cors(req))) headers.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

export const GET = (req: NextRequest) => withCors(req, handler.GET);
export const POST = (req: NextRequest) => withCors(req, handler.POST);
export const OPTIONS = (req: Request) => new Response(null, { status: 204, headers: cors(req) });
