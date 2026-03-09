<script setup lang="ts">
import { ref, onMounted } from 'vue';
import ExifReader from 'exifreader';
import { initLanguage, t } from '@/utils/i18n';

const props = defineProps<{
  src: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

// 状态：loading / loaded / error (loading / loaded / error)
const status = ref<'loading' | 'loaded' | 'error'>('loading');
const errorMsg = ref('');

interface InfoItem {
  label: string;
  value: string;
  // 是否可选中复制 (whether selectable for copy)
  selectable?: boolean;
}

// 基本信息 (basic info)
const basicItems = ref<InfoItem[]>([]);
// EXIF 信息 (EXIF info)
const exifItems = ref<InfoItem[]>([]);

function getTagValue(tags: Record<string, any>, key: string): string | null {
  const tag = tags[key];
  if (!tag) return null;
  if (tag.description !== undefined && tag.description !== '') return String(tag.description);
  if (tag.value !== undefined) return String(tag.value);
  return null;
}

// 从 URL 推断图片格式 (infer image format from URL)
function inferFormat(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split('.').pop()?.toLowerCase();
    const formatMap: Record<string, string> = {
      jpg: 'JPEG', jpeg: 'JPEG', png: 'PNG', gif: 'GIF',
      webp: 'WebP', svg: 'SVG', bmp: 'BMP', ico: 'ICO',
      avif: 'AVIF', tiff: 'TIFF', tif: 'TIFF',
    };
    if (ext && formatMap[ext]) return formatMap[ext];
  } catch {
    // data URL 处理
    if (url.startsWith('data:image/')) {
      const mime = url.split(';')[0].split('/')[1];
      return mime?.toUpperCase() || t('info_unknown');
    }
  }
  return t('info_unknown');
}

// 格式化文件大小 (format file size)
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// EXIF 字段映射 (EXIF fields mapping)
const EXIF_FIELDS: { key: string; labelKey: string }[] = [
  { key: 'Make', labelKey: 'exif_make' },
  { key: 'Model', labelKey: 'exif_model' },
  { key: 'LensModel', labelKey: 'exif_lens' },
  { key: 'FocalLength', labelKey: 'exif_focal_length' },
  { key: 'FNumber', labelKey: 'exif_fnumber' },
  { key: 'ExposureTime', labelKey: 'exif_exposure_time' },
  { key: 'ISOSpeedRatings', labelKey: 'exif_iso' },
  { key: 'ExposureBiasValue', labelKey: 'exif_exposure_bias' },
  { key: 'MeteringMode', labelKey: 'exif_metering_mode' },
  { key: 'Flash', labelKey: 'exif_flash' },
  { key: 'WhiteBalance', labelKey: 'exif_white_balance' },
  { key: 'DateTimeOriginal', labelKey: 'exif_date_original' },
  { key: 'DateTime', labelKey: 'exif_date_modified' },
  { key: 'XResolution', labelKey: 'exif_x_resolution' },
  { key: 'YResolution', labelKey: 'exif_y_resolution' },
  { key: 'ColorSpace', labelKey: 'exif_color_space' },
  { key: 'Software', labelKey: 'exif_software' },
  { key: 'Copyright', labelKey: 'exif_copyright' },
  { key: 'Artist', labelKey: 'exif_artist' },
  { key: 'GPSLatitude', labelKey: 'exif_gps_lat' },
  { key: 'GPSLongitude', labelKey: 'exif_gps_lng' },
  { key: 'GPSAltitude', labelKey: 'exif_gps_alt' },
];

/**
 * 获取图片数据：优先直接 fetch，失败则通过 background script 代理
 * (Fetch image data: try direct fetch first, fallback to background proxy)
 */
async function fetchImageData(url: string): Promise<{ base64: string; mimeType: string; size: number } | null> {
  // 对 data URL 直接解析 (handle data URLs directly)
  if (url.startsWith('data:')) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      return { base64: btoa(binary), mimeType: blob.type, size: blob.size };
    } catch {
      return null;
    }
  }

  // 先尝试直接 fetch (try direct fetch first)
  try {
    const response = await fetch(url);
    if (response.ok) {
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      return { base64: btoa(binary), mimeType: blob.type, size: blob.size };
    }
  } catch {
    // 直接 fetch 失败，下面走 background 代理
  }

  // 通过 background script 代理获取，绕过 CORS 限制
  // (Proxy via background script to bypass CORS restrictions)
  try {
    const resp = await browser.runtime.sendMessage({
      type: 'snaplab:fetch-image-data',
      url,
    });
    if (resp?.success) {
      return { base64: resp.base64, mimeType: resp.mimeType, size: resp.size };
    }
  } catch {
    // background 代理也失败
  }

  return null;
}

async function loadInfo() {
  status.value = 'loading';
  try {
    const basics: InfoItem[] = [];

    // 1. 图片 URL (image URL)
    basics.push({ label: t('info_url'), value: props.src, selectable: true });

    // 2. 图片格式 (image format)
    basics.push({ label: t('info_format'), value: inferFormat(props.src) });

    // 3. 通过加载图片获取尺寸，不设置 crossOrigin 避免 CORS 失败
    // (Get dimensions without crossOrigin to avoid CORS failures)
    const img = new Image();
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve(); // 即使失败也继续，不中断整个流程
      img.src = props.src;
    });
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      basics.push({ label: t('info_dimensions'), value: `${img.naturalWidth} × ${img.naturalHeight} px` });
    }

    // 4. 获取文件数据（大小、MIME 类型、EXIF）
    // (Fetch file data: size, MIME type, EXIF)
    const imageData = await fetchImageData(props.src);
    if (imageData) {
      basics.push({ label: t('info_file_size'), value: formatSize(imageData.size) });

      if (imageData.mimeType) {
        basics.push({ label: t('info_mime_type'), value: imageData.mimeType });
      }

      // 解析 EXIF (parse EXIF)
      try {
        const binaryStr = atob(imageData.base64);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const tags = ExifReader.load(bytes.buffer, { expanded: false });
        const items: InfoItem[] = [];
        for (const field of EXIF_FIELDS) {
          const value = getTagValue(tags, field.key);
          if (value) {
            items.push({ label: t(field.labelKey), value });
          }
        }
        exifItems.value = items;
      } catch {
        exifItems.value = [];
      }
    }

    basicItems.value = basics;
    status.value = 'loaded';
  } catch (err: any) {
    console.error('[SnapLab Info] Load failed:', err);
    errorMsg.value = err?.message || t('info_error');
    status.value = 'error';
  }
}

// 复制 URL (copy URL)
const copied = ref(false);
async function copyUrl() {
  try {
    await navigator.clipboard.writeText(props.src);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 1500);
  } catch { /* 静默失败 */ }
}

onMounted(async () => {
  await initLanguage();
  loadInfo();
});
</script>

<template>
  <div class="info-panel" @click.stop>
    <div class="info-header">
      <span class="info-title">{{ t('info_title') }}</span>
      <button class="info-close-btn" @click="emit('close')" :title="t('btn_close')">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <!-- 加载中 (loading) -->
    <div v-if="status === 'loading'" class="info-status">
      <span class="info-spinner"></span>
      <span>{{ t('info_loading') }}</span>
    </div>

    <!-- 加载失败 (error) -->
    <div v-else-if="status === 'error'" class="info-status info-error">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.6;">
        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
      </svg>
      <span>{{ errorMsg }}</span>
    </div>

    <!-- 信息列表 (info list) -->
    <div v-else class="info-content">
      <!-- 基本信息分区 (basic info section) -->
      <div class="info-section">
        <div class="info-section-title">{{ t('info_basic_section') }}</div>
        <div v-for="item in basicItems" :key="item.label" class="info-row">
          <span class="info-label">{{ item.label }}</span>
          <span class="info-value" :class="{ 'info-url-value': item.selectable }">
            {{ item.value }}
            <button v-if="item.selectable" class="info-copy-btn" @click="copyUrl" :title="t('info_copy_url')">
              <svg v-if="!copied" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
          </span>
        </div>
      </div>

      <!-- EXIF 信息分区 (EXIF info section) -->
      <div v-if="exifItems.length > 0" class="info-section">
        <div class="info-section-title">{{ t('info_exif_section') }}</div>
        <div v-for="item in exifItems" :key="item.label" class="info-row">
          <span class="info-label">{{ item.label }}</span>
          <span class="info-value">{{ item.value }}</span>
        </div>
      </div>

      <!-- 无 EXIF 数据提示 (no EXIF data hint) -->
      <div v-else class="info-section">
        <div class="info-section-title">{{ t('info_exif_section') }}</div>
        <div class="info-empty-hint">{{ t('exif_empty') }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.info-panel {
  position: absolute; top: 16px; left: 16px; width: 300px;
  max-height: calc(100vh - 32px); border-radius: 12px;
  background: rgba(30, 30, 30, 0.88); backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4); color: rgba(255, 255, 255, 0.9);
  display: flex; flex-direction: column; overflow: hidden;
  animation: info-slide-in 0.2s ease; z-index: 10;
}
@keyframes info-slide-in {
  from { opacity: 0; transform: translateX(-12px); }
  to { opacity: 1; transform: translateX(0); }
}
.info-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); flex-shrink: 0;
}
.info-title { font-size: 13px; font-weight: 600; letter-spacing: 0.3px; }
.info-close-btn {
  width: 24px; height: 24px; border: none; border-radius: 6px;
  background: transparent; color: rgba(255, 255, 255, 0.6);
  cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s;
}
.info-close-btn:hover { background: rgba(255, 255, 255, 0.15); color: #fff; }
.info-status {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 32px 16px; color: rgba(255, 255, 255, 0.5); font-size: 13px; text-align: center;
}
.info-error { color: rgba(255, 120, 120, 0.8); }
.info-spinner {
  width: 20px; height: 20px; border: 2px solid rgba(255, 255, 255, 0.15);
  border-top-color: rgba(255, 255, 255, 0.7); border-radius: 50%;
  animation: info-spin 0.7s linear infinite;
}
@keyframes info-spin { to { transform: rotate(360deg); } }

.info-content { overflow-y: auto; flex: 1; }
.info-content::-webkit-scrollbar { width: 4px; }
.info-content::-webkit-scrollbar-track { background: transparent; }
.info-content::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 2px; }
.info-content::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }

.info-section { padding: 4px 0; }
.info-section + .info-section { border-top: 1px solid rgba(255, 255, 255, 0.08); }

.info-section-title {
  padding: 8px 14px 4px; font-size: 11px; font-weight: 600;
  color: rgba(255, 255, 255, 0.4); text-transform: uppercase; letter-spacing: 0.5px;
}

.info-row {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 5px 14px; gap: 12px; transition: background 0.12s;
}
.info-row:hover { background: rgba(255, 255, 255, 0.05); }
.info-label { font-size: 12px; color: rgba(255, 255, 255, 0.5); flex-shrink: 0; white-space: nowrap; }
.info-value { font-size: 12px; color: rgba(255, 255, 255, 0.88); text-align: right; word-break: break-all; }

.info-url-value {
  display: flex; align-items: flex-start; gap: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px; user-select: text; max-width: 180px;
  overflow: hidden; text-overflow: ellipsis;
  /* 最多显示 3 行 (show max 3 lines) */
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
}

.info-copy-btn {
  flex-shrink: 0; width: 20px; height: 20px; border: none; border-radius: 4px;
  background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.6);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
}
.info-copy-btn:hover { background: rgba(255, 255, 255, 0.2); color: #fff; }

.info-empty-hint {
  padding: 16px 14px; font-size: 12px; color: rgba(255, 255, 255, 0.35); text-align: center;
}
</style>
