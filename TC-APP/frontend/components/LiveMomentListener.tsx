"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import LiveMomentToast, { LiveMomentData } from "./LiveMomentToast";

export default function LiveMomentListener() {
    const [moment, setMoment] = useState<LiveMomentData | null>(null);

    // Initialize Supabase Client (Stable outside effect if possible, or memoized)
    // For simplicity and stability in App Router, we can initialize it once
    const [supabase] = useState(() => createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
    ));

    useEffect(() => {
        // Subscribe to INSERT events on 'live_moments' table
        const channel = supabase
            .channel("live-moments-channel")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "live_moments",
                },
                (payload) => {
                    const newMoment = payload.new as LiveMomentData;

                    // Trigger Toast
                    setMoment(newMoment);

                    // Auto-hide after 8 seconds (longer for reading)
                    setTimeout(() => {
                        setMoment(null);
                    }, 8000);
                }
            )
            .subscribe();

        // Cleanup subscription
        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase]);

    return (
        <LiveMomentToast
            data={moment}
            onDismiss={() => setMoment(null)}
        />
    );
}
