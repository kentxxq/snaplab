<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { initLanguage, t } from '@/utils/i18n';

const props = defineProps<{
  src: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

// ========== 美化参数 (beautify params) ==========
const borderRadius = ref(12);
const padding = ref(48);
const shadowLevel = ref(2);
const selectedBg = ref(0);
const bgBorderRadiusEnabled = ref(true);
const bgBorderRadius = ref(16);

// 背景预设 (background presets)
const bgPresets = [
  { nameKey: 'beautify_bg_indigo', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { nameKey: 'beautify_bg_cyan_pink', gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
  { nameKey: 'beautify_bg_warm_orange', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { nameKey: 'beautify_bg_deep_blue', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { nameKey: 'beautify_bg_sunset', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  { nameKey: 'beautify_bg_forest', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
  { nameKey: 'beautify_bg_profound', gradient: 'linear-gradient(135deg, #0c3483 0%, #a2b6df 100%, #6b8cce 100%)' },
  { nameKey: 'beautify_bg_dark_night', gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' },
];

const shadowPresets = [
  'none',
  '0 4px 16px rgba(0,0,0,0.15)',
  '0 8px 32px rgba(0,0,0,0.25)',
  '0 16px 64px rgba(0,0,0,0.4)',
];

const shadowLabelKeys = ['beautify_shadow_none', 'beautify_shadow_small', 'beautify_shadow_medium', 'beautify_shadow_large'];

const imageStyle = computed(() => ({
  borderRadius: borderRadius.value + 'px',
  boxShadow: shadowPresets[shadowLevel.value],
}));

const previewContainerStyle = computed(() => ({
  background: bgPresets[selectedBg.value].gradient,
  padding: padding.value + 'px',
  borderRadius: bgBorderRadiusEnabled.value ? bgBorderRadius.value + 'px' : '0px',
}));

const imageLoaded = ref(false);
const naturalWidth = ref(0);
const naturalHeight = ref(0);

// 导出尺寸 = 原始尺寸 + 内边距 * 2 (export size = natural size + padding * 2)
const exportWidth = computed(() => naturalWidth.value + padding.value * 2);
const exportHeight = computed(() => naturalHeight.value + padding.value * 2);

function onImageLoad(e: Event) {
  const img = e.target as HTMLImageElement;
  naturalWidth.value = img.naturalWidth;
  naturalHeight.value = img.naturalHeight;
  imageLoaded.value = true;
}

const copyStatus = ref<'idle' | 'success' | 'error'>('idle');
const downloadStatus = ref<'idle' | 'success' | 'error'>('idle');
let copyTimer: ReturnType<typeof setTimeout> | null = null;
let downloadTimer: ReturnType<typeof setTimeout> | null = null;

async function renderToCanvas(): Promise<HTMLCanvasElement> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(t('beautify_image_load_error')));
    img.src = props.src;
  });

  const pad = padding.value;
  const radius = borderRadius.value;
  const shadow = shadowLevel.value;
  const canvasW = img.naturalWidth + pad * 2;
  const canvasH = img.naturalHeight + pad * 2;
  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d')!;

  // 背景圆角裁剪 (clip background with border-radius)
  const bgRadius = bgBorderRadiusEnabled.value ? bgBorderRadius.value : 0;
  if (bgRadius > 0) {
    ctx.beginPath();
    ctx.roundRect(0, 0, canvasW, canvasH, bgRadius);
    ctx.clip();
  }

  // 绘制背景渐变
  const gradientColors: [string, string][] = [
    ['#667eea', '#764ba2'], ['#a8edea', '#fed6e3'], ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'], ['#fa709a', '#fee140'], ['#43e97b', '#38f9d7'],
    ['#0c3483', '#6b8cce'], ['#1a1a2e', '#0f3460'],
  ];
  const colors = gradientColors[selectedBg.value] || gradientColors[0];
  const grad = ctx.createLinearGradient(0, 0, canvasW, canvasH);
  grad.addColorStop(0, colors[0]);
  grad.addColorStop(1, colors[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvasW, canvasH);

  if (shadow > 0) {
    const shadowConfigs = [null,
      { blur: 16, offsetY: 4, color: 'rgba(0,0,0,0.15)' },
      { blur: 32, offsetY: 8, color: 'rgba(0,0,0,0.25)' },
      { blur: 64, offsetY: 16, color: 'rgba(0,0,0,0.4)' },
    ];
    const sc = shadowConfigs[shadow]!;
    ctx.shadowColor = sc.color;
    ctx.shadowBlur = sc.blur;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = sc.offsetY;
  }

  ctx.beginPath();
  ctx.moveTo(pad + radius, pad);
  ctx.arcTo(pad + img.naturalWidth, pad, pad + img.naturalWidth, pad + img.naturalHeight, radius);
  ctx.arcTo(pad + img.naturalWidth, pad + img.naturalHeight, pad, pad + img.naturalHeight, radius);
  ctx.arcTo(pad, pad + img.naturalHeight, pad, pad, radius);
  ctx.arcTo(pad, pad, pad + img.naturalWidth, pad, radius);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, pad, pad);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  return canvas;
}

async function downloadPng() {
  if (downloadTimer) clearTimeout(downloadTimer);
  try {
    const canvas = await renderToCanvas();
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `snaplab-beautified-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
    downloadStatus.value = 'success';
  } catch (e) {
    console.error('[SnapLab] Export failed:', e);
    downloadStatus.value = 'error';
  }
  downloadTimer = setTimeout(() => { downloadStatus.value = 'idle'; }, 2000);
}

async function copyToClipboard() {
  if (copyTimer) clearTimeout(copyTimer);
  try {
    const canvas = await renderToCanvas();
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => { b ? resolve(b) : reject(new Error('toBlob failed')); }, 'image/png');
    });
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    copyStatus.value = 'success';
  } catch (e) {
    console.error('[SnapLab] Copy failed:', e);
    copyStatus.value = 'error';
  }
  copyTimer = setTimeout(() => { copyStatus.value = 'idle'; }, 2000);
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close');
}

onMounted(async () => {
  await initLanguage();
  document.addEventListener('keydown', handleKeydown);
});
onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown);
  if (copyTimer) clearTimeout(copyTimer);
  if (downloadTimer) clearTimeout(downloadTimer);
});
</script>

<template>
  <div class="beautify-editor">

    <!-- 左侧：预览区 -->
    <div class="preview-area">
      <div class="preview-canvas" :style="previewContainerStyle">
        <img
          :src="props.src"
          :style="imageStyle"
          class="preview-image"
          @load="onImageLoad"
          draggable="false"
        />
      </div>
      <!-- 尺寸提示（显示导出尺寸） -->
      <div v-if="imageLoaded" class="size-badge">
        {{ exportWidth }} × {{ exportHeight }}
      </div>
    </div>

    <!-- 右侧：操作面板 -->
    <aside class="control-panel">
      <!-- 顶部标题栏 -->
      <div class="panel-header">
        <div class="panel-title-row">
          <!-- 星形图标 -->
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="title-icon"><path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z"/></svg>
          <h2 class="panel-title">{{ t('beautify_title') }}</h2>
        </div>
        <button class="close-btn" @click="emit('close')" :title="t('btn_close')">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <!-- 分割线 -->
      <div class="divider" />

      <!-- 控制项列表 -->
      <div class="control-list">

        <!-- 背景 -->
        <div class="control-item">
          <label class="control-label">{{ t('beautify_background') }}</label>
          <div class="bg-grid">
            <button
              v-for="(bg, index) in bgPresets"
              :key="index"
              class="bg-swatch"
              :class="{ active: selectedBg === index }"
              :style="{ background: bg.gradient }"
              :title="t(bg.nameKey)"
              @click="selectedBg = index"
            />
          </div>
        </div>

        <!-- 背景圆角 -->
        <div class="control-item">
          <label class="control-label">
            {{ t('beautify_bg_border_radius') }}
            <div class="control-label-actions">
              <span v-if="bgBorderRadiusEnabled" class="control-value">{{ bgBorderRadius }}px</span>
              <button
                class="toggle-btn"
                :class="{ active: bgBorderRadiusEnabled }"
                @click="bgBorderRadiusEnabled = !bgBorderRadiusEnabled"
                :title="bgBorderRadiusEnabled ? t('beautify_toggle_off') : t('beautify_toggle_on')"
              >
                <span class="toggle-track">
                  <span class="toggle-thumb" />
                </span>
              </button>
            </div>
          </label>
          <input
            v-if="bgBorderRadiusEnabled"
            type="range" min="0" max="48" step="1"
            v-model.number="bgBorderRadius"
            class="slider"
          />
        </div>

        <!-- 圆角 -->
        <div class="control-item">
          <label class="control-label">
            {{ t('beautify_border_radius') }}
            <span class="control-value">{{ borderRadius }}px</span>
          </label>
          <input type="range" min="0" max="32" step="1" v-model.number="borderRadius" class="slider" />
        </div>

        <!-- 内边距 -->
        <div class="control-item">
          <label class="control-label">
            {{ t('beautify_padding') }}
            <span class="control-value">{{ padding }}px</span>
          </label>
          <input type="range" min="16" max="96" step="4" v-model.number="padding" class="slider" />
        </div>

        <!-- 阴影 -->
        <div class="control-item">
          <label class="control-label">{{ t('beautify_shadow') }}</label>
          <div class="shadow-options">
            <button
              v-for="(key, index) in shadowLabelKeys"
              :key="index"
              class="shadow-btn"
              :class="{ active: shadowLevel === index }"
              @click="shadowLevel = index"
            >
              {{ t(key) }}
            </button>
          </div>
        </div>

      </div>

      <!-- 底部操作按钮 -->
      <div class="panel-footer">
        <button
          class="action-btn action-copy"
          :class="{ 'is-success': copyStatus === 'success', 'is-error': copyStatus === 'error' }"
          @click="copyToClipboard"
        >
          <!-- 图标 -->
          <svg v-if="copyStatus === 'idle'" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          <svg v-else-if="copyStatus === 'success'" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          <span v-if="copyStatus === 'idle'">{{ t('beautify_copy') }}</span>
          <span v-else-if="copyStatus === 'success'">{{ t('beautify_copied') }}</span>
          <span v-else>{{ t('beautify_failed') }}</span>
        </button>

        <button
          class="action-btn action-download"
          :class="{ 'is-success': downloadStatus === 'success', 'is-error': downloadStatus === 'error' }"
          @click="downloadPng"
        >
          <svg v-if="downloadStatus === 'idle'" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <svg v-else-if="downloadStatus === 'success'" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          <span v-if="downloadStatus === 'idle'">{{ t('beautify_download') }}</span>
          <span v-else-if="downloadStatus === 'success'">{{ t('beautify_downloaded') }}</span>
          <span v-else>{{ t('beautify_failed') }}</span>
        </button>
      </div>
    </aside>

  </div>
</template>

<style scoped>
/* ========== 整体布局 ========== */
.beautify-editor {
  display: flex;
  width: 100vw;
  height: 100vh;
  background: #0d0d0f;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

/* ========== 左侧预览区 ========== */
.preview-area {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background:
    radial-gradient(ellipse at 30% 30%, rgba(102, 126, 234, 0.08) 0%, transparent 60%),
    radial-gradient(ellipse at 70% 70%, rgba(118, 75, 162, 0.06) 0%, transparent 60%),
    #0d0d0f;
  /* 棋盘格纹理，便于观察透明区域 */
  background-image:
    radial-gradient(ellipse at 30% 30%, rgba(102, 126, 234, 0.08) 0%, transparent 60%),
    radial-gradient(ellipse at 70% 70%, rgba(118, 75, 162, 0.06) 0%, transparent 60%),
    repeating-conic-gradient(rgba(255,255,255,0.03) 0% 25%, transparent 0% 50%);
  background-size: 100% 100%, 100% 100%, 24px 24px;
  overflow: hidden;
}

.preview-canvas {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: padding 0.3s ease, background 0.3s ease, border-radius 0.3s ease;
  max-width: calc(100% - 64px);
  max-height: calc(100% - 64px);
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.6);
}

.preview-image {
  max-width: min(800px, calc(100vw - 400px));
  max-height: calc(100vh - 96px);
  object-fit: contain;
  display: block;
  transition: border-radius 0.3s ease, box-shadow 0.3s ease;
}

.size-badge {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  border-radius: 20px;
  padding: 4px 14px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 0.5px;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}

/* ========== 右侧操作面板 ========== */
.control-panel {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #17171a;
  border-left: 1px solid rgba(255, 255, 255, 0.07);
  overflow: hidden;
}

/* 顶部标题栏 */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 16px;
  flex-shrink: 0;
}

.panel-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  color: #a78bfa;
  flex-shrink: 0;
}

.panel-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  letter-spacing: -0.2px;
}

.close-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.2);
}

.divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
  margin: 0;
}

/* 控制项列表 */
.control-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.control-list::-webkit-scrollbar { width: 4px; }
.control-list::-webkit-scrollbar-track { background: transparent; }
.control-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

.control-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.control-label {
  font-size: 11.5px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.45);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.control-value {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  font-variant-numeric: tabular-nums;
}

/* label 右侧操作区域 */
.control-label-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Toggle 开关 */
.toggle-btn {
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  outline: none;
}

.toggle-track {
  display: flex;
  align-items: center;
  width: 32px;
  height: 18px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.12);
  padding: 2px;
  transition: background 0.2s ease;
}

.toggle-btn.active .toggle-track {
  background: rgba(167, 139, 250, 0.6);
}

.toggle-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transition: all 0.2s ease;
}

.toggle-btn.active .toggle-thumb {
  transform: translateX(14px);
  background: #fff;
}

/* 背景色块 */
.bg-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.bg-swatch {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.18s;
  padding: 0;
  outline: none;
}

.bg-swatch:hover { transform: scale(1.08); }

.bg-swatch.active {
  border-color: #fff;
  box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.5);
}

/* 滑块 */
.slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.1);
  outline: none;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.4);
  transition: transform 0.15s;
}

.slider::-webkit-slider-thumb:hover { transform: scale(1.2); }

.slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: none;
  background: #fff;
  cursor: pointer;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.4);
}

/* 阴影选择 */
.shadow-options {
  display: flex;
  gap: 6px;
}

.shadow-btn {
  flex: 1;
  padding: 7px 0;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}

.shadow-btn:hover {
  background: rgba(255, 255, 255, 0.09);
  color: #fff;
}

.shadow-btn.active {
  background: rgba(167, 139, 250, 0.2);
  border-color: rgba(167, 139, 250, 0.6);
  color: #c4b5fd;
}

/* ========== 底部操作按钮 ========== */
.panel-footer {
  flex-shrink: 0;
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.action-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 11px 0;
  border-radius: 10px;
  border: none;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  letter-spacing: 0.1px;
}

.action-copy {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.action-copy:hover {
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
}

.action-download {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
}

.action-download:hover {
  opacity: 0.9;
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  transform: translateY(-1px);
}

.action-btn.is-success {
  background: rgba(74, 222, 128, 0.2) !important;
  color: #4ade80 !important;
  border-color: rgba(74, 222, 128, 0.3) !important;
  box-shadow: none !important;
  transform: none !important;
  animation: pop 0.3s ease;
}

.action-btn.is-error {
  background: rgba(248, 113, 113, 0.2) !important;
  color: #f87171 !important;
  border-color: rgba(248, 113, 113, 0.3) !important;
  box-shadow: none !important;
  transform: none !important;
  animation: shake 0.4s ease;
}

@keyframes pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.03); }
  100% { transform: scale(1); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}
</style>
