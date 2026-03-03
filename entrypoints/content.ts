import { createApp } from 'vue';
import ImagePreview from '@/components/ImagePreview.vue';
import ImageHoverToolbar from '@/components/ImageHoverToolbar.vue';
import type { ToolbarAction } from '@/components/ImageHoverToolbar.vue';
import '~/assets/main.css';

// 放大镜 SVG 图标
const ICON_PREVIEW = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`;

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    // ========== 开关状态 ==========
    let interceptEnabled = true;

    const result = await browser.storage.local.get('interceptEnabled');
    if (typeof result.interceptEnabled === 'boolean') {
      interceptEnabled = result.interceptEnabled;
    }

    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.interceptEnabled !== undefined) {
        interceptEnabled = changes.interceptEnabled.newValue as boolean;
        if (!interceptEnabled) {
          hideToolbar();
        }
      }
    });

    // ========== 预览相关 ==========
    let uiMounted = false;
    let ui: Awaited<ReturnType<typeof createShadowRootUi>> | null = null;

    async function showPreview(imageUrl: string) {
      if (ui) {
        ui.remove();
        ui = null;
      }

      ui = await createShadowRootUi(ctx, {
        name: 'image-preview',
        position: 'overlay',
        zIndex: 2147483647,
        onMount(container) {
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

    function closePreview() {
      if (ui) {
        ui.remove();
        ui = null;
      }
      uiMounted = false;
    }

    // ========== 图片检测与 URL 提取 ==========

    function getImageUrl(img: HTMLImageElement): string | null {
      const src = img.src || img.currentSrc;
      if (src) return src;

      const anchor = img.closest('a');
      if (anchor) {
        const href = anchor.href;
        if (href && /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|avif)(\?.*)?$/i.test(href)) {
          return href;
        }
      }

      return null;
    }

    function findHoverableImage(el: HTMLElement): HTMLImageElement | null {
      if (el.tagName === 'IMG') {
        return isImageLargeEnough(el as HTMLImageElement) ? (el as HTMLImageElement) : null;
      }

      const innerImg = el.querySelector('img');
      if (innerImg && isImageLargeEnough(innerImg)) {
        return innerImg;
      }

      let parent = el.parentElement;
      let depth = 0;
      while (parent && depth < 3) {
        if (parent.tagName === 'IMG') {
          return isImageLargeEnough(parent as HTMLImageElement) ? (parent as HTMLImageElement) : null;
        }
        const parentImg = parent.querySelector('img');
        if (parentImg && isImageLargeEnough(parentImg)) {
          return parentImg;
        }
        parent = parent.parentElement;
        depth++;
      }

      return null;
    }

    function isImageLargeEnough(img: HTMLImageElement): boolean {
      const rect = img.getBoundingClientRect();
      return rect.width >= 50 && rect.height >= 50;
    }

    // ========== 悬浮工具栏 ==========

    let toolbarUi: Awaited<ReturnType<typeof createShadowRootUi>> | null = null;
    let currentHoverTarget: HTMLElement | null = null;
    let currentHoverImageUrl: string | null = null;
    // 代数计数器，防止异步竞争导致多个工具栏
    let toolbarGeneration = 0;

    // 默认工具栏动作
    const defaultActions: ToolbarAction[] = [
      {
        id: 'preview',
        icon: ICON_PREVIEW,
        title: '预览图片',
      },
    ];

    /**
     * 显示悬浮工具栏
     */
    async function showToolbar(target: HTMLElement, imageUrl: string) {
      // 如果已是同一目标，无需重新创建
      if (currentHoverTarget === target && toolbarUi) return;

      // 递增代数，使旧的异步创建失效
      const thisGeneration = ++toolbarGeneration;

      hideToolbar();

      currentHoverTarget = target;
      currentHoverImageUrl = imageUrl;

      const rect = target.getBoundingClientRect();
      const toolbarX = rect.left + rect.width / 2;
      const toolbarY = rect.top; // 紧贴图片上边缘

      const newUi = await createShadowRootUi(ctx, {
        name: 'image-hover-toolbar',
        position: 'overlay',
        zIndex: 2147483646,
        onMount(container) {
          const appRoot = document.createElement('div');
          container.append(appRoot);

          const app = createApp(ImageHoverToolbar, {
            actions: defaultActions,
            visible: true,
            x: toolbarX,
            y: toolbarY,
            onAction: (actionId: string) => {
              if (actionId === 'preview' && currentHoverImageUrl) {
                const urlToPreview = currentHoverImageUrl;
                hideToolbar();
                setTimeout(() => showPreview(urlToPreview), 50);
              }
            },
          });
          app.mount(appRoot);
          return app;
        },
        onRemove(app) {
          app?.unmount();
        },
      });

      // 异步完成后检查代数，不匹配则丢弃
      if (thisGeneration !== toolbarGeneration) {
        newUi.remove();
        return;
      }

      toolbarUi = newUi;
      toolbarUi.mount();
    }

    /**
     * 隐藏悬浮工具栏
     */
    function hideToolbar() {
      if (toolbarUi) {
        toolbarUi.remove();
        toolbarUi = null;
      }
      currentHoverTarget = null;
      currentHoverImageUrl = null;
    }

    /**
     * 计算点到矩形最近边的距离
     */
    function distanceToRect(x: number, y: number, rect: DOMRect): number {
      const dx = Math.max(rect.left - x, 0, x - rect.right);
      const dy = Math.max(rect.top - y, 0, y - rect.bottom);
      return Math.sqrt(dx * dx + dy * dy);
    }

    // ========== 事件监听 ==========

    // mouseover：hover 到新图片时，替换工具栏（旧的自动销毁）
    document.addEventListener('mouseover', (e: MouseEvent) => {
      if (!interceptEnabled) return;
      if (uiMounted) return;

      const target = e.target as HTMLElement;
      if (!target) return;

      const img = findHoverableImage(target);
      if (img) {
        const imageUrl = getImageUrl(img);
        if (imageUrl) {
          showToolbar(img, imageUrl);
        }
      }
    });

    // mousemove：鼠标远离图片超过 150px 时隐藏
    let lastMoveCheck = 0;
    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!currentHoverTarget || !toolbarUi) return;

      const now = Date.now();
      if (now - lastMoveCheck < 100) return; // 100ms 节流
      lastMoveCheck = now;

      const imgRect = currentHoverTarget.getBoundingClientRect();
      const dist = distanceToRect(e.clientX, e.clientY, imgRect);

      if (dist > 60) {
        hideToolbar();
      }
    });

    // scroll：页面滚动时隐藏（工具栏 fixed 定位会偏移）
    window.addEventListener('scroll', () => {
      if (toolbarUi) {
        hideToolbar();
      }
    }, { passive: true });
  },
});
