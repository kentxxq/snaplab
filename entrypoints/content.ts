import { createApp, ref } from 'vue';
import ImagePreview from '@/components/ImagePreview.vue';
import '~/assets/main.css';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    // 拦截开关状态，默认开启
    let interceptEnabled = true;

    // 从 storage 读取初始状态
    const result = await browser.storage.local.get('interceptEnabled');
    if (typeof result.interceptEnabled === 'boolean') {
      interceptEnabled = result.interceptEnabled;
    }

    // 监听 storage 变化，实时同步开关状态
    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.interceptEnabled !== undefined) {
        interceptEnabled = changes.interceptEnabled.newValue as boolean;
      }
    });

    // 当前预览的图片 URL
    let currentImageUrl: string | null = null;
    let uiMounted = false;
    let ui: Awaited<ReturnType<typeof createShadowRootUi>> | null = null;

    /**
     * 从点击事件中提取图片 URL
     * 支持：直接点击 <img>、以及点击带有图片链接的 <a>
     */
    function getImageUrl(target: HTMLElement): string | null {
      // 1. 直接点击 <img>
      if (target.tagName === 'IMG') {
        return (target as HTMLImageElement).src || null;
      }

      // 2. 如果点击在 <a> 标签内部（或者就是 <a> 标签），且链接本身是指向图片文件的
      const anchor = target.closest('a');
      if (anchor) {
        const href = anchor.href;
        if (href && /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|avif)(\?.*)?$/i.test(href)) {
          return href;
        }
      }

      return null;
    }

    /**
     * 展示图片预览
     */
    async function showPreview(imageUrl: string) {
      currentImageUrl = imageUrl;

      if (ui) {
        // 已存在则先移除
        ui.remove();
        ui = null;
      }

      ui = await createShadowRootUi(ctx, {
        name: 'image-preview',
        position: 'overlay',
        zIndex: 2147483647,
        onMount(container) {
          // 创建挂载点
          const appRoot = document.createElement('div');
          container.append(appRoot);

          const app = createApp(ImagePreview, {
            src: imageUrl,
            onClose: () => {
              closePreview();
            },
          });
          app.mount(appRoot);
          return app;
        },
        onRemove(app) {
          app?.unmount();
        },
      });

      ui.mount();
      uiMounted = true;
    }

    /**
     * 关闭预览
     */
    function closePreview() {
      if (ui) {
        ui.remove();
        ui = null;
      }
      uiMounted = false;
      currentImageUrl = null;
    }

    // 在捕获阶段监听点击事件
    document.addEventListener(
      'click',
      (e: MouseEvent) => {
        // 开关关闭时不拦截
        if (!interceptEnabled) return;

        const target = e.target as HTMLElement;
        if (!target) return;

        // 如果预览层已打开，不处理
        if (uiMounted) return;

        const imageUrl = getImageUrl(target);
        if (imageUrl) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          showPreview(imageUrl);
        }
      },
      true, // 捕获阶段
    );
  },
});
