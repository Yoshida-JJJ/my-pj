import { createClient } from '@/utils/supabase/server';

export default async function DebugAdminPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminEmailsRaw = process.env.NEXT_PUBLIC_ADMIN_EMAILS || process.env.ADMIN_EMAILS || 'NOT SET';
    // const publicAdminEmailsRaw = process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'NOT SET'; // Removed redundancy
    const adminEmailsList = adminEmailsRaw.split(/[,;|]+/).map(e => e.trim().toLowerCase());

    const currentUserEmail = user?.email?.toLowerCase() || 'NOT LOGGED IN';
    const isMatched = user?.email ? adminEmailsList.includes(currentUserEmail) : false;

    return (
        <div style={{ padding: '40px', fontFamily: 'monospace', backgroundColor: '#111', color: '#eee', minHeight: '100vh' }}>
            <h1 style={{ color: '#FFD700' }}>Admin Authorization Debug</h1>
            <div style={{ backgroundColor: '#222', padding: '20px', borderRadius: '8px', border: '1px solid #444' }}>
                <p><strong>Logged in as:</strong> {user?.email || 'None'}</p>
                <p><strong>Environment ADMIN_EMAILS:</strong> {adminEmailsRaw}</p>
                <p><strong>Parsed Admin List:</strong> {JSON.stringify(adminEmailsList)}</p>
                <hr style={{ border: '0', borderTop: '1px solid #444', margin: '20px 0' }} />
                <p style={{ fontSize: '1.5rem' }}>
                    <strong>Result:</strong> {isMatched ? <span style={{ color: '#4ade80' }}>MATCHED (ACCESS GRANTED)</span> : <span style={{ color: '#f87171' }}>MISMATCH (ACCESS DENIED)</span>}
                </p>
            </div>

            <div style={{ marginTop: '40px', fontSize: '0.8rem', color: '#888' }}>
                <p>Possible causes for mismatch:</p>
                <ul>
                    <li>The email in ADMIN_EMAILS has a typo or extra space.</li>
                    <li>Vercel environment variables are not yet applied (requires redeploy).</li>
                    <li>Lowercase/Uppercase mismatch (the debug above normalizes to lowercase).</li>
                </ul>
            </div>
        </div>
    );
}
