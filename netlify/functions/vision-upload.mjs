import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';

const PASSCODE_HASH = 'fcc5a23cba37832352d6c3d08162917f4abd170109faa25abc0479227e8ecb54';
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const reply = (body, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } });

function authorized(request) {
    const actual = createHash('sha256').update(request.headers.get('x-vision-passcode') || '').digest();
    const expected = Buffer.from(PASSCODE_HASH, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export default async (request) => {
    if (request.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405);
    if (!authorized(request)) return reply({ error: 'That passcode is not correct.' }, 401);
    const contentType = (request.headers.get('content-type') || '').split(';')[0].toLowerCase();
    if (!ALLOWED_TYPES.has(contentType)) return reply({ error: 'Choose a JPEG, PNG, WebP, or GIF image.' }, 415);
    const bytes = await request.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > 8 * 1024 * 1024) return reply({ error: 'Photos must be smaller than 8 MB.' }, 413);
    const id = randomUUID();
    const store = getStore('unramble-vision-images');
    await store.set(id, bytes, { metadata: { contentType } });
    return reply({ id });
};
