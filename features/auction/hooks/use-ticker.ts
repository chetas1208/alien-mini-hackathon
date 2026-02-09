"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

/**
 * Calls POST /api/auction/tick every `intervalMs` to drive the auction forward.
 * This is the client-side heartbeat that keeps auctions running during the demo.
 */
export function useAuctionTicker(intervalMs = 3000) {
    const queryClient = useQueryClient();
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const doTick = async () => {
            try {
                const res = await fetch("/api/auction/tick", { method: "POST" });
                if (res.ok) {
                    const data = await res.json();
                    // Invalidate relevant queries when something happens
                    if (data.action !== "idle" && data.action !== "waiting") {
                        queryClient.invalidateQueries({ queryKey: ["auction-schedule"] });
                        queryClient.invalidateQueries({ queryKey: ["cards"] });
                        queryClient.invalidateQueries({ queryKey: ["stream"] });
                        queryClient.invalidateQueries({ queryKey: ["agents"] });
                    }
                }
            } catch {
                // Silently ignore tick errors
            }
        };

        // Initial tick
        doTick();

        intervalRef.current = setInterval(doTick, intervalMs);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [intervalMs, queryClient]);
}
