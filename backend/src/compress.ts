import { NextFunction, Request, Response } from 'express';
import zlib from 'node:zlib';

const MIN_LENGTH = 512;

function pickEncoding(header: string | undefined): 'br' | 'gzip' | null {
  if (!header) return null;
  const accepted = header.toLowerCase().split(',').map((h) => h.trim().split(';')[0]!.trim());
  if (typeof zlib.brotliCompress === 'function' && accepted.includes('br')) return 'br';
  if (typeof zlib.gzip === 'function' && (accepted.includes('gzip') || accepted.includes('*'))) return 'gzip';
  return null;
}

export function compress() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent || req.method === 'HEAD') return next();
    const encoding = pickEncoding(req.headers['accept-encoding'] as string | undefined);
    if (!encoding) return next();

    const originalJson = res.json.bind(res);

    res.json = ((body: unknown) => {
      const payload = typeof body === 'string' ? Buffer.from(body) : Buffer.from(JSON.stringify(body));
      if (payload.length < MIN_LENGTH) return originalJson(body);

      const compressFn = encoding === 'br' ? zlib.brotliCompress : zlib.gzip;
      compressFn(payload, (err: Error | null, out: Buffer) => {
        if (err || out.length >= payload.length) {
          originalJson(body);
          return;
        }
        if (!res.getHeader('Content-Type')) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
        }
        res.setHeader('Content-Encoding', encoding);
        res.setHeader('Vary', 'Accept-Encoding');
        res.setHeader('Content-Length', out.length);
        res.end(out);
      });
      return res;
    }) as typeof res.json;

    next();
  };
}