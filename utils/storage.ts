/**
 * 统一存储工具 (Unified storage utility)
 *
 * 将白名单、黑名单、策略等用户设置存储到 browser.storage.sync，
 * 使其可以跨设备同步（需要用户登录浏览器账号）。
 * 同时将这些设置缓存到 storage.local，供 content script 快速读取。
 *
 * Stores user settings (whitelist, blacklist, strategy, etc.) to browser.storage.sync
 * for cross-device sync (requires browser account login).
 * Also caches to storage.local for fast reading by content scripts.
 */

// 需要同步的 key 列表 (keys that should be synced)
const SYNC_KEYS = [
  "interceptEnabled",
  "beautifyEnabled",
  "toolbarStrategy",
  "toolbarWhitelist",
  "toolbarBlacklist",
  "language",
] as const;

export type SyncKey = (typeof SYNC_KEYS)[number];

/**
 * 判断一个 key 是否为需要同步的 key
 * (Check if a key is a syncable key)
 */
export function isSyncKey(key: string): key is SyncKey {
  return (SYNC_KEYS as readonly string[]).includes(key);
}

/**
 * 读取可同步设置（优先从 sync 读取，降级到 local）
 * (Read syncable settings, prefer sync, fallback to local)
 */
export async function getSyncSettings(keys: SyncKey[]): Promise<Record<string, any>> {
  try {
    const syncResult = await browser.storage.sync.get(keys);
    // 如果 sync 中有数据，直接返回
    if (Object.keys(syncResult).length > 0) {
      return syncResult;
    }
  } catch {
    // sync 不可用（如 Firefox 未登录），降级到 local
  }

  // 降级到 local
  return browser.storage.local.get(keys);
}

/**
 * 写入可同步设置（同时写入 sync 和 local）
 * (Write syncable settings to both sync and local)
 */
export async function setSyncSettings(data: Partial<Record<SyncKey, any>>): Promise<void> {
  // 始终写入 local（content script 可快速读取）
  await browser.storage.local.set(data);

  // 尝试写入 sync
  try {
    await browser.storage.sync.set(data);
  } catch {
    // sync 不可用时静默失败（数据仍在 local 中可用）
    console.warn("[SnapLab] storage.sync not available, data saved locally only.");
  }
}

/**
 * 初始化同步监听：当 sync 数据发生变化时，同步到 local
 * (Initialize sync listener: sync changes from sync to local)
 *
 * 应在 background script 中调用一次
 * (Should be called once in background script)
 */
export function initSyncListener(): void {
  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "sync") {
      const localUpdates: Record<string, any> = {};
      for (const [key, change] of Object.entries(changes)) {
        if (isSyncKey(key) && change.newValue !== undefined) {
          localUpdates[key] = change.newValue;
        }
      }
      if (Object.keys(localUpdates).length > 0) {
        // 将 sync 变化同步到 local
        browser.storage.local.set(localUpdates);
      }
    }
  });
}

/**
 * 将现有 local 数据迁移到 sync（首次升级时使用）
 * (Migrate existing local data to sync, for first-time upgrade)
 */
export async function migrateLocalToSync(): Promise<void> {
  try {
    // 检查是否已迁移
    const migrated = await browser.storage.local.get("__syncMigrated");
    if (migrated.__syncMigrated) return;

    // 读取现有 local 数据
    const localData = await browser.storage.local.get([...SYNC_KEYS]);

    // 过滤有值的数据
    const dataToMigrate: Record<string, any> = {};
    for (const [key, value] of Object.entries(localData)) {
      if (value !== undefined && value !== null) {
        dataToMigrate[key] = value;
      }
    }

    // 如果有数据需要迁移，写入 sync
    if (Object.keys(dataToMigrate).length > 0) {
      try {
        await browser.storage.sync.set(dataToMigrate);
      } catch {
        // sync 不可用时跳过迁移
        console.warn("[SnapLab] Could not migrate to sync storage.");
      }
    }

    // 标记已迁移
    await browser.storage.local.set({ __syncMigrated: true });
  } catch (e) {
    console.error("[SnapLab] Migration error:", e);
  }
}
