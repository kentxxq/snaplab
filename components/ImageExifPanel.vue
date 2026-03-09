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

// 状态：loading / loaded / empty / error
const status = ref<'loading' | 'loaded' | 'empty' | 'error'>('loading');
const errorMsg = ref('');

interface ExifItem {
  label: string;
  value: string;
}
const exifItems = ref<ExifItem[]>([]);

function getTagValue(tags: Record<string, any>, key: string): string | null {
  const tag = tags[key];
  if (!tag) return null;
  if (tag.description !== undefined && tag.description !== '') return String(tag.description);
  if (tag.value !== undefined) return String(tag.value);
  return null;
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
  { key: 'ImageWidth', labelKey: 'exif_width' },
  { key: 'ImageHeight', labelKey: 'exif_height' },
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

async function loadExif() {
  status.value = 'loading';
  try {
    const response = await fetch(props.src);
    const arrayBuffer = await response.arrayBuffer();

    const tags = ExifReader.load(arrayBuffer, { expanded: false });

    const items: ExifItem[] = [];
    for (const field of EXIF_FIELDS) {
      const value = getTagValue(tags, field.key);
      if (value) {
        items.push({ label: t(field.labelKey), value });
      }
    }

    if (items.length === 0) {
      status.value = 'empty';
    } else {
      exifItems.value = items;
      status.value = 'loaded';
    }
  } catch (err: any) {
    console.error('[SnapLab EXIF] Parse failed:', err);
    errorMsg.value = err?.message || t('exif_error');
    status.value = 'error';
  }
}

onMounted(async () => {
  await initLanguage();
  loadExif();
});
</script>

<template>
  <div class="exif-panel" @click.stop>
    <div class="exif-header">
      <span class="exif-title">{{ t('exif_title') }}</span>
      <button class="exif-close-btn" @click="emit('close')" :title="t('btn_close')">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <div v-if="status === 'loading'" class="exif-status">
      <span class="exif-spinner"></span>
      <span>{{ t('exif_loading') }}</span>
    </div>

    <div v-else-if="status === 'empty'" class="exif-status">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.5;">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span>{{ t('exif_empty') }}</span>
    </div>

    <div v-else-if="status === 'error'" class="exif-status exif-error">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.6;">
        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
      </svg>
      <span>{{ errorMsg }}</span>
    </div>

    <div v-else class="exif-list">
      <div v-for="item in exifItems" :key="item.label" class="exif-row">
        <span class="exif-label">{{ item.label }}</span>
        <span class="exif-value">{{ item.value }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.exif-panel {
  position: absolute; top: 16px; left: 16px; width: 280px;
  max-height: calc(100vh - 32px); border-radius: 12px;
  background: rgba(30, 30, 30, 0.88); backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4); color: rgba(255, 255, 255, 0.9);
  display: flex; flex-direction: column; overflow: hidden;
  animation: exif-slide-in 0.2s ease; z-index: 10;
}
@keyframes exif-slide-in {
  from { opacity: 0; transform: translateX(-12px); }
  to { opacity: 1; transform: translateX(0); }
}
.exif-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); flex-shrink: 0;
}
.exif-title { font-size: 13px; font-weight: 600; letter-spacing: 0.3px; }
.exif-close-btn {
  width: 24px; height: 24px; border: none; border-radius: 6px;
  background: transparent; color: rgba(255, 255, 255, 0.6);
  cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s;
}
.exif-close-btn:hover { background: rgba(255, 255, 255, 0.15); color: #fff; }
.exif-status {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 32px 16px; color: rgba(255, 255, 255, 0.5); font-size: 13px; text-align: center;
}
.exif-error { color: rgba(255, 120, 120, 0.8); }
.exif-spinner {
  width: 20px; height: 20px; border: 2px solid rgba(255, 255, 255, 0.15);
  border-top-color: rgba(255, 255, 255, 0.7); border-radius: 50%;
  animation: exif-spin 0.7s linear infinite;
}
@keyframes exif-spin { to { transform: rotate(360deg); } }
.exif-list { overflow-y: auto; padding: 6px 0; flex: 1; }
.exif-list::-webkit-scrollbar { width: 4px; }
.exif-list::-webkit-scrollbar-track { background: transparent; }
.exif-list::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 2px; }
.exif-list::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
.exif-row {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 6px 14px; gap: 12px; transition: background 0.12s;
}
.exif-row:hover { background: rgba(255, 255, 255, 0.05); }
.exif-label { font-size: 12px; color: rgba(255, 255, 255, 0.5); flex-shrink: 0; white-space: nowrap; }
.exif-value { font-size: 12px; color: rgba(255, 255, 255, 0.88); text-align: right; word-break: break-all; }
</style>
