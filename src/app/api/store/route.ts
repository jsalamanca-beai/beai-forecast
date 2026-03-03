import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const STORE_KEY = 'beai-forecast-store';

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN');
  }
  return new Redis({ url, token });
}

export async function GET() {
  try {
    const redis = getRedis();
    const data = await redis.get(STORE_KEY);
    if (!data) {
      return NextResponse.json(null);
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error('Redis GET error:', e);
    return NextResponse.json({ error: 'Failed to load store' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const redis = getRedis();
    const body = await request.json();
    // Increment version on every save
    const version = (body.version ?? 0) + 1;
    const store = { ...body, version };
    await redis.set(STORE_KEY, store);
    return NextResponse.json({ ok: true, version });
  } catch (e) {
    console.error('Redis PUT error:', e);
    return NextResponse.json({ error: 'Failed to save store' }, { status: 500 });
  }
}
