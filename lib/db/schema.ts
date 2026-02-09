import { jsonb, pgTable, real, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  alienId: text("alien_id").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;

export const paymentIntents = pgTable("payment_intents", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoice: text("invoice").notNull().unique(),
  senderAlienId: text("sender_alien_id").notNull(),
  recipientAddress: text("recipient_address").notNull(),
  amount: text("amount").notNull(),
  token: text("token").notNull(),
  network: text("network").notNull(),
  productId: text("product_id"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PaymentIntent = typeof paymentIntents.$inferSelect;

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderAlienId: text("sender_alien_id"),
  recipientAddress: text("recipient_address").notNull(),
  txHash: text("tx_hash"),
  status: text("status").notNull(),
  amount: text("amount"),
  token: text("token"),
  network: text("network"),
  invoice: text("invoice"),
  test: text("test"),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Transaction = typeof transactions.$inferSelect;

// ── SuperBid: AI Agent Marketplace ──

export const cards = pgTable("cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  playerName: text("player_name").notNull(),
  team: text("team").notNull(),
  rarity: text("rarity").notNull(), // common, rare, epic, legendary
  imageUrl: text("image_url"),
  startingPrice: real("starting_price").notNull(),
  currentPrice: real("current_price").notNull(),
  scheduledStartTime: timestamp("scheduled_start_time", { withTimezone: true }).notNull(),
  auctionEndTime: timestamp("auction_end_time", { withTimezone: true }), // set when auction goes live (start + 30s)
  status: text("status").notNull().default("scheduled"), // scheduled, live, settling, completed, expired
  winningBid: real("winning_bid"),
  wonByAgentId: uuid("won_by_agent_id"),
  wonByAlienId: text("won_by_alien_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Card = typeof cards.$inferSelect;

export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  alienId: text("alien_id").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull().default("pending_payment"), // pending_payment, active, paused, expired, finished
  budgetTotal: real("budget_total").notNull(),
  budgetRemaining: real("budget_remaining").notNull(),
  strategyType: text("strategy_type").notNull(), // aggressive, balanced, sniper, collector
  preferencesJson: jsonb("preferences_json").notNull(), // { teams: [], players: [], rarityPreference: "" }
  currentTargetCardId: uuid("current_target_card_id"),
  paymentInvoice: text("payment_invoice"), // links to payment_intents.invoice
  isBot: text("is_bot"), // "true" for mock/bot agents
  expiresAt: timestamp("expires_at", { withTimezone: true }), // agent auto-deactivates after this
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Agent = typeof agents.$inferSelect;

export const bids = pgTable("bids", {
  id: uuid("id").primaryKey().defaultRandom(),
  cardId: uuid("card_id").notNull(),
  agentId: uuid("agent_id").notNull(),
  bidAmount: real("bid_amount").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Bid = typeof bids.$inferSelect;

export const agentActivity = pgTable("agent_activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").notNull(),
  eventType: text("event_type").notNull(), // scan, evaluate, bid, strategy_change, target_change
  message: text("message").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AgentActivity = typeof agentActivity.$inferSelect;
