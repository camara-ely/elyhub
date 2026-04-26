// R2 presigned URLs.
//
// Uploads: we issue a presigned PUT URL so the client uploads the pack
// DIRECTLY to R2. Not through the Worker — Workers have a 100MB request
// body limit, and a sound pack can easily blow through that.
//
// Downloads: for entitled users we return a presigned GET URL with a
// short TTL (5 min). The plugin follows the URL, downloads from R2
// directly (again, not through the Worker — saves CPU time and
// bandwidth counts against R2's zero-egress pricing, not Workers').
//
// Signing uses the S3-compatible API via aws4fetch. R2 exposes an
// S3 endpoint at {account_id}.r2.cloudflarestorage.com.

import { AwsClient } from 'aws4fetch';
import type { Env } from './types';

const TTL_UPLOAD_SEC = 15 * 60;    // 15 min — uploads can be large, give some slack
const TTL_DOWNLOAD_SEC = 5 * 60;   // 5 min — short, client follows immediately
const TTL_COVER_SEC = 60 * 60;     // 1h — feed thumbnails, cached by the browser;
                                    // long-lived so we don't re-sign on every scroll

function client(env: Env): AwsClient {
  return new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: 's3',
    region: 'auto',
  });
}

function endpoint(env: Env): string {
  return `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET}`;
}

export async function signPutUrl(
  env: Env,
  key: string,
  contentType: string,
): Promise<string> {
  const url = new URL(`${endpoint(env)}/${encodeURI(key)}`);
  url.searchParams.set('X-Amz-Expires', String(TTL_UPLOAD_SEC));
  const signed = await client(env).sign(
    new Request(url, { method: 'PUT', headers: { 'Content-Type': contentType } }),
    { aws: { signQuery: true } },
  );
  return signed.url;
}

export async function signGetUrl(env: Env, key: string, ttlSec = TTL_DOWNLOAD_SEC): Promise<string> {
  const url = new URL(`${endpoint(env)}/${encodeURI(key)}`);
  url.searchParams.set('X-Amz-Expires', String(ttlSec));
  const signed = await client(env).sign(
    new Request(url, { method: 'GET' }),
    { aws: { signQuery: true } },
  );
  return signed.url;
}

// Convenience for marketplace covers — same signer, longer TTL. Split
// into its own export so callers self-document intent (and so the default
// download TTL stays aggressively short for entitled content).
export async function signCoverUrl(env: Env, key: string): Promise<string> {
  return signGetUrl(env, key, TTL_COVER_SEC);
}

// Build a stable, collision-free key for a new asset. Format:
//   listings/{listing_id}/{asset_id}/{safe_filename}
// The asset_id is already a UUID so the full path is unique even if
// two listings upload a file with the same name.
export function assetKey(listingId: string, assetId: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  return `listings/${listingId}/${assetId}/${safe}`;
}
