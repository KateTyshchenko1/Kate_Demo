import { createHash, timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';

const PASSCODE_HASH = 'fcc5a23cba37832352d6c3d08162917f4abd170109faa25abc0479227e8ecb54';
const headers = { 'content-type': 'application/json', 'cache-control': 'no-store' };
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });

function authorized(request) {
    const supplied = request.headers.get('x-vision-passcode') || '';
    const actual = createHash('sha256').update(supplied).digest();
    const expected = Buffer.from(PASSCODE_HASH, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function cleanItems(items) {
    if (!Array.isArray(items) || items.length > 100) throw new Error('Invalid board.');
    return items.map((item) => ({
        id: String(item.id).slice(0, 80),
        type: item.type === 'image' ? 'image' : item.type === 'emoji' ? 'emoji' : 'text',
        ...(item.type === 'image' ? { imageId: String(item.imageId).slice(0, 100), prompt: String(item.prompt || '').slice(0, 1000), alt: String(item.alt || '').slice(0, 180) } : { text: String(item.text || '').slice(0, 180) }),
        x: Number(item.x) || 0,
        y: Number(item.y) || 0,
        w: Math.min(Math.max(Number(item.w) || 200, 80), 700),
        h: Math.min(Math.max(Number(item.h) || 120, 60), 700),
        z: Number(item.z) || 1
    }));
}

export default async (request) => {
    const store = getStore('unramble-vision-board');
    if (request.method === 'GET') {
        const state = await store.get('state', { type: 'json', consistency: 'strong' });
        return reply(state || { items: [] });
    }
    if (!authorized(request)) return reply({ error: 'That passcode is not correct.' }, 401);
    if (request.method === 'POST') return reply({ unlocked: true });
    if (request.method !== 'PUT') return reply({ error: 'Method not allowed.' }, 405);
    try {
        const body = await request.json();
        const state = { items: cleanItems(body.items), updatedAt: new Date().toISOString() };
        await store.setJSON('state', state);
        return reply({ saved: true });
    } catch (error) {
        return reply({ error: error.message || 'Could not save board.' }, 400);
    }
};
