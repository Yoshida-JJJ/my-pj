import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
    if (!process.env.RESEND_API_KEY) {
        return NextResponse.json({ error: 'RESEND_API_KEY is missing' }, { status: 500 });
    }

    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const { data, error } = await resend.emails.send({
            from: 'Stadium Card <onboarding@resend.dev>',
            to: [email],
            subject: 'Debug Email Test',
            html: '<p>This is a test email from Stadium Card Debug Endpoint.</p>'
        });

        if (error) {
            console.error('Debug Email Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data,
            message: `Email sent to ${email} (from onboarding@resend.dev). Note: In Test Mode, you can only send to your own authenticated email.`
        });

    } catch (err: any) {
        console.error('Debug Endpoint Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
