import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from './utils/supabase/middleware'

export async function middleware(request: NextRequest) {
    // 1. Basic Auth Logic
    const basicAuthUser = process.env.BASIC_AUTH_USER;
    const basicAuthPassword = process.env.BASIC_AUTH_PASSWORD;

    // Exclude Webhooks and Debug from Admin Check
    if (request.nextUrl.pathname.startsWith('/api/webhooks') ||
        request.nextUrl.pathname.startsWith('/debug-admin') ||
        request.nextUrl.pathname.startsWith('/api/debug-auth')) {
        return await updateSession(request);
    }

    if (basicAuthUser && basicAuthPassword) {
        const authHeader = request.headers.get('authorization');

        if (authHeader) {
            try {
                const authValue = authHeader.split(' ')[1];
                const decoded = atob(authValue);
                const firstColonIndex = decoded.indexOf(':');

                if (firstColonIndex !== -1) {
                    const user = decoded.substring(0, firstColonIndex);
                    const pwd = decoded.substring(firstColonIndex + 1);

                    // Case-insensitive user check for iOS auto-capitalization
                    if (user.toLowerCase() === basicAuthUser.toLowerCase() && pwd === basicAuthPassword) {
                        return await updateSession(request);
                    }
                }
            } catch (e) {
                console.error('Basic Auth decode error:', e);
            }
        }

        const userAgent = request.headers.get('user-agent') || '';
        const isFBorMessenger = userAgent.includes('FBAN') || userAgent.includes('FBAV');

        const responseHeaders: Record<string, string> = {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        };

        // Do not send WWW-Authenticate for FB/Messenger to force custom HTML display
        if (!isFBorMessenger) {
            responseHeaders['WWW-Authenticate'] = 'Basic realm="Restricted"';
        }

        return new Response(`
            <!DOCTYPE html>
            <html lang="ja">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Authentication Required [v2]</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                        background-color: #f4f7f9;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                        color: #333;
                    }
                    .container {
                        background: white;
                        padding: 2rem;
                        border-radius: 12px;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                        max-width: 400px;
                        text-align: center;
                    }
                    h1 { font-size: 1.5rem; margin-bottom: 1rem; color: #000; }
                    p { line-height: 1.6; color: #666; font-size: 0.95rem; }
                    .warning {
                        background: #fff8e1;
                        border-left: 4px solid #ffb300;
                        padding: 10px;
                        margin: 20px 0;
                        text-align: left;
                        font-size: 0.85rem;
                    }
                    .btn {
                        display: inline-block;
                        margin-top: 20px;
                        padding: 12px 24px;
                        background: #0070f3;
                        color: white;
                        text-decoration: none;
                        border-radius: 6px;
                        font-weight: 600;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Authentication Required [v2]</h1>
                    <p>このページにアクセスするには認証が必要です。</p>
                    <div class="warning">
                        <strong>Messenger等をお使いの方へ:</strong><br>
                        アプリ内のブラウザでは認証画面が表示されない制約があります。右上のメニュー等から<strong>「ブラウザで開く」</strong>（SafariやChrome）を選択してください。
                    </div>
                    <p>通常はブラウザ側でログイン画面が表示されます。</p>
                </div>
            </body>
            </html>
        `, {
            status: 401,
            headers: responseHeaders,
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
