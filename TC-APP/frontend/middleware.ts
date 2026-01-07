import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from './utils/supabase/middleware'

export async function middleware(request: NextRequest) {
    // 1. Basic Auth Logic
    const basicAuthUser = process.env.BASIC_AUTH_USER;
    const basicAuthPassword = process.env.BASIC_AUTH_PASSWORD;

    if (basicAuthUser && basicAuthPassword) {
        const authHeader = request.headers.get('authorization');

        if (authHeader) {
            const authValue = authHeader.split(' ')[1];
            const [user, pwd] = atob(authValue).split(':');

            if (user === basicAuthUser && pwd === basicAuthPassword) {
                return await updateSession(request);
            }
        }

        return new NextResponse('Authentication required', {
            status: 401,
            headers: {
                'WWW-Authenticate': 'Basic realm="Secure Area"',
            },
        });
    }

    // 2. Standard Supabase Middleware
    return await updateSession(request);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
