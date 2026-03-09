/**
 * 站点特定的图片 URL 解析器 (Site-specific image URL resolvers)
 *
 * 可插拔架构：每个解析器处理特定站点的 URL 升级逻辑，
 * 将低分辨率预览图 URL 转换为高清原图 URL。
 * 后续新增站点只需添加新的 resolver 函数并注册到 resolvers 数组即可。
 */

/** 解析器接口：尝试升级 URL，不匹配则返回 null */
type ImageUrlResolver = (url: string) => string | null;

/**
 * Reddit 图片 URL 解析器
 * 将 preview.redd.it 转换为 i.redd.it 高清原图
 *
 * Reddit 新版 URL 格式：
 *   preview.redd.it/[描述文字]-v0-[图片ID].[ext]?width=...&s=...
 * i.redd.it 只接受裸 ID：
 *   i.redd.it/[图片ID].[ext]
 *
 * 示例:
 *   https://preview.redd.it/some-title-v0-abc123def.jpg?width=640&s=xxx
 *   -> https://i.redd.it/abc123def.jpg
 *
 *   https://preview.redd.it/oldformat123.png?width=640
 *   -> https://i.redd.it/oldformat123.png
 *
 * 注意：external-preview.redd.it 是外部图片代理，不做转换
 */
function redditResolver(url: string): string | null {
    try {
        const u = new URL(url);
        // 只处理 preview.redd.it，不处理 external-preview.redd.it
        if (u.hostname !== 'preview.redd.it') return null;

        // 提取文件名（不含路径前缀 /）
        const pathname = u.pathname; // e.g. "/some-title-v0-abc123.jpg"
        const filename = pathname.split('/').pop();
        if (!filename) return null;

        // 分离文件名和扩展名
        const dotIndex = filename.lastIndexOf('.');
        const ext = dotIndex > 0 ? filename.substring(dotIndex) : '';
        const nameWithoutExt = dotIndex > 0 ? filename.substring(0, dotIndex) : filename;

        // 提取真正的图片 ID：如果包含 -v0-，取其后的部分；否则用整个文件名
        const v0Index = nameWithoutExt.lastIndexOf('-v0-');
        const imageId = v0Index >= 0
            ? nameWithoutExt.substring(v0Index + 4) // "-v0-" 长度为 4
            : nameWithoutExt;

        return `https://i.redd.it/${imageId}${ext}`;
    } catch {
        // URL 解析失败，跳过
    }
    return null;
}

// ========== 注册所有解析器 ==========
// 后续新增站点只需在此数组添加新的 resolver
const resolvers: ImageUrlResolver[] = [
    redditResolver,
];

/**
 * 尝试将图片 URL 升级为最高清晰度版本。
 * 依次尝试所有注册的解析器，命中则返回升级后的 URL，
 * 否则返回原始 URL。
 */
export function upgradeImageUrl(url: string): string {
    for (const resolver of resolvers) {
        const upgraded = resolver(url);
        if (upgraded) return upgraded;
    }
    return url;
}
