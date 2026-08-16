import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';

const PASSCODE_HASH = 'fcc5a23cba37832352d6c3d08162917f4abd170109faa25abc0479227e8ecb54';
const jsonHeaders = { 'content-type': 'application/json', 'cache-control': 'no-store' };
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: jsonHeaders });

function authorized(request) {
    const actual = createHash('sha256').update(request.headers.get('x-vision-passcode') || '').digest();
    const expected = Buffer.from(PASSCODE_HASH, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export default async (request) => {
    const store = getStore('unramble-vision-images');
    if (request.method === 'GET') {
        const id = new URL(request.url).searchParams.get('id') || '';
        if (!/^[a-f0-9-]{36}$/.test(id)) return new Response('Not found', { status: 404 });
        const entry = await store.getWithMetadata(id, { type: 'arrayBuffer', consistency: 'strong' });
        if (!entry) return new Response('Not found', { status: 404 });
        return new Response(entry.data, { headers: { 'content-type': entry.metadata?.contentType || 'image/png', 'cache-control': 'public, max-age=31536000, immutable' } });
    }
    if (request.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405);
    if (!authorized(request)) return reply({ error: 'That passcode is not correct.' }, 401);
    if (!process.env.OPENAI_API_KEY) return reply({ error: 'Image generation is not configured.' }, 503);
    try {
        const { prompt = '' } = await request.json();
        const cleanPrompt = String(prompt).trim().slice(0, 1000);
        if (!cleanPrompt) return reply({ error: 'Describe the image you want.' }, 400);
        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
            body: JSON.stringify({ model: 'gpt-image-2', prompt: cleanPrompt, size: '1024x1024', quality: 'medium', n: 1 })
        });
        const result = await response.json();
        if (!response.ok) return reply({ error: result.error?.message || 'OpenAI could not create that image.' }, response.status);
        const encoded = result.data?.[0]?.b64_json;
        if (!encoded) return reply({ error: 'No image was returned.' }, 502);
        const id = randomUUID();
        await store.set(id, Buffer.from(encoded, 'base64'), { metadata: { contentType: 'image/png' } });
        return reply({ id });
    } catch {
        return reply({ error: 'Image generation failed. Please try again.' }, 500);
    }
};
