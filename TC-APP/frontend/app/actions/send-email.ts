'use server';

import { resend } from '../../lib/resend';
import WelcomeEmail from '../../components/emails/WelcomeEmail';
import { ReactElement } from 'react';

/**
 * Sends a welcome email to the specified user.
 * @param email - Recipient email address
 * @param name - User's name (optional)
 */
export async function sendWelcomeEmail(email: string, name: string = 'Member') {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

        const { data, error } = await resend.emails.send({
            from: 'Stadium Card <onboarding@resend.dev>', // Update this to your verified domain in production
            to: [email],
            subject: 'Welcome to Stadium Card',
            react: WelcomeEmail({ userFirstname: name, baseUrl }) as ReactElement,
        });

        if (error) {
            console.error('Email sending failed:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (e) {
        console.error('Unexpected error sending email:', e);
        return { success: false, error: 'Internal Server Error' };
    }
}
