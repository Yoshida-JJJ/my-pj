import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const adminEmailsRaw = process.env.ADMIN_EMAILS || '';
        const publicAdminEmailsRaw = process.env.NEXT_PUBLIC_ADMIN_EMAILS || '';
        const adminEmails = adminEmailsRaw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

        const userEmail = user?.email?.toLowerCase() || '';
        const isAdmin = userEmail ? adminEmails.includes(userEmail) : false;

        return NextResponse.json({
            status: 'success',
            diagnostics: {
                currentUser: user?.email || 'Guest',
                isAdmin,
                adminCount: adminEmails.length,
                // We don't return the full list for security, but we return a hint
                adminListHint: adminEmails.map(e => e[0] + '***' + e.split('@')[1]).join(', '),
                envSet: {
                    ADMIN_EMAILS: !!process.env.ADMIN_EMAILS,
                    NEXT_PUBLIC_ADMIN_EMAILS: !!process.env.NEXT_PUBLIC_ADMIN_EMAILS,
                    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY
                }
            }
        });
    } catch (error: any) {
        return NextResponse.json({
            status: 'error',
            message: error.message
        }, { status: 500 });
    }
}
