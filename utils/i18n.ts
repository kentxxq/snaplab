/**
 * 自定义 i18n 工具 (Custom i18n utility)
 * Chrome browser.i18n.getMessage() 不支持运行时切换语言，
 * 因此实现自定义方案：内嵌翻译文本 + storage 存储用户偏好。
 */

// 支持的语言 (supported languages)
export type Language = 'zh_CN' | 'en';

// 翻译表 (translation messages)
const messages: Record<Language, Record<string, string>> = {
    zh_CN: {
        extension_name: 'SnapLab',
        extension_description: '网页助手插件，包含图片预览、缩放、旋转等图片处理相关功能。',
        popup_image_preview: '图片预览',
        popup_image_beautify: '图片美化',
        popup_click_to_close: '点击关闭',
        popup_click_to_open: '点击开启',
        popup_preview_on: '预览已开启 · 悬停图片显示操作菜单',
        popup_preview_off: '预览已关闭 · 图片交互恢复默认',
        popup_beautify_on: '美化已开启 · 可一键美化导出图片',
        popup_beautify_off: '美化已关闭 · 仅保留预览功能',
        popup_open_local_image: '📁 打开本地图片',
        popup_open_local_hint: '选择本地图片进行预览 / 美化 / EXIF 查看',
        toolbar_preview: '预览图片',
        toolbar_beautify: '美化图片',
        btn_close: '关闭 (ESC)',
        btn_zoom_in: '放大',
        btn_zoom_out: '缩小',
        btn_rotate_left: '逆时针旋转',
        btn_rotate_right: '顺时针旋转',
        btn_flip_x: '水平翻转',
        btn_flip_y: '垂直翻转',
        btn_reset: '重置',
        btn_exif: 'EXIF 信息',
        btn_beautify: '美化图片',
        beautify_title: '图片美化',
        beautify_background: '背景',
        beautify_border_radius: '圆角',
        beautify_padding: '内边距',
        beautify_shadow: '阴影',
        beautify_shadow_none: '无',
        beautify_shadow_small: '小',
        beautify_shadow_medium: '中',
        beautify_shadow_large: '大',
        beautify_copy: '复制',
        beautify_copied: '已复制',
        beautify_failed: '失败',
        beautify_download: '下载 PNG',
        beautify_downloaded: '已下载',
        beautify_bg_indigo: '靛蓝紫',
        beautify_bg_cyan_pink: '青粉',
        beautify_bg_warm_orange: '暖橙',
        beautify_bg_deep_blue: '深海蓝',
        beautify_bg_sunset: '日落',
        beautify_bg_forest: '森林',
        beautify_bg_profound: '深邃',
        beautify_bg_dark_night: '暗夜',
        beautify_image_load_error: '图片加载失败',
        exif_title: 'EXIF 信息',
        exif_loading: '读取中…',
        exif_empty: '此图片不包含 EXIF 数据',
        exif_error: '读取 EXIF 信息失败',
        exif_make: '相机品牌',
        exif_model: '相机型号',
        exif_lens: '镜头型号',
        exif_focal_length: '焦距',
        exif_fnumber: '光圈',
        exif_exposure_time: '快门速度',
        exif_iso: 'ISO',
        exif_exposure_bias: '曝光补偿',
        exif_metering_mode: '测光模式',
        exif_flash: '闪光灯',
        exif_white_balance: '白平衡',
        exif_date_original: '拍摄时间',
        exif_date_modified: '修改时间',
        exif_width: '宽度 (px)',
        exif_height: '高度 (px)',
        exif_x_resolution: '水平分辨率',
        exif_y_resolution: '垂直分辨率',
        exif_color_space: '色彩空间',
        exif_software: '软件',
        exif_copyright: '版权',
        exif_artist: '作者',
        exif_gps_lat: 'GPS 纬度',
        exif_gps_lng: 'GPS 经度',
        exif_gps_alt: 'GPS 海拔',
        preview_page_title: 'SnapLab - 图片预览',
        preview_no_image: '没有可预览的图片',
        lang_label: '语言',
    },
    en: {
        extension_name: 'SnapLab',
        extension_description: 'A web assistant plugin including image preview, zoom, rotate, and other image processing related functions.',
        popup_image_preview: 'Image Preview',
        popup_image_beautify: 'Image Beautify',
        popup_click_to_close: 'Click to disable',
        popup_click_to_open: 'Click to enable',
        popup_preview_on: 'Preview enabled · Hover over images to show actions',
        popup_preview_off: 'Preview disabled · Default image interaction restored',
        popup_beautify_on: 'Beautify enabled · One-click beautify and export',
        popup_beautify_off: 'Beautify disabled · Preview only',
        popup_open_local_image: '📁 Open Local Image',
        popup_open_local_hint: 'Select a local image for preview / beautify / EXIF viewing',
        toolbar_preview: 'Preview Image',
        toolbar_beautify: 'Beautify Image',
        btn_close: 'Close (ESC)',
        btn_zoom_in: 'Zoom In',
        btn_zoom_out: 'Zoom Out',
        btn_rotate_left: 'Rotate Left',
        btn_rotate_right: 'Rotate Right',
        btn_flip_x: 'Flip Horizontal',
        btn_flip_y: 'Flip Vertical',
        btn_reset: 'Reset',
        btn_exif: 'EXIF Info',
        btn_beautify: 'Beautify Image',
        beautify_title: 'Image Beautify',
        beautify_background: 'Background',
        beautify_border_radius: 'Border Radius',
        beautify_padding: 'Padding',
        beautify_shadow: 'Shadow',
        beautify_shadow_none: 'None',
        beautify_shadow_small: 'S',
        beautify_shadow_medium: 'M',
        beautify_shadow_large: 'L',
        beautify_copy: 'Copy',
        beautify_copied: 'Copied',
        beautify_failed: 'Failed',
        beautify_download: 'Download PNG',
        beautify_downloaded: 'Downloaded',
        beautify_bg_indigo: 'Indigo Purple',
        beautify_bg_cyan_pink: 'Cyan Pink',
        beautify_bg_warm_orange: 'Warm Orange',
        beautify_bg_deep_blue: 'Deep Blue',
        beautify_bg_sunset: 'Sunset',
        beautify_bg_forest: 'Forest',
        beautify_bg_profound: 'Profound',
        beautify_bg_dark_night: 'Dark Night',
        beautify_image_load_error: 'Image loading failed',
        exif_title: 'EXIF Info',
        exif_loading: 'Loading…',
        exif_empty: 'This image contains no EXIF data',
        exif_error: 'Failed to read EXIF info',
        exif_make: 'Camera Make',
        exif_model: 'Camera Model',
        exif_lens: 'Lens Model',
        exif_focal_length: 'Focal Length',
        exif_fnumber: 'Aperture',
        exif_exposure_time: 'Shutter Speed',
        exif_iso: 'ISO',
        exif_exposure_bias: 'Exposure Bias',
        exif_metering_mode: 'Metering Mode',
        exif_flash: 'Flash',
        exif_white_balance: 'White Balance',
        exif_date_original: 'Date Taken',
        exif_date_modified: 'Date Modified',
        exif_width: 'Width (px)',
        exif_height: 'Height (px)',
        exif_x_resolution: 'Horizontal Resolution',
        exif_y_resolution: 'Vertical Resolution',
        exif_color_space: 'Color Space',
        exif_software: 'Software',
        exif_copyright: 'Copyright',
        exif_artist: 'Artist',
        exif_gps_lat: 'GPS Latitude',
        exif_gps_lng: 'GPS Longitude',
        exif_gps_alt: 'GPS Altitude',
        preview_page_title: 'SnapLab - Image Preview',
        preview_no_image: 'No image to preview',
        lang_label: 'Language',
    },
};

// 当前语言（默认中文）(current language, default Chinese)
let currentLang: Language = 'zh_CN';

/**
 * 初始化语言设置，从 storage 读取用户偏好
 * (Initialize language from storage)
 */
export async function initLanguage(): Promise<Language> {
    try {
        const result = await browser.storage.local.get('language');
        if (result.language && (result.language === 'zh_CN' || result.language === 'en')) {
            currentLang = result.language as Language;
        }
    } catch {
        // storage 不可用时使用默认值
    }
    return currentLang;
}

/**
 * 同步获取翻译文本 (synchronously get translated text)
 */
export function t(key: string): string {
    return messages[currentLang]?.[key] || messages['zh_CN']?.[key] || key;
}

/**
 * 获取当前语言 (get current language)
 */
export function getLanguage(): Language {
    return currentLang;
}

/**
 * 切换语言并保存到 storage (switch language and save to storage)
 */
export async function setLanguage(lang: Language): Promise<void> {
    currentLang = lang;
    await browser.storage.local.set({ language: lang });
}
