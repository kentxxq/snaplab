<script setup lang="ts">
export interface ToolbarAction {
  id: string;
  icon: string; // SVG 字符串
  title: string;
}

const props = defineProps<{
  actions: ToolbarAction[];
  visible: boolean;
  x: number; // 工具栏中心 X（fixed 定位）
  y: number; // 工具栏底边 Y（fixed 定位，图片上方）
}>();

const emit = defineEmits<{
  action: [actionId: string];
}>();
</script>

<template>
  <div
    v-if="visible"
    class="snaplab-hover-toolbar"
    :style="{
      left: props.x + 'px',
      top: props.y + 'px',
    }"
  >
    <button
      v-for="action in props.actions"
      :key="action.id"
      class="snaplab-hover-btn"
      :title="action.title"
      @click.stop.prevent="emit('action', action.id)"
      v-html="action.icon"
    />
  </div>
</template>

<style scoped>
.snaplab-hover-toolbar {
  position: fixed;
  transform: translate(-50%, -100%);
  display: flex;
  align-items: center;
  gap: 0;
  padding: 2px;
  border-radius: 6px;
  background: rgba(30, 30, 30, 0.82);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.3);
  z-index: 2147483646;
  pointer-events: auto;
  animation: snaplab-toolbar-fadein 0.15s ease;
}

@keyframes snaplab-toolbar-fadein {
  from {
    opacity: 0;
    transform: translate(-50%, -90%);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -100%);
  }
}

.snaplab-hover-btn {
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: rgba(255, 255, 255, 0.82);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  padding: 0;
}

.snaplab-hover-btn:hover {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  transform: scale(1.1);
}

.snaplab-hover-btn :deep(svg) {
  width: 14px;
  height: 14px;
}
</style>
