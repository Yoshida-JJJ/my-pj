import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key',
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    // Admin Access Control
    if (request.nextUrl.pathname.startsWith('/admin')) {
        // Exclude diagnostic routes
        if (request.nextUrl.pathname.includes('debug')) {
            return response;
        }

        const adminEmailsRaw = process.env.NEXT_PUBLIC_ADMIN_EMAILS || process.env.ADMIN_EMAILS || '';
        const adminEmails = adminEmailsRaw
            .split(/[,;|]+/)
            .map(e => e.trim().toLowerCase())
            .filter(Boolean);

        const userEmail = user?.email?.toLowerCase();

        if (!user || !userEmail || !adminEmails.includes(userEmail)) {
            // Internal redirect to a specific error page if needed, but for now just console/home
            const reason = !user
                ? 'no_user'
                : !userEmail
                    ? 'no_email'
                    : `not_in_list`;

            // Create debug URL
            const debugUrl = new URL('/', request.url);
            debugUrl.searchParams.set('debug_error', 'admin_access_denied');
            debugUrl.searchParams.set('debug_reason', reason);
            debugUrl.searchParams.set('debug_email', userEmail || 'none');
            debugUrl.searchParams.set('debug_env_len', String(adminEmails.length));

            console.log(`[AUTH] Access Denied: User "${userEmail || 'none'}" not in admin list: [${adminEmails.join('|')}]`);
            return NextResponse.redirect(debugUrl)
        }
    }

    return response
}
