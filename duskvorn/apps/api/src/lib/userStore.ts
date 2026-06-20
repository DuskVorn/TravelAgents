import { PlanTier } from "@duskvorn/core";

export interface UserRecord {
  userId: string;
  tier: PlanTier;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  searchesToday: number;
  lastSearchDay: string; // YYYY-MM-DD, used to reset the daily counter
}

/**
 * In-memory store keyed by userId. This is intentionally simple for a
 * scaffold/demo: swap this module for a Postgres + Prisma (or Redis-cached)
 * implementation in production — every other module only depends on the
 * exported functions below, not on the storage mechanism.
 */
const users = new Map<string, UserRecord>();
const stripeCustomerToUser = new Map<string, string>();

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getOrCreateUser(userId: string): UserRecord {
  let user = users.get(userId);
  if (!user) {
    user = { userId, tier: "free", searchesToday: 0, lastSearchDay: todayKey() };
    users.set(userId, user);
  }
  if (user.lastSearchDay !== todayKey()) {
    user.searchesToday = 0;
    user.lastSearchDay = todayKey();
  }
  return user;
}

export function incrementSearchCount(userId: string): void {
  const user = getOrCreateUser(userId);
  user.searchesToday += 1;
}

export function setUserTier(userId: string, tier: PlanTier, stripeCustomerId?: string, stripeSubscriptionId?: string): void {
  const user = getOrCreateUser(userId);
  user.tier = tier;
  if (stripeCustomerId) {
    user.stripeCustomerId = stripeCustomerId;
    stripeCustomerToUser.set(stripeCustomerId, userId);
  }
  if (stripeSubscriptionId) user.stripeSubscriptionId = stripeSubscriptionId;
}

export function findUserIdByStripeCustomer(stripeCustomerId: string): string | undefined {
  return stripeCustomerToUser.get(stripeCustomerId);
}

export function linkStripeCustomer(userId: string, stripeCustomerId: string): void {
  const user = getOrCreateUser(userId);
  user.stripeCustomerId = stripeCustomerId;
  stripeCustomerToUser.set(stripeCustomerId, userId);
}
