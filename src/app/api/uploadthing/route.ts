import type { NextRequest } from 'next/server';
import { createRouteHandler } from 'uploadthing/next';
import { fileRouter } from './core';

/**
 * UploadThing's endpoint. The Customer Portal and the CRM upload from their own pages, so their
 * origins (FILES_ALLOWED_ORIGINS, comma-separated) may call it from the browser.
 */
const handler = createRouteHandler({ router: fileRouter, config: { token: process.env.UPLOADTHING_TOKEN } });

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const allowed = (process.env.FILES_ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
  if (!origin || !allowed.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, x-conquer-file-permit, x-uploadthing-package, x-uploadthing-version, traceparent, b3',
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
