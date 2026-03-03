<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps<{
  src: string;
  beautifyEnabled?: boolean;
}>();

const emit = defineEmits<{
  close: [];
  beautify: [];
}>();

// 图片变换状态
const scale = ref(1);
const rotation = ref(0);
const flipX = ref(false);
const flipY = ref(false);
const translateX = ref(0);
const translateY = ref(0);

// 拖拽状态
const isDragging = ref(false);
const dragStartX = ref(0);
const dragStartY = ref(0);
const dragStartTranslateX = ref(0);
const dragStartTranslateY = ref(0);

// 组合 CSS transform
const imageTransform = computed(() => {
  const parts = [
    `translate(${translateX.value}px, ${translateY.value}px)`,
    `scale(${flipX.value ? -1 : 1}, ${flipY.value ? -1 : 1})`,
    `scale(${scale.value})`,
    `rotate(${rotation.value}deg)`,
  ];
  return parts.join(' ');
});

// 缩放
function zoomIn() {
  scale.value = Math.min(scale.value * 1.2, 10);
}
function zoomOut() {
  scale.value = Math.max(scale.value / 1.2, 0.1);
}

// 旋转
function rotateLeft() {
  rotation.value -= 90;
}
function rotateRight() {
  rotation.value += 90;
}

// 翻转
function toggleFlipX() {
  flipX.value = !flipX.value;
}
function toggleFlipY() {
  flipY.value = !flipY.value;
}

// 重置
function resetTransform() {
  scale.value = 1;
  rotation.value = 0;
  flipX.value = false;
  flipY.value = false;
  translateX.value = 0;
  translateY.value = 0;
}

// 滚轮缩放
function handleWheel(e: WheelEvent) {
  e.preventDefault();
  if (e.deltaY < 0) {
    zoomIn();
  } else {
    zoomOut();
  }
}

// 拖拽移动
function handleMouseDown(e: MouseEvent) {
  isDragging.value = true;
  dragStartX.value = e.clientX;
  dragStartY.value = e.clientY;
  dragStartTranslateX.value = translateX.value;
  dragStartTranslateY.value = translateY.value;
  e.preventDefault();
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging.value) return;
  translateX.value = dragStartTranslateX.value + (e.clientX - dragStartX.value);
  translateY.value = dragStartTranslateY.value + (e.clientY - dragStartY.value);
}

function handleMouseUp() {
  isDragging.value = false;
}

// ESC 关闭
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close');
  }
}

// 点击遮罩关闭（不点击图片或工具栏时）
function handleOverlayClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    emit('close');
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
});
</script>

<template>
  <div
    class="image-preview-overlay"
    @click="handleOverlayClick"
    @wheel.prevent="handleWheel"
  >
    <!-- 关闭按钮 -->
    <button class="close-btn" @click="emit('close')" title="关闭 (ESC)">
      ✕
    </button>

    <!-- 图片区域 -->
    <div class="image-container">
      <img
        :src="props.src"
        :style="{ transform: imageTransform, cursor: isDragging ? 'grabbing' : 'grab' }"
        class="preview-image"
        @mousedown="handleMouseDown"
        draggable="false"
      />
    </div>

    <!-- 工具栏 -->
    <div class="toolbar" @click.stop>
      <button class="tool-btn" @click="zoomIn" title="放大">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
      </button>
      <button class="tool-btn" @click="zoomOut" title="缩小">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
      </button>

      <span class="toolbar-divider"></span>

      <button class="tool-btn" @click="rotateLeft" title="逆时针旋转">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
      </button>
      <button class="tool-btn" @click="rotateRight" title="顺时针旋转">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
      </button>

      <span class="toolbar-divider"></span>

      <button class="tool-btn" :class="{ active: flipX }" @click="toggleFlipX" title="水平翻转">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 3 3 12 7 21"/><polyline points="17 3 21 12 17 21"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
      </button>
      <button class="tool-btn" :class="{ active: flipY }" @click="toggleFlipY" title="垂直翻转">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 7 12 3 21 7"/><polyline points="3 17 12 21 21 17"/><line x1="3" y1="12" x2="21" y2="12"/></svg>
      </button>

      <span class="toolbar-divider"></span>

      <button class="tool-btn" @click="resetTransform" title="重置">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
      </button>

      <template v-if="props.beautifyEnabled">
        <span class="toolbar-divider"></span>
        <button class="tool-btn" @click="emit('beautify')" title="美化图片">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z"/></svg>
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.image-preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2147483647;
  user-select: none;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  backdrop-filter: blur(8px);
}
.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.image-container {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  max-width: 90vw;
  max-height: 85vh;
}

.preview-image {
  max-width: 90vw;
  max-height: 80vh;
  object-fit: contain;
  transition: transform 0.15s ease;
  border-radius: 4px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.toolbar {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(30, 30, 30, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
}

.tool-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.tool-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}
.tool-btn.active {
  background: rgba(99, 102, 241, 0.5);
  color: #fff;
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.2);
  margin: 0 4px;
}
</style>
