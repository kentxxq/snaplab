<script setup lang="ts">
import { ref, onMounted } from 'vue';
import ExifReader from 'exifreader';

const props = defineProps<{
  src: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

// 状态：loading / loaded / empty / error
const status = ref<'loading' | 'loaded' | 'empty' | 'error'>('loading');
const errorMsg = ref('');

// EXIF 展示数据
interface ExifItem {
  label: string;
  value: string;
}
const exifItems = ref<ExifItem[]>([]);

// 从 ExifReader 标签中提取可读值
function getTagValue(tags: Record<string, any>, key: string): string | null {
  const tag = tags[key];
  if (!tag) return null;
  // ExifReader 解析后的值一般有 description 属性
  if (tag.description !== undefined && tag.description !== '') {
    return String(tag.description);
  }
  if (tag.value !== undefined) {
    return String(tag.value);
  }
  return null;
}

// 要展示的 EXIF 字段映射
const EXIF_FIELDS: { key: string; label: string }[] = [
  { key: 'Make', label: '相机品牌' },
  { key: 'Model', label: '相机型号' },
  { key: 'LensModel', label: '镜头型号' },
  { key: 'FocalLength', label: '焦距' },
  { key: 'FNumber', label: '光圈' },
  { key: 'ExposureTime', label: '快门速度' },
  { key: 'ISOSpeedRatings', label: 'ISO' },
  { key: 'ExposureBiasValue', label: '曝光补偿' },
  { key: 'MeteringMode', label: '测光模式' },
  { key: 'Flash', label: '闪光灯' },
  { key: 'WhiteBalance', label: '白平衡' },
  { key: 'DateTimeOriginal', label: '拍摄时间' },
  { key: 'DateTime', label: '修改时间' },
  { key: 'ImageWidth', label: '宽度 (px)' },
  { key: 'ImageHeight', label: '高度 (px)' },
  { key: 'XResolution', label: '水平分辨率' },
  { key: 'YResolution', label: '垂直分辨率' },
  { key: 'ColorSpace', label: '色彩空间' },
  { key: 'Software', label: '软件' },
  { key: 'Copyright', label: '版权' },
  { key: 'Artist', label: '作者' },
  { key: 'GPSLatitude', label: 'GPS 纬度' },
  { key: 'GPSLongitude', label: 'GPS 经度' },
  { key: 'GPSAltitude', label: 'GPS 海拔' },
];

async function loadExif() {
  status.value = 'loading';
  try {
    // fetch 图片二进制数据
    const response = await fetch(props.src);
    const arrayBuffer = await response.arrayBuffer();

    console.log('[SnapLab EXIF] 图片 URL:', props.src);
    console.log('[SnapLab EXIF] 数据大小:', arrayBuffer.byteLength, 'bytes');

    // 使用 ExifReader 解析（expanded 模式，按分组返回 exif/gps/file 等）
    const expandedTags = ExifReader.load(arrayBuffer, { expanded: true });
    console.log('[SnapLab EXIF] expanded 模式解析结果（完整）:', expandedTags);

    // 分别打印各个分组
    if (expandedTags.exif) {
      console.log('[SnapLab EXIF] exif 分组:', expandedTags.exif);
    }
    if (expandedTags.gps) {
      console.log('[SnapLab EXIF] gps 分组:', expandedTags.gps);
    }
    if (expandedTags.file) {
      console.log('[SnapLab EXIF] file 分组:', expandedTags.file);
    }
    if (expandedTags.iptc) {
      console.log('[SnapLab EXIF] iptc 分组:', expandedTags.iptc);
    }
    if (expandedTags.xmp) {
      console.log('[SnapLab EXIF] xmp 分组:', expandedTags.xmp);
    }
    if (expandedTags.icc) {
      console.log('[SnapLab EXIF] icc 分组:', expandedTags.icc);
    }

    // 同时用非 expanded 模式解析，用于字段提取（flat 结构更方便）
    const tags = ExifReader.load(arrayBuffer, { expanded: false });
    console.log('[SnapLab EXIF] flat 模式解析结果（完整）:', tags);

    // 打印所有 key
    console.log('[SnapLab EXIF] flat 模式所有 key:', Object.keys(tags));

    // 提取有值的字段
    const items: ExifItem[] = [];
    for (const field of EXIF_FIELDS) {
      const value = getTagValue(tags, field.key);
      if (value) {
        items.push({ label: field.label, value });
      }
    }

    if (items.length === 0) {
      status.value = 'empty';
    } else {
      exifItems.value = items;
      status.value = 'loaded';
    }
  } catch (err: any) {
    console.error('[SnapLab EXIF] 解析失败:', err);
    errorMsg.value = err?.message || '读取 EXIF 信息失败';
    status.value = 'error';
  }
}

onMounted(() => {
  loadExif();
});
</script>

<template>
  <div class="exif-panel" @click.stop>
    <!-- 面板头部 -->
    <div class="exif-header">
      <span class="exif-title">EXIF 信息</span>
      <button class="exif-close-btn" @click="emit('close')" title="关闭">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <!-- 加载中 -->
    <div v-if="status === 'loading'" class="exif-status">
      <span class="exif-spinner"></span>
      <span>读取中…</span>
    </div>

    <!-- 无 EXIF 数据 -->
    <div v-else-if="status === 'empty'" class="exif-status">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.5;">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span>此图片不包含 EXIF 数据</span>
    </div>

    <!-- 加载失败 -->
    <div v-else-if="status === 'error'" class="exif-status exif-error">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.6;">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
      <span>{{ errorMsg }}</span>
    </div>

    <!-- EXIF 数据列表 -->
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
  position: absolute;
  top: 16px;
  left: 16px;
  width: 280px;
  max-height: calc(100vh - 32px);
  border-radius: 12px;
  background: rgba(30, 30, 30, 0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  color: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: exif-slide-in 0.2s ease;
  z-index: 10;
}

@keyframes exif-slide-in {
  from {
    opacity: 0;
    transform: translateX(-12px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.exif-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.exif-title {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.exif-close-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.exif-close-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.exif-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 16px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  text-align: center;
}

.exif-error {
  color: rgba(255, 120, 120, 0.8);
}

.exif-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-top-color: rgba(255, 255, 255, 0.7);
  border-radius: 50%;
  animation: exif-spin 0.7s linear infinite;
}

@keyframes exif-spin {
  to {
    transform: rotate(360deg);
  }
}

.exif-list {
  overflow-y: auto;
  padding: 6px 0;
  flex: 1;
}

/* 自定义滚动条 */
.exif-list::-webkit-scrollbar {
  width: 4px;
}
.exif-list::-webkit-scrollbar-track {
  background: transparent;
}
.exif-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
}
.exif-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.exif-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 6px 14px;
  gap: 12px;
  transition: background 0.12s;
}
.exif-row:hover {
  background: rgba(255, 255, 255, 0.05);
}

.exif-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
  white-space: nowrap;
}

.exif-value {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.88);
  text-align: right;
  word-break: break-all;
}
</style>
