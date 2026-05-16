import { t, initLanguage } from "@/utils/i18n";
import { getSyncSettings, setSyncSettings, initSyncListener, migrateLocalToSync } from "@/utils/storage";

export default defineBackground(() => {
  console.log("Hello background!", { id: browser.runtime.id });

  // 初始化同步监听器（sync → local 实时同步）
  // (Initialize sync listener for real-time sync → local)
  initSyncListener();

  // 初始化右键菜单 (Initialize context menus)
  browser.runtime.onInstalled.addListener(async () => {
    await initLanguage();

    // 执行数据迁移（将旧的 local 数据同步到 sync）
    // (Migrate existing local data to sync storage)
    await migrateLocalToSync();

    browser.contextMenus.create({
      id: "snaplab_add_whitelist",
      title: t("context_menu_add_whitelist"),
      contexts: ["page", "image"],
    });

    browser.contextMenus.create({
      id: "snaplab_add_blacklist",
      title: t("context_menu_add_blacklist"),
      contexts: ["page", "image"],
    });
  });

  // 监听右键菜单点击 (Listen to context menu clicks)
  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!tab?.url) return;

    try {
      const urlObj = new URL(tab.url);
      const host = urlObj.hostname;
      if (!host) return;

      if (info.menuItemId === "snaplab_add_whitelist") {
        const result = await getSyncSettings(["toolbarWhitelist", "toolbarBlacklist"]);
        let wl = (result.toolbarWhitelist as string[]) || [];
        let bl = (result.toolbarBlacklist as string[]) || [];

        if (!wl.includes(host)) wl.push(host);
        bl = bl.filter((h) => h !== host); // 移出黑名单

        await setSyncSettings({ toolbarWhitelist: wl, toolbarBlacklist: bl });
      } else if (info.menuItemId === "snaplab_add_blacklist") {
        const result = await getSyncSettings(["toolbarWhitelist", "toolbarBlacklist"]);
        let wl = (result.toolbarWhitelist as string[]) || [];
        let bl = (result.toolbarBlacklist as string[]) || [];

        if (!bl.includes(host)) bl.push(host);
        wl = wl.filter((h) => h !== host); // 移出白名单

        await setSyncSettings({ toolbarWhitelist: wl, toolbarBlacklist: bl });
      }
    } catch (e) {
      console.error("Invalid URL for context menu action:", tab.url);
    }
  });

  // 监听来自 content script 的消息，代理 fetch 请求绕过 CORS 限制
  // (Listen for messages from content script, proxy fetch requests to bypass CORS)
  browser.runtime.onMessage.addListener((message: any, _sender, sendResponse) => {
    // 打开美化页面（content script 无法直接打开 chrome-extension:// URL）
    if (message?.type === "snaplab:open-beautify-page") {
      const url = browser.runtime.getURL("/beautify.html");
      browser.tabs.create({ url });
      return;
    }

    if (message?.type === "snaplab:fetch-image-data") {
      const url = message.url as string;

      fetch(url)
        .then(async (response) => {
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          // 将 ArrayBuffer 转为 base64 传回 (convert ArrayBuffer to base64 for transfer)
          const uint8 = new Uint8Array(arrayBuffer);
          let binary = "";
          for (let i = 0; i < uint8.length; i++) {
            binary += String.fromCharCode(uint8[i]);
          }
          const base64 = btoa(binary);
          sendResponse({
            success: true,
            base64,
            mimeType: blob.type,
            size: blob.size,
          });
        })
        .catch((err) => {
          sendResponse({
            success: false,
            error: err?.message || "fetch failed",
          });
        });

      // 返回 true 表示异步响应 (return true for async response)
      return true;
    }
  });
});
