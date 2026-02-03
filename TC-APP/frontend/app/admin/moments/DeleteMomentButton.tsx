'use client';

import { deleteLiveMoment } from '@/app/actions/admin';
import { useFormStatus } from 'react-dom';

export default function DeleteMomentButton({ id }: { id: string }) {
    return (
        <form action={deleteLiveMoment.bind(null, id)}>
            <DeleteButtonInner />
        </form>
    );
}

function DeleteButtonInner() {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            disabled={pending}
            className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1 disabled:opacity-50"
            onClick={(e) => {
                if (!confirm('本当に削除しますか？')) e.preventDefault();
            }}
        >
            {pending ? '削除中...' : '🗑️ 削除'}
        </button>
    );
}
