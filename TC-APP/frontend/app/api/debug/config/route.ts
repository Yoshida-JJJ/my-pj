import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const backendUrl = process.env.BACKEND_URL;
    return NextResponse.json({
        backend_url_configured: !!backendUrl,
        backend_url_value: backendUrl || 'NOT_SET (Defaults to localhost)',
        node_env: process.env.NODE_ENV
    });
}
