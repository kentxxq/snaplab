<script lang="ts" setup>
import { ref, onMounted, computed, nextTick } from "vue";
import { initLanguage, t, getLanguage, setLanguage, type Language } from "@/utils/i18n";

// 语言状态 (language state)
const currentLang = ref<Language>("zh_CN");
const ready = ref(false);

// 新增 Menu 状态 (Menu Tabs)
const activeTab = ref<"home" | "settings">("home");

// 拦截开关状态，默认开启 (intercept toggle, default on)
const interceptEnabled = ref(true);
// 美化开关状态，默认开启 (beautify toggle, default on)
const beautifyEnabled = ref(true);

// 显示策略状态 (display strategy state)
const toolbarStrategy = ref("open_with_blacklist");
const toolbarWhitelist = ref<string[]>([]);
const toolbarBlacklist = ref<string[]>([]);
const currentHost = ref("");

onMounted(async () => {
  // 初始化语言 (init language)
  currentLang.value = await initLanguage();
  ready.value = true;

  // 从 storage 读取开关状态 (read toggle state from storage)
  const result = await browser.storage.local.get([
    "interceptEnabled",
    "beautifyEnabled",
    "toolbarStrategy",
    "toolbarWhitelist",
    "toolbarBlacklist",
  ]);
  if (typeof result.interceptEnabled === "boolean") {
    interceptEnabled.value = result.interceptEnabled;
  }
  if (typeof result.beautifyEnabled === "boolean") {
    beautifyEnabled.value = result.beautifyEnabled;
  }
  if (result.toolbarStrategy) {
    toolbarStrategy.value = result.toolbarStrategy as string;
  }
  if (result.toolbarWhitelist) {
    toolbarWhitelist.value = result.toolbarWhitelist as string[];
  }
  if (result.toolbarBlacklist) {
    toolbarBlacklist.value = result.toolbarBlacklist as string[];
  }

  // 获取当前域 (get current domain)
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) {
    try {
      const url = new URL(tab.url);
      if (url.protocol.startsWith("http")) {
        currentHost.value = url.hostname;
      }
    } catch (e) {
      // ignore invalid URLs
    }
  }
});

const isCurrentInWhitelist = computed(() => toolbarWhitelist.value.includes(currentHost.value));
const isCurrentInBlacklist = computed(() => toolbarBlacklist.value.includes(currentHost.value));

// 判断当前站点在当前策略下是否会显示工具栏 (check if toolbar will be shown for current site)
const isCurrentSiteActive = computed(() => {
  if (!currentHost.value) return false;
  const strategy = toolbarStrategy.value || "open_with_blacklist";
  if (strategy === "open_all") return true;
  if (strategy === "close_all") return false;
  if (strategy === "close_with_whitelist") return isCurrentInWhitelist.value;
  if (strategy === "open_with_blacklist") return !isCurrentInBlacklist.value;
  return true;
});

async function updateStrategy() {
  await browser.storage.local.set({ toolbarStrategy: toolbarStrategy.value });
}

// 手动添加域名到名单 (add domain to list manually)
const whitelistInput = ref("");
const blacklistInput = ref("");

// 简单域名校验 (simple domain validation)
function isValidDomain(domain: string): boolean {
  return /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(domain);
}

async function addToWhitelist() {
  const domain = whitelistInput.value.trim().toLowerCase();
  if (!domain || !isValidDomain(domain)) return;
  if (toolbarWhitelist.value.includes(domain)) {
    whitelistInput.value = "";
    return;
  }
  toolbarWhitelist.value.push(domain);
  // 互斥：从黑名单中移除 (exclusive: remove from blacklist)
  toolbarBlacklist.value = toolbarBlacklist.value.filter((h) => h !== domain);
  await browser.storage.local.set({
    toolbarWhitelist: [...toolbarWhitelist.value],
    toolbarBlacklist: [...toolbarBlacklist.value],
  });
  whitelistInput.value = "";
}

async function addToBlacklist() {
  const domain = blacklistInput.value.trim().toLowerCase();
  if (!domain || !isValidDomain(domain)) return;
  if (toolbarBlacklist.value.includes(domain)) {
    blacklistInput.value = "";
    return;
  }
  toolbarBlacklist.value.push(domain);
  // 互斥：从白名单中移除 (exclusive: remove from whitelist)
  toolbarWhitelist.value = toolbarWhitelist.value.filter((h) => h !== domain);
  await browser.storage.local.set({
    toolbarWhitelist: [...toolbarWhitelist.value],
    toolbarBlacklist: [...toolbarBlacklist.value],
  });
  blacklistInput.value = "";
}

async function removeFromWhitelist(host: string) {
  toolbarWhitelist.value = toolbarWhitelist.value.filter((h) => h !== host);
  await browser.storage.local.set({
    toolbarWhitelist: [...toolbarWhitelist.value],
  });
}

async function removeFromBlacklist(host: string) {
  toolbarBlacklist.value = toolbarBlacklist.value.filter((h) => h !== host);
  await browser.storage.local.set({
    toolbarBlacklist: [...toolbarBlacklist.value],
  });
}



async function toggleIntercept() {
  interceptEnabled.value = !interceptEnabled.value;
  await browser.storage.local.set({ interceptEnabled: interceptEnabled.value });
}

async function toggleBeautify() {
  beautifyEnabled.value = !beautifyEnabled.value;
  await browser.storage.local.set({ beautifyEnabled: beautifyEnabled.value });
}

// 切换语言 (switch language)
async function toggleLanguage() {
  const newLang: Language = currentLang.value === "zh_CN" ? "en" : "zh_CN";
  await setLanguage(newLang);
  currentLang.value = newLang;
}

// 打开本地图片 (open local image)
function openLocalImage() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*,.heic,.heif";
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          await browser.tabs.sendMessage(tab.id, {
            type: "snaplab:open-local-image",
            dataUrl,
          });
          window.close();
        }
      } catch {
        // content script 不可用（如 newtab 页面），通过内部预览页面打开
        await browser.storage.local.set({ previewImageDataUrl: dataUrl });
        await browser.tabs.create({
          url: browser.runtime.getURL("/preview.html"),
        });
        window.close();
      }
    };
    reader.readAsDataURL(file);
  };
  input.click();
}
</script>

<template>
  <div class="container" v-if="ready">
    <!-- Header with Tabs -->
    <div class="header">
      <div class="header-left">
        <img src="/icon/128.png" class="logo-small" alt="SnapLab logo" />
        <span class="title-small">{{ t("extension_name") }}</span>
      </div>
      <div class="tabs">
        <button class="tab-btn" :class="{ active: activeTab === 'home' }" @click="activeTab = 'home'">
          {{ t("popup_tab_home") }}
        </button>
        <button class="tab-btn" :class="{ active: activeTab === 'settings' }" @click="activeTab = 'settings'">
          {{ t("popup_tab_settings") }}
        </button>
      </div>
    </div>

    <!-- Home Tab -->
    <div v-show="activeTab === 'home'" class="tab-content">
      <div class="feature-item">
        <div class="toggle-section" style="margin-bottom: 6px;">
          <span class="toggle-label">{{ t("popup_image_preview") }}</span>
          <button
            class="toggle-btn"
            :class="{ active: interceptEnabled }"
            @click="toggleIntercept"
            :title="interceptEnabled ? t('popup_click_to_close') : t('popup_click_to_open')"
          >
            <span class="toggle-knob" />
          </button>
        </div>
        <div class="feature-desc">
          {{ interceptEnabled ? t("popup_preview_on") : t("popup_preview_off") }}
        </div>
      </div>

      <div class="feature-item">
        <div class="toggle-section" style="margin-bottom: 6px;">
          <span class="toggle-label">{{ t("popup_image_beautify") }}</span>
          <button
            class="toggle-btn"
            :class="{ active: beautifyEnabled }"
            @click="toggleBeautify"
            :title="beautifyEnabled ? t('popup_click_to_close') : t('popup_click_to_open')"
          >
            <span class="toggle-knob" />
          </button>
        </div>
        <div class="feature-desc">
          {{ beautifyEnabled ? t("popup_beautify_on") : t("popup_beautify_off") }}
        </div>
      </div>

      <div class="divider"></div>

      <button class="open-local-btn" @click="openLocalImage">
        {{ t("popup_open_local_image") }}
      </button>
      <p class="status-text">{{ t("popup_open_local_hint") }}</p>
    </div>

    <!-- Settings Tab -->
    <div v-show="activeTab === 'settings'" class="tab-content">
      <!-- 策略配置 (Strategy Config) -->
      <div class="strategy-section">
        <div class="strategy-header">{{ t("popup_strategy_title") }}</div>
        <select v-model="toolbarStrategy" @change="updateStrategy" class="strategy-select">
          <option value="open_all">{{ t("strategy_open_all") }}</option>
          <option value="close_all">{{ t("strategy_close_all") }}</option>
          <option value="close_with_whitelist">{{ t("strategy_close_with_whitelist") }}</option>
          <option value="open_with_blacklist">{{ t("strategy_open_with_blacklist") }}</option>
        </select>

        <div class="site-status" v-if="currentHost">
          <div class="site-status-row">
            <span class="current-host">{{ currentHost }}</span>
            <span class="status-badge" :class="isCurrentSiteActive ? 'active' : 'inactive'">
              {{ isCurrentSiteActive ? t("site_status_active") : t("site_status_inactive") }}
            </span>
          </div>
        </div>
      </div>

      <!-- 白名单列表 (Whitelist List) -->
      <div class="list-section">
        <div class="list-header">
          <span class="list-title">{{ t("site_list_whitelist_title") }}</span>
          <span class="list-count">{{ toolbarWhitelist.length }}</span>
        </div>
        <div class="list-add-row">
          <input
            v-model="whitelistInput"
            class="list-add-input"
            :placeholder="t('site_list_add_placeholder')"
            @keyup.enter="addToWhitelist"
          />
          <button class="list-add-btn" @click="addToWhitelist">{{ t("site_list_add_btn") }}</button>
        </div>
        <div class="list-body" v-if="toolbarWhitelist.length">
          <div class="list-item" v-for="host in toolbarWhitelist" :key="host">
            <span class="list-item-host" :class="{ highlight: host === currentHost }">{{ host }}</span>
            <button class="list-item-remove" @click="removeFromWhitelist(host)" title="Remove">&times;</button>
          </div>
        </div>
        <div class="list-empty" v-else>{{ t("site_list_empty_whitelist") }}</div>
      </div>

      <!-- 黑名单列表 (Blacklist List) -->
      <div class="list-section">
        <div class="list-header">
          <span class="list-title">{{ t("site_list_blacklist_title") }}</span>
          <span class="list-count">{{ toolbarBlacklist.length }}</span>
        </div>
        <div class="list-add-row">
          <input
            v-model="blacklistInput"
            class="list-add-input"
            :placeholder="t('site_list_add_placeholder')"
            @keyup.enter="addToBlacklist"
          />
          <button class="list-add-btn" @click="addToBlacklist">{{ t("site_list_add_btn") }}</button>
        </div>
        <div class="list-body" v-if="toolbarBlacklist.length">
          <div class="list-item" v-for="host in toolbarBlacklist" :key="host">
            <span class="list-item-host" :class="{ highlight: host === currentHost }">{{ host }}</span>
            <button class="list-item-remove" @click="removeFromBlacklist(host)" title="Remove">&times;</button>
          </div>
        </div>
        <div class="list-empty" v-else>{{ t("site_list_empty_blacklist") }}</div>
      </div>

      <div class="divider"></div>

      <!-- 语言切换 (language switch) -->
      <div class="toggle-section">
        <span class="toggle-label">{{ t("lang_label") }}</span>
        <button class="lang-btn" @click="toggleLanguage">
          {{ currentLang === "zh_CN" ? "中文 → EN" : "EN → 中文" }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  width: 320px;
  box-sizing: border-box;
  padding: 16px;
  text-align: left;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

/* Header & Tabs */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 12px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.logo-small {
  width: 24px;
  height: 24px;
}
.title-small {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}
.tabs {
  display: flex;
  background: #f0f0f0;
  border-radius: 6px;
  padding: 2px;
}
.tab-btn {
  padding: 4px 10px;
  border: none;
  background: transparent;
  font-size: 12px;
  color: #666;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}
.tab-btn.active {
  background: #fff;
  color: #333;
  font-weight: 500;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}
.tab-content {
  animation: fadeIn 0.15s ease-in-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(2px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 开关区域 (toggle section) */
.toggle-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.toggle-label {
  font-size: 14px;
  font-weight: 500;
  color: #444;
}

/* 开关按钮 (toggle button) */
.toggle-btn {
  position: relative;
  width: 48px;
  height: 26px;
  border-radius: 13px;
  border: none;
  background-color: #ccc;
  cursor: pointer;
  padding: 0;
  transition: background-color 0.3s ease;
  outline: none;
}
.toggle-btn.active {
  background-color: #4caf50;
}
.toggle-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease;
}
.toggle-btn.active .toggle-knob {
  transform: translateX(22px);
}

/* 状态提示文字 (status text) */
.status-text {
  font-size: 12px;
  color: #999;
  margin: 4px 0 0 0;
}

/* Feature Item */
.feature-item {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 12px;
  transition: opacity 0.3s;
}
.feature-desc {
  font-size: 11px;
  color: #888;
  line-height: 1.4;
}

/* 分隔线 (divider) */
.divider {
  height: 1px;
  background: #e0e0e0;
  margin: 12px 0;
}

/* 打开本地图片按钮 (open local image button) */
.open-local-btn {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #f5f5f5;
  color: #333;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 6px;
}
.open-local-btn:hover {
  background: #e8e8e8;
  border-color: #ccc;
}

/* 语言切换按钮 (language switch button) */
.lang-btn {
  padding: 4px 14px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #f5f5f5;
  color: #333;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.lang-btn:hover {
  background: #e8e8e8;
  border-color: #ccc;
}

/* 策略区域 (Strategy Section) */
.strategy-section {
  text-align: left;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 12px;
}
.strategy-header {
  font-size: 13px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}
.strategy-select {
  width: 100%;
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  margin-bottom: 12px;
  background: white;
  color: #333;
}
.current-host {
  font-size: 12px;
  color: #666;
  word-break: break-all;
  flex: 1;
  min-width: 0;
}
.site-status {
  margin-top: 8px;
}
.site-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.status-badge {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 500;
  padding: 2px 10px;
  border-radius: 10px;
  letter-spacing: 0.3px;
}
.status-badge.active {
  background: #e8f5e9;
  color: #2e7d32;
}
.status-badge.inactive {
  background: #ffebee;
  color: #c62828;
}


/* 名单列表区域 (List Section) */
.list-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 10px;
}
.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.list-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}
.list-count {
  font-size: 11px;
  background: #e0e0e0;
  color: #555;
  padding: 1px 7px;
  border-radius: 10px;
  font-weight: 500;
}
.list-add-row {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}
.list-add-input {
  flex: 1;
  padding: 5px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  background: white;
  color: #333;
  outline: none;
  transition: border-color 0.2s;
}
.list-add-input:focus {
  border-color: #2196f3;
}
.list-add-input::placeholder {
  color: #aaa;
}
.list-add-btn {
  padding: 5px 12px;
  border: 1px solid #2196f3;
  border-radius: 4px;
  background: #2196f3;
  color: white;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.list-add-btn:hover {
  background: #1976d2;
  border-color: #1976d2;
}
.list-body {
  max-height: 120px;
  overflow-y: auto;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  background: white;
}
.list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 8px;
  font-size: 12px;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.15s;
}
.list-item:last-child {
  border-bottom: none;
}
.list-item:hover {
  background: #f5f5f5;
}
.list-item-host {
  color: #555;
  word-break: break-all;
  flex: 1;
  min-width: 0;
}
.list-item-host.highlight {
  color: #1976d2;
  font-weight: 500;
}
.list-item-remove {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border: none;
  background: none;
  color: #bbb;
  font-size: 16px;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin-left: 4px;
  transition: all 0.15s;
  line-height: 1;
}
.list-item-remove:hover {
  background: #ffebee;
  color: #e53935;
}
.list-empty {
  font-size: 12px;
  color: #aaa;
  text-align: center;
  padding: 10px 0;
}

@media (prefers-color-scheme: dark) {
  .header {
    border-bottom-color: #444;
  }
  .title-small {
    color: #eee;
  }
  .tabs {
    background: #2a2a2a;
  }
  .tab-btn {
    color: #999;
  }
  .tab-btn.active {
    background: #555;
    color: #eee;
  }
  .toggle-label {
    color: #ddd;
  }
  .toggle-btn {
    background-color: #555;
  }
  .divider {
    background: #444;
  }
  .open-local-btn {
    background: #333;
    border-color: #555;
    color: #ddd;
  }
  .open-local-btn:hover {
    background: #444;
    border-color: #666;
  }
  .lang-btn {
    background: #333;
    border-color: #555;
    color: #ddd;
  }
  .lang-btn:hover {
    background: #444;
    border-color: #666;
  }
  .toggle-btn.active {
    background-color: #4caf50;
  }
  .status-text {
    color: #888;
  }
  .strategy-section {
    background: #2a2a2a;
  }
  .feature-item {
    background: #2a2a2a;
  }
  .feature-desc {
    color: #888;
  }
  .strategy-header {
    color: #eee;
  }
  .strategy-select {
    background: #333;
    color: #eee;
    border-color: #555;
  }
  .current-host {
    color: #aaa;
  }
  .status-badge.active {
    background: #1b5e20;
    color: #a5d6a7;
  }
  .status-badge.inactive {
    background: #4a2020;
    color: #ef9a9a;
  }
  .list-section {
    background: #2a2a2a;
  }
  .list-title {
    color: #eee;
  }
  .list-count {
    background: #444;
    color: #bbb;
  }
  .list-add-input {
    background: #333;
    color: #eee;
    border-color: #555;
  }
  .list-add-input:focus {
    border-color: #2196f3;
  }
  .list-add-input::placeholder {
    color: #777;
  }
  .list-body {
    background: #333;
    border-color: #444;
  }
  .list-item {
    border-bottom-color: #444;
  }
  .list-item:hover {
    background: #3a3a3a;
  }
  .list-item-host {
    color: #ccc;
  }
  .list-item-host.highlight {
    color: #64b5f6;
  }
  .list-item-remove {
    color: #777;
  }
  .list-item-remove:hover {
    background: #4a2020;
    color: #ef5350;
  }
  .list-empty {
    color: #666;
  }
}
</style>
