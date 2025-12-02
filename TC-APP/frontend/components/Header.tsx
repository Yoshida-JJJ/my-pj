'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

export default function Header() {
    const { data: session } = useSession();

    return (
        <nav className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <Link href="/" className="text-xl font-bold text-blue-600">
                                TC-APP
                            </Link>
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            <Link
                                href="/"
                                className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                            >
                                Market
                            </Link>
                            <Link
                                href="/sell"
                                className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                            >
                                Sell
                            </Link>
                        </div>
                    </div>
                    <div className="flex items-center">
                        {session ? (
                            <div className="flex items-center space-x-4">
                                <span className="text-sm text-gray-700">
                                    {session.user?.email}
                                </span>
                                <Link href="/mypage" className="text-sm font-medium text-gray-700 hover:text-gray-900">
                                    My Page
                                </Link>
                                <button
                                    onClick={() => signOut()}
                                    className="text-sm font-medium text-gray-700 hover:text-gray-900"
                                >
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <Link
                                href="/login"
                                className="text-sm font-medium text-blue-600 hover:text-blue-500"
                            >
                                Login
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
