import { defineConfig } from 'wxt';
import ui from '@nuxt/ui/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  outDir: 'dist',
  manifest: {
    name: '__MSG_extension_name__',
    description: '__MSG_extension_description__',
    default_locale: 'zh_CN',
    permissions: ['storage'],
    host_permissions: ['<all_urls>'],
    action: {
      default_title: '__MSG_extension_name__',
    },
  },
  modules: ['@wxt-dev/module-vue'],
  vite: () => ({
    plugins: [
      ui({
        // 浏览器插件不需要路由
        router: false,
      }),
    ],
  }),
});
