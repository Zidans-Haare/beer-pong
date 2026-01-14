/**
 * Offline Store - IndexedDB wrapper for offline data persistence
 * Uses idb-keyval for simple key-value storage
 */

import { get, set, del, keys, clear, createStore } from 'idb-keyval';

// Create separate stores for different data types
const tournamentStore = createStore('bierpong-tournaments', 'tournaments');
const pendingActionsStore = createStore('bierpong-pending', 'actions');
const settingsStore = createStore('bierpong-settings', 'settings');

// ============================================
// Tournament Cache
// ============================================

export interface CachedTournament {
  id: string;
  data: unknown;
  cachedAt: number;
}

/**
 * Cache tournament data for offline access
 */
export async function cacheTournament(id: string, data: unknown): Promise<void> {
  const cached: CachedTournament = {
    id,
    data,
    cachedAt: Date.now(),
  };
  await set(id, cached, tournamentStore);
}

/**
 * Get cached tournament data
 */
export async function getCachedTournament(id: string): Promise<CachedTournament | undefined> {
  return get(id, tournamentStore);
}

/**
 * Remove cached tournament
 */
export async function removeCachedTournament(id: string): Promise<void> {
  await del(id, tournamentStore);
}

/**
 * Get all cached tournament IDs
 */
export async function getCachedTournamentIds(): Promise<string[]> {
  const allKeys = await keys(tournamentStore);
  return allKeys as string[];
}

// ============================================
// Pending Actions (Offline Queue)
// ============================================

export interface PendingAction {
  id: string;
  type: 'UPDATE_MATCH' | 'SUBMIT_RSVP' | 'ADD_TICKER_EVENT';
  payload: unknown;
  createdAt: number;
  retryCount: number;
}

/**
 * Add action to pending queue
 */
export async function queueAction(action: Omit<PendingAction, 'id' | 'createdAt' | 'retryCount'>): Promise<string> {
  const id = `${action.type}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const pendingAction: PendingAction = {
    ...action,
    id,
    createdAt: Date.now(),
    retryCount: 0,
  };
  await set(id, pendingAction, pendingActionsStore);
  return id;
}

/**
 * Get all pending actions
 */
export async function getPendingActions(): Promise<PendingAction[]> {
  const allKeys = await keys(pendingActionsStore);
  const actions: PendingAction[] = [];

  for (const key of allKeys) {
    const action = await get(key, pendingActionsStore);
    if (action) actions.push(action as PendingAction);
  }

  return actions.sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Remove pending action (after successful sync)
 */
export async function removePendingAction(id: string): Promise<void> {
  await del(id, pendingActionsStore);
}

/**
 * Update retry count for action
 */
export async function incrementRetryCount(id: string): Promise<void> {
  const action = await get(id, pendingActionsStore) as PendingAction | undefined;
  if (action) {
    action.retryCount += 1;
    await set(id, action, pendingActionsStore);
  }
}

/**
 * Clear all pending actions
 */
export async function clearPendingActions(): Promise<void> {
  await clear(pendingActionsStore);
}

/**
 * Get pending action count
 */
export async function getPendingActionCount(): Promise<number> {
  const allKeys = await keys(pendingActionsStore);
  return allKeys.length;
}

// ============================================
// User Settings
// ============================================

/**
 * Save user setting
 */
export async function saveSetting(key: string, value: unknown): Promise<void> {
  await set(key, value, settingsStore);
}

/**
 * Get user setting
 */
export async function getSetting<T>(key: string): Promise<T | undefined> {
  return get(key, settingsStore);
}

/**
 * Remove user setting
 */
export async function removeSetting(key: string): Promise<void> {
  await del(key, settingsStore);
}

// ============================================
// Sync Utilities
// ============================================

/**
 * Process all pending actions (called when back online)
 */
export async function syncPendingActions(
  processor: (action: PendingAction) => Promise<boolean>
): Promise<{ success: number; failed: number }> {
  const actions = await getPendingActions();
  let success = 0;
  let failed = 0;

  for (const action of actions) {
    try {
      const result = await processor(action);
      if (result) {
        await removePendingAction(action.id);
        success++;
      } else {
        await incrementRetryCount(action.id);
        failed++;
      }
    } catch (error) {
      console.error('[OfflineStore] Sync failed for action:', action.id, error);
      await incrementRetryCount(action.id);
      failed++;
    }
  }

  return { success, failed };
}

// ============================================
// Cache Management
// ============================================

const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Clean up old cached data
 */
export async function cleanupOldCache(): Promise<number> {
  const now = Date.now();
  const tournamentIds = await getCachedTournamentIds();
  let cleaned = 0;

  for (const id of tournamentIds) {
    const cached = await getCachedTournament(id);
    if (cached && now - cached.cachedAt > MAX_CACHE_AGE_MS) {
      await removeCachedTournament(id);
      cleaned++;
    }
  }

  return cleaned;
}
