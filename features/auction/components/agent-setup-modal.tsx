"use client";

import Image from "next/image";
import { useEffect } from "react";
import { AgentSetup } from "./agent-setup";

export interface AuctionCardContext {
    playerName: string;
    team: string;
    rarity: string;
    imageUrl: string | null;
    startingPrice: number;
}

interface AgentSetupModalProps {
    open: boolean;
    onClose: () => void;
    onCreated?: () => void;
    /** Pre-select this team (from tapping an auction card) */
    preselectedTeam?: string;
    /** Card context for showing the card image */
    card?: AuctionCardContext;
}

const RARITY_COLORS: Record<string, string> = {
    common: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
    rare: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    epic: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    legendary: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export function AgentSetupModal({ open, onClose, onCreated, preselectedTeam, card }: AgentSetupModalProps) {
    useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            <div
                role="dialog"
                aria-modal="true"
                aria-label="Deploy a new agent"
                className="relative z-10 w-full max-w-md animate-slide-up rounded-t-2xl bg-white p-6 shadow-xl dark:bg-zinc-900 sm:rounded-2xl sm:m-4"
            >
                {/* Card preview when launched from an auction */}
                {card && card.imageUrl && (
                    <div className="mb-4 flex items-center gap-3 rounded-xl border border-zinc-200/60 bg-zinc-50 p-3 dark:border-zinc-800/60 dark:bg-zinc-800/50">
                        <div className="relative h-20 w-14 flex-shrink-0 overflow-hidden rounded-lg">
                            <Image
                                src={card.imageUrl}
                                alt={card.playerName}
                                fill
                                className="object-cover"
                                sizes="56px"
                            />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                {card.playerName}
                            </p>
                            <p className="text-[11px] text-zinc-400">{card.team}</p>
                            <div className="mt-1 flex items-center gap-2">
                                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${RARITY_COLORS[card.rarity]}`}>
                                    {card.rarity}
                                </span>
                                <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                                    ${card.startingPrice}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mb-5 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            Deploy Agent
                        </h2>
                        <p className="mt-0.5 text-xs text-zinc-400">
                            {card
                                ? `Bid on ${card.playerName} and more`
                                : preselectedTeam
                                    ? `Bid on ${preselectedTeam} cards and more`
                                    : "Configure and fund your AI bidding agent"}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                <div className="max-h-[70vh] overflow-y-auto">
                    <AgentSetup onCreated={onCreated} preselectedTeam={preselectedTeam ?? card?.team} />
                </div>
            </div>
        </div>
    );
}
