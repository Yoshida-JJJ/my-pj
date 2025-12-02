'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function OrderSuccessPage() {
    const params = useParams();
    const id = params.id as string;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                        <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Purchase Successful!</h2>
                    <p className="text-gray-600 mb-6">
                        Thank you for your order. Your transaction has been completed.
                    </p>

                    <div className="bg-gray-50 rounded-md p-4 mb-6">
                        <p className="text-sm text-gray-500">Order ID</p>
                        <p className="font-mono text-sm text-gray-900 break-all">{id}</p>
                    </div>

                    <div className="mt-6">
                        <Link href="/" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            Back to Market
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
