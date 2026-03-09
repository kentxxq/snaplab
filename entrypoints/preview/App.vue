<script setup lang="ts">
import { ref, onMounted } from 'vue';
import ImagePreview from '@/components/ImagePreview.vue';
import ImageBeautify from '@/components/ImageBeautify.vue';
import { initLanguage, t } from '@/utils/i18n';

const imageUrl = ref<string | null>(null);
const showPreview = ref(false);
const showBeautify = ref(false);
const beautifyEnabled = ref(true);

onMounted(async () => {
  await initLanguage();
  document.title = t('preview_page_title');

  const result = await browser.storage.local.get(['previewImageDataUrl', 'beautifyEnabled']);
  if (result.previewImageDataUrl) {
    imageUrl.value = result.previewImageDataUrl as string;
    showPreview.value = true;
    await browser.storage.local.remove('previewImageDataUrl');
  }
  if (typeof result.beautifyEnabled === 'boolean') {
    beautifyEnabled.value = result.beautifyEnabled;
  }
});

function closePreview() { showPreview.value = false; }
function openBeautify() { showPreview.value = false; showBeautify.value = true; }
function closeBeautify() { showBeautify.value = false; }
</script>

<template>
  <div class="preview-page">
    <div v-if="!imageUrl" class="no-image">
      <p>{{ t('preview_no_image') }}</p>
    </div>
    <ImagePreview v-if="showPreview && imageUrl" :src="imageUrl" :beautifyEnabled="beautifyEnabled" @close="closePreview" @beautify="openBeautify" />
    <ImageBeautify v-if="showBeautify && imageUrl" :src="imageUrl" @close="closeBeautify" />
  </div>
</template>

<style scoped>
.preview-page { width: 100vw; height: 100vh; margin: 0; padding: 0; background: #000; }
.no-image {
  display: flex; align-items: center; justify-content: center;
  width: 100%; height: 100%; color: rgba(255, 255, 255, 0.5);
  font-size: 16px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
</style>
