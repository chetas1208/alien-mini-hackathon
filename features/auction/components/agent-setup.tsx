"use client";

import { useAlien } from "@alien_org/react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AGENT_BUDGET_TIERS } from "../constants";
import { useCreateAgentWithPayment } from "../hooks/use-agents";
import { useCards } from "../hooks/use-cards";

const STRATEGIES = [
  { value: "aggressive", label: "🔥 Aggressive", desc: "Bids fast and high — outpaces competitors" },
  { value: "balanced", label: "⚖️ Balanced", desc: "Finds good value without overpaying" },
  { value: "sniper", label: "🎯 Sniper", desc: "Waits for the right moment, bids precisely" },
  { value: "collector", label: "💎 Collector", desc: "Hunts rare and legendary cards at any cost" },
] as const;

interface AgentSetupProps {
  onCreated?: () => void;
  /** Pre-select this team (from tapping an auction card) */
  preselectedTeam?: string;
}

export function AgentSetup({ onCreated, preselectedTeam }: AgentSetupProps) {
  const { isBridgeAvailable } = useAlien();
  const { data: cards } = useCards();

  const availableTeams = Array.from(new Set(cards?.map((c) => c.team) ?? [])).sort();

  const [selectedTeams, setSelectedTeams] = useState<string[]>(
    preselectedTeam ? [preselectedTeam] : [],
  );
  const [strategy, setStrategy] = useState<string>("balanced");
  const [tierId, setTierId] = useState(AGENT_BUDGET_TIERS[0].id);
  // Skip straight to payment if team is pre-selected
  const [step, setStep] = useState<"preferences" | "payment">(
    preselectedTeam ? "payment" : "preferences",
  );

  // Sync if preselectedTeam changes (modal re-opens with different card)
  useEffect(() => {
    if (preselectedTeam) {
      setSelectedTeams([preselectedTeam]);
      setStep("payment");
    }
  }, [preselectedTeam]);

  const handlePaid = useCallback(() => {
    toast.success("Payment confirmed — your agent is going live!");
    onCreated?.();
  }, [onCreated]);

  const handleCancelled = useCallback(() => {
    toast("Payment cancelled", { icon: "✕" });
  }, []);

  const handleFailed = useCallback(() => {
    toast.error("Payment failed — please try again");
  }, []);

  const { createAndPay, isLoading } = useCreateAgentWithPayment({
    onPaid: handlePaid,
    onCancelled: handleCancelled,
    onFailed: handleFailed,
  });

  const selectedTier = AGENT_BUDGET_TIERS.find((t) => t.id === tierId)!;

  const toggleTeam = (team: string) => {
    setSelectedTeams((prev) =>
      prev.includes(team) ? prev.filter((t) => t !== team) : [...prev, team],
    );
  };

  const handleContinue = () => {
    if (selectedTeams.length === 0) {
      toast.error("Pick at least one team");
      return;
    }
    setStep("payment");
  };

  const handleActivate = async () => {
    try {
      await createAndPay({
        preferredTeams: selectedTeams,
        preferredPlayers: [],
        rarityPreference: "rare",
        budgetTierId: tierId,
        strategyType: strategy as "aggressive" | "balanced" | "sniper" | "collector",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  if (step === "preferences") {
    return (
      <div className="flex flex-col gap-5">
        {/* Teams */}
        <div>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Pick your teams
          </h2>
          {availableTeams.length === 0 ? (
            <p className="text-xs text-zinc-400">Loading teams...</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableTeams.map((team) => (
                <button
                  key={team}
                  onClick={() => toggleTeam(team)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    selectedTeams.includes(team)
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  {team}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Strategy */}
        <div>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Bidding strategy
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {STRATEGIES.map((s) => (
              <button
                key={s.value}
                onClick={() => setStrategy(s.value)}
                className={`rounded-xl border p-3 text-left transition-all ${
                  strategy === s.value
                    ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800"
                    : "border-zinc-200/60 bg-white dark:border-zinc-800/60 dark:bg-zinc-900"
                }`}
              >
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {s.label}
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-400">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleContinue}
          disabled={selectedTeams.length === 0}
          className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Continue to Budget
        </button>
      </div>
    );
  }

  // Payment step
  return (
    <div className="flex flex-col gap-5">
      <button
        onClick={() => setStep("preferences")}
        className="self-start text-xs font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
      >
        ← {preselectedTeam ? "Edit teams" : "Back"}
      </button>

      {/* Show pre-selected team context */}
      {preselectedTeam && (
        <div className="rounded-xl border border-zinc-200/60 bg-zinc-50 p-3 dark:border-zinc-800/60 dark:bg-zinc-800/50">
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Bidding for: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{selectedTeams.join(", ")}</span>
          </p>
        </div>
      )}

      {/* Strategy */}
      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          Bidding strategy
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {STRATEGIES.map((s) => (
            <button
              key={s.value}
              onClick={() => setStrategy(s.value)}
              className={`rounded-xl border p-3 text-left transition-all ${
                strategy === s.value
                  ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800"
                  : "border-zinc-200/60 bg-white dark:border-zinc-800/60 dark:bg-zinc-900"
              }`}
            >
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {s.label}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-400">{s.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Budget tiers */}
      <div>
        <h2 className="mb-1 text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          Fund your agent
        </h2>
        <p className="mb-3 text-[11px] text-zinc-400">
          Your agent needs a bidding budget. Pay with USDC on Solana.
        </p>

        <div className="flex flex-col gap-2">
          {AGENT_BUDGET_TIERS.map((tier) => (
            <button
              key={tier.id}
              onClick={() => setTierId(tier.id)}
              className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                tierId === tier.id
                  ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800"
                  : "border-zinc-200/60 bg-white dark:border-zinc-800/60 dark:bg-zinc-900"
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {tier.name}
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-400">{tier.description}</p>
                <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  ${tier.credits} bidding budget
                </p>
              </div>
              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {tier.priceLabel}
              </span>
            </button>
          ))}
        </div>
      </div>

      {!isBridgeAvailable && (
        <div className="rounded-xl border border-amber-200/60 bg-amber-50 p-3 dark:border-amber-800/40 dark:bg-amber-950/20">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Open this app inside Alien to make payments.
          </p>
        </div>
      )}

      <button
        onClick={handleActivate}
        disabled={isLoading || !isBridgeAvailable}
        className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {isLoading ? "Processing..." : `Pay ${selectedTier.priceLabel} & Activate Agent`}
      </button>
    </div>
  );
}
