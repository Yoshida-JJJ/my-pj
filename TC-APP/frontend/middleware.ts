import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from './utils/supabase/middleware'

export async function middleware(request: NextRequest) {
    // Staging Basic Auth Protection - DISABLED TEMPORARILY FOR DEBUGGING
    /*
    if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging') {
        const basicAuth = request.headers.get('authorization')

        // DISTINCT LOG TO CONFIRM NEW VERSION
        console.log('!!! CHECKING HEADERS (VERSION 3) !!!')
        console.log('All Headers:', JSON.stringify(Object.fromEntries(request.headers.entries())))
        console.log('Auth Header Direct Get:', basicAuth)

        if (basicAuth) {
            const authValue = basicAuth.split(' ')[1]
            const [user, pwd] = atob(authValue).split(':')

            const validUser = process.env.STAGING_USER || 'admin'
            const validPass = process.env.STAGING_PASSWORD || 'password'

            console.log('Decoded User:', user)
            console.log('Expected User:', validUser)
            // Do not log full password for security, just length match or equality
            console.log('Password Match:', pwd === validPass)

            if (user === validUser && pwd === validPass) {
                return await updateSession(request)
            }
        }

        console.log('Basic Auth Failed or Missing Header')
        return new NextResponse('Authentication required', {
            status: 401,
            headers: {
                'WWW-Authenticate': 'Basic realm="Secure Area"',
            },
        })
    }
    */

    return await updateSession(request)
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
