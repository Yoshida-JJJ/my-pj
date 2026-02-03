import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Double check (Middleware should catch this, but safe to have)
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || process.env.ADMIN_EMAILS || '').split(/[,;|]+/).map(e => e.trim());
    if (!user || !user.email || !adminEmails.some(email => email.toLowerCase() === user.email?.toLowerCase())) {
        redirect('/');
    }

    return (
        <div className="min-h-screen bg-neutral-900 text-white flex flex-col md:flex-row">
            {/* Admin Sidebar */}
            <aside className="w-full md:w-64 bg-black border-b md:border-b-0 md:border-r border-white/10 flex-shrink-0">
                <div className="p-6 border-b border-white/10 flex justify-between items-center md:block">
                    <h1 className="text-xl font-bold tracking-wider text-[#FFD700]">ADMIN PANEL</h1>
                    <div className="md:hidden text-[10px] text-gray-500 text-right">
                        Logged in as:<br />
                        <span className="text-gray-300 truncate w-32 block">{user.email}</span>
                    </div>
                </div>
                <nav className="p-4 flex md:block space-x-2 md:space-x-0 md:space-y-2 overflow-x-auto md:overflow-x-visible">
                    <Link href="/admin" className="whitespace-nowrap px-4 py-2 md:py-3 rounded hover:bg-white/5 text-gray-300 hover:text-white transition-colors block">
                        Dashboard
                    </Link>
                    <Link href="/admin/moments" className="whitespace-nowrap px-4 py-2 md:py-3 rounded hover:bg-white/5 text-gray-300 hover:text-white transition-colors block">
                        Live Moments
                    </Link>
                    <Link href="/admin/payouts" className="whitespace-nowrap px-4 py-2 md:py-3 rounded hover:bg-white/5 text-gray-300 hover:text-white transition-colors block">
                        Payouts
                    </Link>
                </nav>
                <div className="hidden md:block absolute bottom-0 w-64 p-4 border-t border-white/10">
                    <div className="text-xs text-gray-500">
                        Logged in as:<br />
                        <span className="text-gray-300 truncate block">{user.email}</span>
                    </div>
                    <Link href="/" className="mt-4 block text-center py-2 px-4 border border-white/20 rounded text-sm hover:bg-white/10 transition-colors">
                        Back to Site
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    );
}
