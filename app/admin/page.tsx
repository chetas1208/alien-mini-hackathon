"use client";

import { useCallback, useEffect, useState } from "react";

type CardInfo = {
    id: string;
    playerName: string;
    team: string;
    rarity: string;
    startingPrice: number;
    currentPrice: number;
    status: string;
    winningBid: number | null;
    wonByAgentId: string | null;
    wonByAgentName: string | null;
    wonByIsBot: boolean;
    wonByAlienId: string | null;
    auctionEndTime: string | null;
};

type AgentInfo = {
    id: string;
    name: string;
    status: string;
    isBot: boolean;
    strategyType: string;
    budgetTotal: number;
    budgetRemaining: number;
};

const RARITY_COLORS: Record<string, string> = {
    common: "bg-zinc-200 text-zinc-600",
    rare: "bg-blue-100 text-blue-700",
    epic: "bg-purple-100 text-purple-700",
    legendary: "bg-amber-100 text-amber-700",
};

export default function AdminPage() {
    const [cards, setCards] = useState<CardInfo[]>([]);
    const [agents, setAgents] = useState<AgentInfo[]>([]);
    const [log, setLog] = useState<string[]>([]);
    const [loading, setLoading] = useState("");
    const [tickInterval, setTickInterval] = useState<ReturnType<typeof setInterval> | null>(null);

    const addLog = useCallback((msg: string) => {
        setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
    }, []);

    const refresh = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/auction");
            if (!res.ok) return;
            const data = await res.json();
            setCards(data.cards);
            setAgents(data.agents);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        refresh();
        const id = setInterval(refresh, 2000);
        return () => clearInterval(id);
    }, [refresh]);

    const doAction = async (action: string, extra?: Record<string, string>) => {
        setLoading(action);
        try {
            const res = await fetch("/api/admin/auction", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, ...extra }),
            });
            const data = await res.json();
            if (res.ok) {
                addLog(`OK ${action}: ${JSON.stringify(data)}`);
            } else {
                addLog(`ERR ${action}: ${data.error}`);
            }
            refresh();
        } catch (err) {
            addLog(`ERR ${action}: ${err}`);
        }
        setLoading("");
    };

    const doTick = async () => {
        try {
            const res = await fetch("/api/auction/tick", { method: "POST" });
            const data = await res.json();
            addLog(`tick -> ${data.action}: ${JSON.stringify(data.details)}`);
            refresh();
        } catch (err) {
            addLog(`ERR tick: ${err}`);
        }
    };

    const toggleAutoTick = () => {
        if (tickInterval) {
            clearInterval(tickInterval);
            setTickInterval(null);
            addLog("Auto-tick stopped");
        } else {
            const id = setInterval(doTick, 3000);
            setTickInterval(id);
            addLog("Auto-tick started (every 3s)");
        }
    };

    const doCleanup = async () => {
        setLoading("cleanup");
        try {
            const res = await fetch("/api/cleanup", { method: "POST" });
            const data = await res.json();
            addLog(`Cleanup: ${data.message}`);
            refresh();
        } catch (err) {
            addLog(`ERR Cleanup: ${err}`);
        }
        setLoading("");
    };

    const liveCard = cards.find((c) => c.status === "live");
    const upcomingCard = cards.find((c) => c.status === "upcoming");
    const scheduledCards = cards.filter((c) => c.status === "scheduled");
    const completedCards = cards.filter((c) => c.status === "completed");
    const activeAgents = agents.filter((a) => a.status === "active");

    return (
        <div className="min-h-screen bg-zinc-50 p-6">
            <div className="mx-auto max-w-4xl space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900">Admin - Auction Control</h1>
                    <p className="text-sm text-zinc-500">Step 1: Seed cards + bots. Step 2: Queue a card. Step 3: Go live. Step 4: Auto-tick for bidding.</p>
                </div>

                {/* Setup buttons */}
                <div className="flex flex-wrap gap-2">
                    <button onClick={doCleanup} disabled={!!loading} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                        {loading === "cleanup" ? "..." : "Cleanup All"}
                    </button>
                    <button onClick={() => doAction("seed")} disabled={!!loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                        {loading === "seed" ? "..." : "Seed Cards"}
                    </button>
                    <button onClick={() => doAction("seed-bots")} disabled={!!loading} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50">
                        {loading === "seed-bots" ? "..." : "Seed Bots"}
                    </button>
                </div>

                {/* Auction control */}
                <div className="flex flex-wrap gap-2 rounded-xl border-2 border-dashed border-zinc-300 bg-white p-4">
                    <div className="w-full mb-2">
                        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Auction Control</p>
                    </div>
                    {!upcomingCard && !liveCard && (
                        <p className="text-sm text-zinc-400 w-full">No auction queued. Pick a card below to queue it.</p>
                    )}
                    {upcomingCard && !liveCard && (
                        <div className="w-full flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-zinc-900">
                                    Upcoming: {upcomingCard.playerName} ({upcomingCard.team}) - ${upcomingCard.startingPrice}
                                </p>
                                <p className="text-xs text-zinc-400">{activeAgents.length} active agents ready to bid</p>
                            </div>
                            <button
                                onClick={() => doAction("go-live")}
                                disabled={!!loading}
                                className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50 animate-pulse"
                            >
                                GO LIVE (30s)
                            </button>
                        </div>
                    )}
                    {liveCard && (
                        <div className="w-full">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="relative flex h-3 w-3">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                                    <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                                </span>
                                <span className="text-sm font-bold text-red-700">LIVE: {liveCard.playerName}</span>
                                <span className="text-sm text-zinc-400">({liveCard.team})</span>
                            </div>
                            <p className="text-sm text-zinc-600">Current bid: <span className="font-bold text-zinc-900">${liveCard.currentPrice}</span> (started at ${liveCard.startingPrice})</p>
                            {liveCard.auctionEndTime && <LiveCountdown endTime={liveCard.auctionEndTime} />}
                            <div className="mt-2 flex gap-2">
                                <button onClick={doTick} className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-900">
                                    Tick Once
                                </button>
                                <button onClick={toggleAutoTick} className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white ${tickInterval ? "bg-orange-600 hover:bg-orange-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
                                    {tickInterval ? "Stop Auto-Tick" : "Start Auto-Tick"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Agents */}
                <div>
                    <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-2">Agents ({agents.length})</h2>
                    <div className="grid grid-cols-2 gap-2">
                        {agents.map((a) => (
                            <div key={a.id} className="rounded-lg border bg-white p-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-semibold">{a.name}</p>
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${a.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
                                        {a.status}
                                    </span>
                                </div>
                                <p className="text-xs text-zinc-400 mt-1">
                                    {a.isBot ? "Bot" : "User"} - {a.strategyType} - ${a.budgetRemaining}/{a.budgetTotal}
                                </p>
                            </div>
                        ))}
                        {agents.length === 0 && <p className="text-xs text-zinc-400 col-span-2">No agents yet</p>}
                    </div>
                </div>

                {/* Card pool - pick one to queue */}
                <div>
                    <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-2">Card Pool ({scheduledCards.length} available)</h2>
                    <div className="flex flex-col gap-1.5">
                        {scheduledCards.map((card) => (
                            <div key={card.id} className="flex items-center justify-between rounded-lg border bg-white p-3">
                                <div className="flex items-center gap-2">
                                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${RARITY_COLORS[card.rarity]}`}>{card.rarity}</span>
                                    <div>
                                        <p className="text-sm font-semibold">{card.playerName}</p>
                                        <p className="text-[10px] text-zinc-400">{card.team} - ${card.startingPrice}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => doAction("queue", { cardId: card.id })}
                                    disabled={!!loading || !!upcomingCard || !!liveCard}
                                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
                                >
                                    Queue Up
                                </button>
                            </div>
                        ))}
                        {scheduledCards.length === 0 && <p className="text-xs text-zinc-400">No cards available</p>}
                    </div>
                </div>

                {/* Completed */}
                {completedCards.length > 0 && (
                    <div>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-2">Completed ({completedCards.length})</h2>
                        <div className="flex flex-col gap-1.5">
                            {completedCards.map((card) => (
                                <div key={card.id} className="flex items-center justify-between rounded-lg border bg-white p-3">
                                    <div>
                                        <p className="text-sm font-medium">{card.playerName} <span className="text-zinc-400">({card.team})</span></p>
                                        {card.wonByAgentName ? (
                                            <p className="text-xs text-zinc-500 mt-0.5">
                                                Won by <span className="font-semibold text-zinc-700">{card.wonByAgentName}</span>
                                                <span className={`ml-1.5 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${card.wonByIsBot ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"}`}>
                                                    {card.wonByIsBot ? "Bot" : "User"}
                                                </span>
                                            </p>
                                        ) : (
                                            <p className="text-xs text-zinc-400 mt-0.5">No bids</p>
                                        )}
                                    </div>
                                    <p className={`text-sm font-bold ${card.winningBid ? "text-emerald-600" : "text-zinc-300"}`}>
                                        {card.winningBid ? `$${card.winningBid}` : "\u2014"}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Log */}
                <div>
                    <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-2">Event Log</h2>
                    <div className="max-h-60 overflow-y-auto rounded-lg border bg-zinc-900 p-3 font-mono text-xs text-zinc-300">
                        {log.length === 0 && <p className="text-zinc-500">No events yet...</p>}
                        {log.map((entry, i) => (
                            <p key={i} className="py-0.5">{entry}</p>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function LiveCountdown({ endTime }: { endTime: string }) {
    const [secs, setSecs] = useState(0);
    useEffect(() => {
        const update = () => {
            const diff = new Date(endTime).getTime() - Date.now();
            setSecs(Math.max(0, Math.ceil(diff / 1000)));
        };
        update();
        const id = setInterval(update, 200);
        return () => clearInterval(id);
    }, [endTime]);
    return (
        <p className={`mt-1 text-sm font-bold tabular-nums ${secs <= 10 ? "text-red-600" : "text-zinc-600"}`}>
            {secs > 0 ? `${secs}s remaining` : "Settling..."}
        </p>
    );
}
