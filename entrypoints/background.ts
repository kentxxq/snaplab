export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });

  // 监听来自 content script 的消息，代理 fetch 请求绕过 CORS 限制
  // (Listen for messages from content script, proxy fetch requests to bypass CORS)
  browser.runtime.onMessage.addListener((message: any, _sender, sendResponse) => {
    if (message?.type === 'snaplab:fetch-image-data') {
      const url = message.url as string;

      fetch(url)
        .then(async (response) => {
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          // 将 ArrayBuffer 转为 base64 传回 (convert ArrayBuffer to base64 for transfer)
          const uint8 = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < uint8.length; i++) {
            binary += String.fromCharCode(uint8[i]);
          }
          const base64 = btoa(binary);
          sendResponse({
            success: true,
            base64,
            mimeType: blob.type,
            size: blob.size,
          });
        })
        .catch((err) => {
          sendResponse({
            success: false,
            error: err?.message || 'fetch failed',
          });
        });

      // 返回 true 表示异步响应 (return true for async response)
      return true;
    }
  });
});
