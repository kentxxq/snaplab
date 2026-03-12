<script setup lang="ts">
import { ref, onMounted } from 'vue';
import ImageBeautify from '@/components/ImageBeautify.vue';
import { initLanguage, t } from '@/utils/i18n';

const imageUrl = ref<string | null>(null);

function closePage() {
  window.close();
}

onMounted(async () => {
  await initLanguage();
  document.title = t('beautify_page_title');

  const result = await browser.storage.local.get(['beautifyImageUrl']);
  if (result.beautifyImageUrl) {
    imageUrl.value = result.beautifyImageUrl as string;
    // 读取后清除，避免下次打开时残留 (clear after read)
    await browser.storage.local.remove('beautifyImageUrl');
  }
});
</script>

<template>
  <div class="beautify-page">
    <div v-if="!imageUrl" class="no-image">
      <p>{{ t('beautify_no_image') }}</p>
    </div>
    <ImageBeautify v-if="imageUrl" :src="imageUrl" @close="closePage" />
  </div>
</template>

<style scoped>
.beautify-page { width: 100vw; height: 100vh; margin: 0; padding: 0; background: #000; }
.no-image {
  display: flex; align-items: center; justify-content: center;
  width: 100%; height: 100%; color: rgba(255, 255, 255, 0.5);
  font-size: 16px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
</style>
