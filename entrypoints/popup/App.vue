<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { initLanguage, t, getLanguage, setLanguage, type Language } from '@/utils/i18n';

// 语言状态 (language state)
const currentLang = ref<Language>('zh_CN');
const ready = ref(false);

// 拦截开关状态，默认开启 (intercept toggle, default on)
const interceptEnabled = ref(true);
// 美化开关状态，默认开启 (beautify toggle, default on)
const beautifyEnabled = ref(true);

onMounted(async () => {
  // 初始化语言 (init language)
  currentLang.value = await initLanguage();
  ready.value = true;

  // 从 storage 读取开关状态 (read toggle state from storage)
  const result = await browser.storage.local.get(['interceptEnabled', 'beautifyEnabled']);
  if (typeof result.interceptEnabled === 'boolean') {
    interceptEnabled.value = result.interceptEnabled;
  }
  if (typeof result.beautifyEnabled === 'boolean') {
    beautifyEnabled.value = result.beautifyEnabled;
  }
});

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
  const newLang: Language = currentLang.value === 'zh_CN' ? 'en' : 'zh_CN';
  await setLanguage(newLang);
  currentLang.value = newLang;
}

// 打开本地图片 (open local image)
function openLocalImage() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*,.heic,.heif';
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
            type: 'snaplab:open-local-image',
            dataUrl,
          });
          window.close();
        }
      } catch {
        // content script 不可用（如 newtab 页面），通过内部预览页面打开
        await browser.storage.local.set({ previewImageDataUrl: dataUrl });
        await browser.tabs.create({
          url: browser.runtime.getURL('/preview.html'),
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
    <img src="/icon/128.png" class="logo" alt="SnapLab logo" />
    <h1 class="title">{{ t('extension_name') }}</h1>
    <p class="desc">{{ t('extension_description') }}</p>

    <div class="toggle-section">
      <span class="toggle-label">{{ t('popup_image_preview') }}</span>
      <button
        class="toggle-btn"
        :class="{ active: interceptEnabled }"
        @click="toggleIntercept"
        :title="interceptEnabled ? t('popup_click_to_close') : t('popup_click_to_open')"
      >
        <span class="toggle-knob" />
      </button>
    </div>

    <div class="toggle-section">
      <span class="toggle-label">{{ t('popup_image_beautify') }}</span>
      <button
        class="toggle-btn"
        :class="{ active: beautifyEnabled }"
        @click="toggleBeautify"
        :title="beautifyEnabled ? t('popup_click_to_close') : t('popup_click_to_open')"
      >
        <span class="toggle-knob" />
      </button>
    </div>

    <p class="status-text">
      {{ interceptEnabled ? t('popup_preview_on') : t('popup_preview_off') }}
    </p>
    <p class="status-text" v-if="interceptEnabled">
      {{ beautifyEnabled ? t('popup_beautify_on') : t('popup_beautify_off') }}
    </p>

    <div class="divider"></div>

    <button class="open-local-btn" @click="openLocalImage">
      {{ t('popup_open_local_image') }}
    </button>
    <p class="status-text">{{ t('popup_open_local_hint') }}</p>

    <div class="divider"></div>

    <!-- 语言切换 (language switch) -->
    <div class="toggle-section">
      <span class="toggle-label">{{ t('lang_label') }}</span>
      <button class="lang-btn" @click="toggleLanguage">
        {{ currentLang === 'zh_CN' ? '中文 → EN' : 'EN → 中文' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.container {
  width: 300px;
  padding: 24px 16px;
  text-align: center;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
.logo {
  width: 80px;
  height: 80px;
  margin-bottom: 16px;
}
.title {
  font-size: 20px;
  font-weight: bold;
  margin: 0 0 8px 0;
  color: #333;
}
.desc {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
  margin: 0 0 20px 0;
}

/* 开关区域 (toggle section) */
.toggle-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 12px;
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
  margin: 0;
}

/* 分隔线 (divider) */
.divider {
  height: 1px;
  background: #e0e0e0;
  margin: 16px 0;
}

/* 打开本地图片按钮 (open local image button) */
.open-local-btn {
  width: 100%;
  padding: 10px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #f5f5f5;
  color: #333;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 8px;
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

@media (prefers-color-scheme: dark) {
  .title { color: #eee; }
  .desc { color: #ccc; }
  .toggle-label { color: #ddd; }
  .toggle-btn { background-color: #555; }
  .divider { background: #444; }
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
  .toggle-btn.active { background-color: #4caf50; }
  .status-text { color: #888; }
}
</style>
