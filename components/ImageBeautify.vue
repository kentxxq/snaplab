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
}));

const imageLoaded = ref(false);
const naturalWidth = ref(0);
const naturalHeight = ref(0);

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
function handleOverlayClick(e: MouseEvent) {
  if (e.target === e.currentTarget) emit('close');
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
  <div class="beautify-overlay" @click="handleOverlayClick">
    <button class="beautify-close-btn" @click="emit('close')" :title="t('btn_close')">✕</button>

    <div class="beautify-layout" @click.stop>
      <div class="beautify-preview-area">
        <div class="beautify-preview-wrapper" :style="previewContainerStyle">
          <img :src="props.src" :style="imageStyle" class="beautify-preview-image" @load="onImageLoad" draggable="false" />
        </div>
      </div>

      <div class="beautify-panel">
        <h3 class="panel-title">{{ t('beautify_title') }}</h3>

        <div class="panel-section">
          <label class="panel-label">{{ t('beautify_background') }}</label>
          <div class="bg-grid">
            <button v-for="(bg, index) in bgPresets" :key="index" class="bg-swatch" :class="{ active: selectedBg === index }" :style="{ background: bg.gradient }" :title="t(bg.nameKey)" @click="selectedBg = index" />
          </div>
        </div>

        <div class="panel-section">
          <label class="panel-label">
            {{ t('beautify_border_radius') }}
            <span class="panel-value">{{ borderRadius }}px</span>
          </label>
          <input type="range" min="0" max="32" step="1" v-model.number="borderRadius" class="panel-slider" />
        </div>

        <div class="panel-section">
          <label class="panel-label">
            {{ t('beautify_padding') }}
            <span class="panel-value">{{ padding }}px</span>
          </label>
          <input type="range" min="16" max="96" step="4" v-model.number="padding" class="panel-slider" />
        </div>

        <div class="panel-section">
          <label class="panel-label">{{ t('beautify_shadow') }}</label>
          <div class="shadow-options">
            <button v-for="(key, index) in shadowLabelKeys" :key="index" class="shadow-btn" :class="{ active: shadowLevel === index }" @click="shadowLevel = index">
              {{ t(key) }}
            </button>
          </div>
        </div>

        <div class="panel-actions">
          <button class="action-btn action-copy" :class="{ 'action-success': copyStatus === 'success', 'action-error': copyStatus === 'error' }" @click="copyToClipboard">
            <svg v-if="copyStatus === 'idle'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <svg v-else-if="copyStatus === 'success'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            <span v-if="copyStatus === 'idle'">{{ t('beautify_copy') }}</span>
            <span v-else-if="copyStatus === 'success'">{{ t('beautify_copied') }}</span>
            <span v-else>{{ t('beautify_failed') }}</span>
          </button>
          <button class="action-btn action-download" :class="{ 'action-success': downloadStatus === 'success', 'action-error': downloadStatus === 'error' }" @click="downloadPng">
            <svg v-if="downloadStatus === 'idle'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <svg v-else-if="downloadStatus === 'success'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            <span v-if="downloadStatus === 'idle'">{{ t('beautify_download') }}</span>
            <span v-else-if="downloadStatus === 'success'">{{ t('beautify_downloaded') }}</span>
            <span v-else>{{ t('beautify_failed') }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.beautify-overlay {
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(0, 0, 0, 0.88); display: flex; align-items: center; justify-content: center;
  z-index: 2147483647; user-select: none;
}
.beautify-close-btn {
  position: absolute; top: 16px; right: 16px; width: 40px; height: 40px;
  border-radius: 50%; border: none; background: rgba(255, 255, 255, 0.15);
  color: #fff; font-size: 18px; cursor: pointer; display: flex;
  align-items: center; justify-content: center; transition: background 0.2s;
  backdrop-filter: blur(8px); z-index: 10;
}
.beautify-close-btn:hover { background: rgba(255, 255, 255, 0.3); }
.beautify-layout { display: flex; gap: 24px; max-width: 90vw; max-height: 90vh; align-items: center; }
.beautify-preview-area { flex: 1; display: flex; align-items: center; justify-content: center; min-width: 0; overflow: hidden; }
.beautify-preview-wrapper {
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 16px; transition: padding 0.3s ease, background 0.3s ease;
  max-width: 70vw; max-height: 80vh;
}
.beautify-preview-image {
  max-width: 60vw; max-height: 70vh; object-fit: contain; display: block;
  transition: border-radius 0.3s ease, box-shadow 0.3s ease;
}
.beautify-panel {
  width: 240px; flex-shrink: 0; background: rgba(30, 30, 30, 0.9);
  backdrop-filter: blur(16px); border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1); padding: 20px;
  display: flex; flex-direction: column; gap: 18px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
.panel-title {
  margin: 0; font-size: 16px; font-weight: 600; color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
.panel-section { display: flex; flex-direction: column; gap: 8px; }
.panel-label {
  font-size: 12px; font-weight: 500; color: rgba(255, 255, 255, 0.7);
  display: flex; justify-content: space-between; align-items: center;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
.panel-value { color: rgba(255, 255, 255, 0.5); font-size: 11px; font-variant-numeric: tabular-nums; }
.bg-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.bg-swatch {
  width: 100%; aspect-ratio: 1; border-radius: 8px; border: 2px solid transparent;
  cursor: pointer; transition: all 0.2s; padding: 0;
}
.bg-swatch:hover { transform: scale(1.1); }
.bg-swatch.active { border-color: #fff; box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.6); }
.panel-slider {
  -webkit-appearance: none; appearance: none; width: 100%; height: 4px;
  border-radius: 2px; background: rgba(255, 255, 255, 0.15); outline: none; cursor: pointer;
}
.panel-slider::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 50%;
  background: #fff; cursor: pointer; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3); transition: transform 0.15s;
}
.panel-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }
.panel-slider::-moz-range-thumb {
  width: 16px; height: 16px; border-radius: 50%; border: none;
  background: #fff; cursor: pointer; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}
.shadow-options { display: flex; gap: 4px; }
.shadow-btn {
  flex: 1; padding: 6px 0; border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12); background: transparent;
  color: rgba(255, 255, 255, 0.7); font-size: 12px; cursor: pointer;
  transition: all 0.15s;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
.shadow-btn:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
.shadow-btn.active { background: rgba(99, 102, 241, 0.5); border-color: rgba(99, 102, 241, 0.8); color: #fff; }
.panel-actions { display: flex; gap: 8px; margin-top: 4px; }
.action-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 10px 0; border-radius: 10px; border: none; font-size: 13px; font-weight: 500;
  cursor: pointer; transition: all 0.2s;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
.action-copy { background: rgba(255, 255, 255, 0.12); color: #fff; }
.action-copy:hover { background: rgba(255, 255, 255, 0.2); }
.action-download { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; }
.action-download:hover { opacity: 0.9; }
.action-btn.action-success { background: rgba(74, 222, 128, 0.35) !important; color: #4ade80 !important; animation: action-pop 0.3s ease; }
.action-btn.action-error { background: rgba(248, 113, 113, 0.35) !important; color: #f87171 !important; animation: action-shake 0.4s ease; }
@keyframes action-pop { 0% { transform: scale(1); } 50% { transform: scale(1.06); } 100% { transform: scale(1); } }
@keyframes action-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }
</style>
