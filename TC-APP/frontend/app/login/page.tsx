'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';
import Link from 'next/link';
import Footer from '../../components/Footer';

import { Suspense } from 'react';

function LoginForm() {
    const [email, setEmail] = useState('demo@example.com');
    const [password, setPassword] = useState('password');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (searchParams.get('registered') === 'true') {
            // Optional: Show a success message if redirected from registration
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const supabase = createClient();
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setError(error.message);
            } else {
                window.location.href = '/';
            }
        } catch (err) {
            setError('予期せぬエラーが発生しました');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-panel-premium p-8 rounded-2xl shadow-2xl border border-white/10">
            <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
                        {error}
                    </div>
                )}

                {searchParams.get('registered') === 'true' && !error && (
                    <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl text-sm">
                        アカウント作成が完了しました。ログインしてください。
                    </div>
                )}

                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-brand-platinum mb-2">
                        メールアドレス (Email)
                    </label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full px-4 py-3 rounded-xl bg-brand-dark-light/50 border border-brand-platinum/10 text-white placeholder-brand-platinum/30 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
                        placeholder="name@example.com"
                    />
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-brand-platinum mb-2">
                        パスワード (Password)
                    </label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full px-4 py-3 rounded-xl bg-brand-dark-light/50 border border-brand-platinum/10 text-white placeholder-brand-platinum/30 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
                        placeholder="••••••••"
                    />
                </div>

                <div>
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-brand-blue hover:bg-brand-blue-glow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue transition-all transform hover:scale-[1.02] ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {loading ? 'ログイン処理中...' : 'ログイン'}
                    </button>
                </div>
            </form>

            <div className="mt-6 text-center">
                <p className="text-sm text-brand-platinum/60">
                    アカウントをお持ちでない場合は{' '}
                    <Link href="/register" className="font-medium text-brand-blue hover:text-brand-blue-glow transition-colors">
                        新規登録
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex flex-col">
            <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8">
                    <div className="text-center">
                        <Link href="/" className="inline-block mb-6 group">
                            <span className="font-heading text-4xl font-bold tracking-tighter text-white group-hover:text-glow transition-all">
                                TC<span className="text-brand-gold text-gold-glow">.APP</span>
                            </span>
                        </Link>
                        <h2 className="text-3xl font-heading font-bold text-white">
                            おかえりなさい
                        </h2>
                        <p className="mt-2 text-brand-platinum/60">
                            コレクションにアクセスするにはログインしてください。
                        </p>
                    </div>

                    <Suspense fallback={<div className="text-center text-white">読み込み中...</div>}>
                        <LoginForm />
                    </Suspense>
                </div>
            </div>
            <Footer />
        </div>
    );
}
