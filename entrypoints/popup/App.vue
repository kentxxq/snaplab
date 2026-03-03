<script lang="ts" setup>
import { ref, onMounted } from 'vue';

const extensionName = browser.i18n.getMessage("extension_name");
const extensionDesc = browser.i18n.getMessage("extension_description");

// 拦截开关状态，默认开启
const interceptEnabled = ref(true);
// 美化开关状态，默认开启
const beautifyEnabled = ref(true);

onMounted(async () => {
  // 从 storage 读取开关状态
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
</script>

<template>
  <div class="container">
    <img src="/icon/128.png" class="logo" alt="SnapLab logo" />
    <h1 class="title">{{ extensionName }}</h1>
    <p class="desc">{{ extensionDesc }}</p>

    <div class="toggle-section">
      <span class="toggle-label">图片预览</span>
      <button
        class="toggle-btn"
        :class="{ active: interceptEnabled }"
        @click="toggleIntercept"
        :title="interceptEnabled ? '点击关闭' : '点击开启'"
      >
        <span class="toggle-knob" />
      </button>
    </div>

    <div class="toggle-section">
      <span class="toggle-label">图片美化</span>
      <button
        class="toggle-btn"
        :class="{ active: beautifyEnabled }"
        @click="toggleBeautify"
        :title="beautifyEnabled ? '点击关闭' : '点击开启'"
      >
        <span class="toggle-knob" />
      </button>
    </div>

    <p class="status-text">
      {{ interceptEnabled ? '预览已开启 · 悬停图片显示操作菜单' : '预览已关闭 · 图片交互恢复默认' }}
    </p>
    <p class="status-text" v-if="interceptEnabled">
      {{ beautifyEnabled ? '美化已开启 · 可一键美化导出图片' : '美化已关闭 · 仅保留预览功能' }}
    </p>
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

/* 开关区域 */
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

/* 开关按钮 */
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

/* 状态提示文字 */
.status-text {
  font-size: 12px;
  color: #999;
  margin: 0;
}

@media (prefers-color-scheme: dark) {
  .title { color: #eee; }
  .desc { color: #ccc; }
  .toggle-label { color: #ddd; }
  .toggle-btn { background-color: #555; }
  .toggle-btn.active { background-color: #4caf50; }
  .status-text { color: #888; }
}
</style>
