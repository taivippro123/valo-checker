import axios from 'axios';
import crypto from 'crypto';
import sharp from 'sharp';
import { TtlLruCache, createSingleFlight, createLimiter } from '../utils/lruCache.js';

/* ------------------------------------------------------------------ *
 * Cấu hình chung
 * ------------------------------------------------------------------ */

export const SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://valocheck.vercel.app').replace(/\/$/, '');

// Font stack: DejaVu/Liberation gần như luôn có sẵn trên container Linux và
// phủ đủ dấu tiếng Việt. Cho phép override qua env nếu host có font riêng.
const FONT = process.env.SHOP_IMAGE_FONT_FAMILY
  || "'DejaVu Sans','Liberation Sans','Noto Sans',Arial,Helvetica,sans-serif";

// Chỉ cho phép tải ảnh từ CDN của Riot/valorant-api.
// Payload storefront do client gửi lên nên đây là chốt chặn SSRF bắt buộc.
const ALLOWED_IMAGE_HOSTS = new Set([
  'media.valorant-api.com',
  'valorant-api.com',
  'content.valorant-api.com'
]);

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const COLORS = {
  bgTop: '#101A24',
  bgBottom: '#070C11',
  card: '#16212C',
  cardEdge: '#243544',
  red: '#FF4655',
  cream: '#ECE8E1',
  gray: '#7E8C99',
  white: '#FFFFFF',
  gold: '#F5C24B'
};

// Màu theo content tier của Valorant, dùng làm viền nhấn cho từng card.
const TIER_COLORS = {
  select: '#5A9FE2',
  deluxe: '#009984',
  premium: '#D1548D',
  ultra: '#FFD663',
  exclusive: '#F09B0D'
};

const VARIANT_TITLES = {
  daily: { en: 'DAILY STORE', vn: 'SHOP HÀNG NGÀY' },
  'night-market': { en: 'NIGHT MARKET', vn: 'CHỢ ĐÊM' },
  bundle: { en: 'FEATURED BUNDLE', vn: 'BUNDLE NỔI BẬT' },
  accessory: { en: 'ACCESSORY STORE', vn: 'CỬA HÀNG PHỤ KIỆN' }
};

const FOOTER_TAGLINE = {
  en: 'Track your Valorant store daily',
  vn: 'Theo dõi shop Valorant mỗi ngày'
};

const WISHLIST_BADGE = { en: 'WISHLIST', vn: 'ĐANG SĂN' };

export const MAX_ITEMS = 12;

/* ------------------------------------------------------------------ *
 * Cache nhiều tầng
 * ------------------------------------------------------------------ */

const DAY_MS = 24 * 60 * 60 * 1000;
const MB = 1024 * 1024;

// Trần RAM cho toàn bộ cache ảnh (mặc định 128MB, chỉnh được cho VPS nhỏ).
const CACHE_BUDGET_MB = Number(process.env.SHOP_IMAGE_CACHE_MB || 128);

// Tầng 1: buffer gốc tải từ CDN (PNG nén, ~50-150KB/ảnh).
const rawImageCache = new TtlLruCache({
  max: 400,
  maxBytes: Math.round(CACHE_BUDGET_MB * 0.25) * MB,
  ttlMs: 7 * DAY_MS,
  name: 'rawImage',
  sizeOf: (buffer) => buffer?.length || 0
});

// Tầng 2: pixel RGBA đã resize sẵn -> bỏ qua bước resize tốn CPU nhất.
// Đây là tầng ngốn RAM nhất: một ô 456x238 RGBA đã ~424KB, nên bắt buộc chặn theo byte.
const cellCache = new TtlLruCache({
  max: 400,
  maxBytes: Math.round(CACHE_BUDGET_MB * 0.5) * MB,
  ttlMs: 3 * DAY_MS,
  name: 'cell',
  sizeOf: (cell) => cell?.data?.length || 0
});

// Tầng 3: ảnh thành phẩm theo hash nội dung -> user bấm share 10 lần chỉ render 1 lần.
const renderCache = new TtlLruCache({
  max: 200,
  maxBytes: Math.round(CACHE_BUDGET_MB * 0.25) * MB,
  ttlMs: 12 * 60 * 60 * 1000,
  name: 'render',
  sizeOf: (result) => result?.buffer?.length || 0
});

const imageSingleFlight = createSingleFlight();
const renderSingleFlight = createSingleFlight();
const fetchLimit = createLimiter(Number(process.env.SHOP_IMAGE_FETCH_CONCURRENCY || 6));

export const getImageCacheStats = () => [
  rawImageCache.stats(),
  cellCache.stats(),
  renderCache.stats()
];

/* ------------------------------------------------------------------ *
 * Tiện ích text / SVG
 * ------------------------------------------------------------------ */

const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

// Ước lượng bề rộng chữ. Không cần chính xác tuyệt đối, chỉ đủ để
// xuống dòng/cắt chuỗi mà không tràn card.
const textWidth = (value, fontSize, bold = false) =>
  String(value ?? '').length * fontSize * (bold ? 0.58 : 0.53);

const truncate = (value, maxWidth, fontSize, bold = false) => {
  const str = String(value ?? '');
  if (textWidth(str, fontSize, bold) <= maxWidth) return str;
  let cut = str;
  while (cut.length > 1 && textWidth(cut + '…', fontSize, bold) > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return cut.trimEnd() + '…';
};

const wrapText = (value, maxWidth, fontSize, { bold = false, maxLines = 2 } = {}) => {
  const source = String(value ?? '').trim();
  const words = source.split(/\s+/).filter(Boolean);
  if (!words.length) return [''];

  const lines = [];
  let current = '';
  let overflow = false;

  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    const candidate = current ? current + ' ' + word : word;
    if (!current || textWidth(candidate, fontSize, bold) <= maxWidth) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maxLines) {
      overflow = true;
      break;
    }
  }

  if (!overflow && current && lines.length < maxLines) lines.push(current);

  if (overflow) {
    lines[maxLines - 1] = truncate(lines[maxLines - 1] + ' ' + current, maxWidth, fontSize, bold);
  }

  return lines.slice(0, maxLines).map((line) => truncate(line, maxWidth, fontSize, bold));
};

const roundedRect = (x, y, w, h, r, fill, extra) =>
  '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + r + '" ry="' + r +
  '" fill="' + fill + '"' + (extra ? ' ' + extra : '') + '/>';

const svgText = (x, y, content, opts = {}) => {
  const {
    size = 24,
    fill = COLORS.white,
    weight = 400,
    anchor = 'start',
    spacing = 0,
    decoration = '',
    opacity = 1
  } = opts;

  return '<text x="' + x + '" y="' + y + '" font-family="' + FONT + '" font-size="' + size +
    '" font-weight="' + weight + '" fill="' + fill + '" text-anchor="' + anchor + '"' +
    (spacing ? ' letter-spacing="' + spacing + '"' : '') +
    (decoration ? ' text-decoration="' + decoration + '"' : '') +
    (opacity !== 1 ? ' opacity="' + opacity + '"' : '') +
    '>' + esc(content) + '</text>';
};

/* ------------------------------------------------------------------ *
 * Tải & chuẩn bị ảnh skin
 * ------------------------------------------------------------------ */

export const isAllowedImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && ALLOWED_IMAGE_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
};

const fetchImageBuffer = async (url) => {
  const cached = rawImageCache.get(url);
  if (cached) return cached;

  return imageSingleFlight('raw:' + url, async () => {
    const again = rawImageCache.get(url);
    if (again) return again;

    const response = await fetchLimit(() =>
      axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 10000,
        maxContentLength: MAX_IMAGE_BYTES,
        maxRedirects: 2
      })
    );

    const buffer = Buffer.from(response.data);
    rawImageCache.set(url, buffer);
    return buffer;
  });
};

/**
 * Trả về pixel RGBA thô đã vừa khung w*h.
 * Composite bằng raw pixel thay vì PNG giúp bỏ hẳn một vòng encode/decode PNG
 * cho mỗi ảnh con - đây là khoản tiết kiệm CPU lớn nhất so với bản collage cũ.
 */
const prepareCell = async (url, w, h) => {
  const key = url + '|' + w + 'x' + h;
  const cached = cellCache.get(key);
  if (cached) return cached;

  return imageSingleFlight('cell:' + key, async () => {
    const again = cellCache.get(key);
    if (again) return again;

    const source = await fetchImageBuffer(url);
    const { data, info } = await sharp(source)
      .resize(w, h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const cell = { data, width: info.width, height: info.height, channels: info.channels };
    cellCache.set(key, cell);
    return cell;
  });
};

const safeCell = async (url, w, h) => {
  if (!isAllowedImageUrl(url)) return null;
  try {
    return await prepareCell(url, w, h);
  } catch (error) {
    console.warn('[ShopImage] Skipped image:', url, error.message);
    return null;
  }
};

/* ------------------------------------------------------------------ *
 * Chuẩn hoá dữ liệu storefront -> item để vẽ
 * ------------------------------------------------------------------ */

const normalizeText = (value, max = 120) =>
  String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

const toPercent = (value) => {
  if (value == null || Number.isNaN(Number(value))) return null;
  const numeric = Number(value);
  const percent = numeric <= 1 ? Math.round(numeric * 100) : Math.round(numeric);
  return percent > 0 && percent < 100 ? percent : null;
};

const buildItem = (offer, opts) => {
  const { currency = 'VP', wishlistNames, wishlistUuids } = opts;
  const meta = offer?.metadata || offer || {};
  const name = normalizeText(meta.displayName || offer?.displayName || 'Unknown');
  const discountPercent = toPercent(offer?.discountPercent);
  const discounted = offer?.discountedPrice;
  const base = offer?.basePrice;
  const flat = offer?.priceVP ?? offer?.price ?? offer?.priceKC;

  let priceText = '';
  let basePriceText = '';

  if (discounted != null && base != null && discounted !== base) {
    priceText = discounted === 0 ? 'FREE' : discounted + ' ' + currency;
    basePriceText = base + ' ' + currency;
  } else if (discounted != null) {
    priceText = discounted === 0 ? 'FREE' : discounted + ' ' + currency;
  } else if (flat != null && flat !== '') {
    priceText = flat + ' ' + currency;
  }

  const uuid = String(offer?.itemId || meta.uuid || '').toLowerCase();
  const isWishlist = Boolean(
    (wishlistUuids && uuid && wishlistUuids.has(uuid)) ||
    (wishlistNames && wishlistNames.has(name.toLowerCase()))
  );

  return {
    name,
    imageUrl: meta.displayIcon || meta.image || offer?.displayIcon || '',
    tierName: normalizeText(meta.contentTier?.displayName || offer?.tier || '', 32),
    tierIconUrl: meta.contentTier?.displayIcon || offer?.tierIcon || '',
    priceText,
    basePriceText,
    discountPercent,
    isWishlist
  };
};

const toSet = (value) => {
  if (value instanceof Set) return value;
  return new Set((value || []).map((entry) => String(entry).toLowerCase()));
};

/**
 * Lấy danh sách item theo variant từ object storefront gốc.
 * Dùng chung cho cả request từ web lẫn cron gửi Discord.
 */
export const buildItemsFromStorefront = (storefront, options = {}) => {
  const { variant = 'daily', wishlistNames, wishlistUuids } = options;
  const opts = { wishlistNames: toSet(wishlistNames), wishlistUuids: toSet(wishlistUuids) };

  if (variant === 'night-market') {
    return (storefront?.bonusStore?.offers || []).map((offer) => buildItem(offer, { ...opts, currency: 'VP' }));
  }

  if (variant === 'accessory') {
    return (storefront?.accessoryStore?.offers || []).map((offer) => buildItem(offer, { ...opts, currency: 'KC' }));
  }

  if (variant === 'bundle') {
    const bundle = getBundles(storefront)[0];
    return (bundle?.items || []).map((offer) => buildItem(offer, { ...opts, currency: 'VP' }));
  }

  return (storefront?.skinsPanel?.offers || []).map((offer) => buildItem(offer, { ...opts, currency: 'VP' }));
};

const getBundles = (storefront) => {
  if (storefront?.featuredBundles?.length) return storefront.featuredBundles;
  if (storefront?.featuredBundle?.items?.length) return [storefront.featuredBundle];
  return [];
};

export const getBundleTitle = (storefront) =>
  normalizeText(getBundles(storefront)[0]?.bundleMeta?.displayName || '', 48);

/**
 * Danh sách variant thực sự có dữ liệu, để frontend biết hiện nút share nào.
 */
export const getAvailableVariants = (storefront) => {
  const available = [];
  if (storefront?.skinsPanel?.offers?.length) available.push('daily');
  if (storefront?.bonusStore?.offers?.length) available.push('night-market');
  if (getBundles(storefront).length) available.push('bundle');
  if (storefront?.accessoryStore?.offers?.length) available.push('accessory');
  return available;
};

/* ------------------------------------------------------------------ *
 * Layout
 * ------------------------------------------------------------------ */

const FEED_THEME = {
  width: 1080,
  pad: 36,
  gap: 24,
  cols: 2,
  headerH: 208,
  footerH: 132,
  cardH: 434,
  imgH: 238,
  brandSize: 28,
  titleSize: 56,
  metaSize: 24,
  nameSize: 26,
  priceSize: 32,
  basePriceSize: 20,
  badgeSize: 20,
  footerSize: 30,
  tierIcon: 46,
  barGap: 18,
  metaGap: 58
};

const OG_THEME = {
  width: 1200,
  height: 630,
  pad: 44,
  gap: 18,
  cols: 4,
  headerH: 190,
  footerH: 96,
  cardH: 344,
  imgH: 168,
  brandSize: 22,
  titleSize: 40,
  metaSize: 19,
  nameSize: 20,
  priceSize: 24,
  basePriceSize: 15,
  badgeSize: 15,
  footerSize: 24,
  tierIcon: 34,
  barGap: 12,
  metaGap: 44
};

// valorant-api trả displayName dạng "Select Edition"/"Ultra Edition",
// nên phải bỏ hậu tố "edition" trước khi tra màu.
const tierAccent = (tierName) => {
  const key = String(tierName || '').trim().toLowerCase().replace(/\s*edition\s*$/, '');
  return TIER_COLORS[key] || COLORS.cardEdge;
};

const buildDefs = (height, width) =>
  '<defs>' +
  '<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">' +
  '<stop offset="0%" stop-color="' + COLORS.bgTop + '"/>' +
  '<stop offset="100%" stop-color="' + COLORS.bgBottom + '"/>' +
  '</linearGradient>' +
  '<radialGradient id="glow" cx="0.5" cy="0" r="0.9">' +
  '<stop offset="0%" stop-color="' + COLORS.red + '" stop-opacity="0.20"/>' +
  '<stop offset="100%" stop-color="' + COLORS.red + '" stop-opacity="0"/>' +
  '</radialGradient>' +
  '</defs>' +
  '<rect x="0" y="0" width="' + width + '" height="' + height + '" fill="url(#bg)"/>' +
  '<rect x="0" y="0" width="' + width + '" height="' + Math.round(height * 0.45) + '" fill="url(#glow)"/>';

const buildHeader = (theme, ctx) => {
  const { pad, brandSize, titleSize, metaSize, width } = theme;
  let out = '';

  out += svgText(pad, Math.round(pad + brandSize * 0.9), 'VALOCHECK', {
    size: brandSize, weight: 800, fill: COLORS.red, spacing: 5
  });

  const titleY = Math.round(pad + brandSize * 0.9 + titleSize + 14);
  out += svgText(pad, titleY, ctx.title, { size: titleSize, weight: 800, fill: COLORS.white, spacing: 2 });

  out += roundedRect(pad, titleY + (theme.barGap ?? 18), 92, 6, 3, COLORS.red);

  if (ctx.metaLine) {
    out += svgText(pad, titleY + (theme.metaGap ?? 58), ctx.metaLine, {
      size: metaSize, weight: 500, fill: COLORS.gray
    });
  }

  if (ctx.itemCount) {
    out += svgText(width - pad, Math.round(pad + brandSize * 0.9), ctx.itemCount, {
      size: brandSize, weight: 700, fill: COLORS.cream, anchor: 'end', opacity: 0.75
    });
  }

  return out;
};

const buildFooter = (theme, height, ctx) => {
  const { pad, width, footerSize } = theme;
  const lineY = height - theme.footerH + 8;
  let out = '';

  out += '<rect x="' + pad + '" y="' + lineY + '" width="' + (width - pad * 2) + '" height="2" fill="' + COLORS.cardEdge + '"/>';
  out += svgText(pad, lineY + 52, ctx.siteLabel, { size: footerSize, weight: 800, fill: COLORS.white, spacing: 1 });
  out += svgText(width - pad, lineY + 52, ctx.tagline, {
    size: Math.round(footerSize * 0.72), weight: 500, fill: COLORS.gray, anchor: 'end'
  });

  return out;
};

const buildCard = (theme, item, x, y, lang) => {
  const { cardH, imgH, nameSize, priceSize, basePriceSize, badgeSize } = theme;
  const cardW = theme.cardW;
  const accent = tierAccent(item.tierName);
  const innerPad = Math.round(cardW * 0.037);
  const imgW = cardW - innerPad * 2;

  let out = '';

  out += roundedRect(x, y, cardW, cardH, 20, COLORS.card, 'stroke="' + COLORS.cardEdge + '" stroke-width="2"');
  // Vạch nhấn màu theo tier ở mép trên card
  out += roundedRect(x + 18, y, cardW - 36, 6, 3, accent);
  // Nền tối cho vùng ảnh để skin nào cũng nổi
  out += roundedRect(x + innerPad, y + innerPad, imgW, imgH, 14, '#0C141C');

  const textLeft = x + innerPad;
  const textWidthMax = imgW;
  const nameTop = y + innerPad + imgH + Math.round(nameSize * 1.55);
  const nameLines = wrapText(item.name, textWidthMax, nameSize, { bold: true, maxLines: 2 });

  nameLines.forEach((line, index) => {
    out += svgText(textLeft, nameTop + index * Math.round(nameSize * 1.3), line, {
      size: nameSize, weight: 700, fill: COLORS.white
    });
  });

  if (item.tierName) {
    out += svgText(textLeft, nameTop + nameLines.length * Math.round(nameSize * 1.3) + 4, item.tierName.toUpperCase(), {
      size: Math.round(nameSize * 0.68), weight: 800, fill: accent, spacing: 1.6
    });
  }

  const priceBaseline = y + cardH - Math.round(cardH * 0.055);
  if (item.priceText) {
    out += svgText(textLeft, priceBaseline, item.priceText, {
      size: priceSize, weight: 800, fill: item.discountPercent ? COLORS.gold : COLORS.white
    });
  }

  if (item.basePriceText) {
    const priceW = textWidth(item.priceText, priceSize, true);
    out += svgText(textLeft + priceW + 14, priceBaseline, item.basePriceText, {
      size: basePriceSize, weight: 500, fill: COLORS.gray, decoration: 'line-through'
    });
  }

  // Badge giảm giá - góc trên phải vùng ảnh
  if (item.discountPercent) {
    const label = '-' + item.discountPercent + '%';
    const badgeW = Math.round(textWidth(label, badgeSize, true) + 26);
    const badgeH = Math.round(badgeSize * 1.9);
    const badgeX = x + innerPad + imgW - badgeW - 10;
    const badgeY = y + innerPad + 10;
    out += roundedRect(badgeX, badgeY, badgeW, badgeH, Math.round(badgeH / 2), COLORS.red);
    out += svgText(badgeX + badgeW / 2, badgeY + Math.round(badgeH * 0.7), label, {
      size: badgeSize, weight: 800, fill: COLORS.white, anchor: 'middle'
    });
  }

  // Badge wishlist - góc trên trái vùng ảnh
  if (item.isWishlist) {
    const label = WISHLIST_BADGE[lang] || WISHLIST_BADGE.en;
    const badgeW = Math.round(textWidth(label, badgeSize, true) + 28);
    const badgeH = Math.round(badgeSize * 1.9);
    const badgeX = x + innerPad + 10;
    const badgeY = y + innerPad + 10;
    out += roundedRect(badgeX, badgeY, badgeW, badgeH, Math.round(badgeH / 2), COLORS.gold);
    out += svgText(badgeX + badgeW / 2, badgeY + Math.round(badgeH * 0.7), label, {
      size: badgeSize, weight: 800, fill: '#20180A', anchor: 'middle'
    });
  }

  // Nền tròn cho icon tier (ảnh icon được composite đè lên sau)
  if (item.tierIconUrl && isAllowedImageUrl(item.tierIconUrl)) {
    const size = theme.tierIcon;
    const cx = x + innerPad + 12 + size / 2;
    const cy = y + innerPad + imgH - 12 - size / 2;
    out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (size / 2 + 5) +
      '" fill="rgba(0,0,0,0.55)" stroke="' + accent + '" stroke-width="2"/>';
  }

  return out;
};

const computeLayout = (theme, itemCount) => {
  const cols = Math.min(theme.cols, Math.max(itemCount, 1));
  const cardW = Math.floor((theme.width - theme.pad * 2 - theme.gap * (cols - 1)) / cols);
  const rows = Math.ceil(itemCount / cols);
  const height = theme.height
    || theme.headerH + rows * theme.cardH + Math.max(rows - 1, 0) * theme.gap + theme.footerH;
  return { ...theme, cols, cardW, rows, height };
};

/* ------------------------------------------------------------------ *
 * Render
 * ------------------------------------------------------------------ */

const formatDate = (date, lang) => {
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  return new Intl.DateTimeFormat(lang === 'vn' ? 'en-GB' : 'en-GB', {
    day: '2-digit',
    month: lang === 'vn' ? '2-digit' : 'short',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh'
  }).format(d).replace(/\s/g, lang === 'vn' ? '' : ' ');
};

const buildCacheKey = (payload) =>
  crypto.createHash('sha1').update(JSON.stringify(payload)).digest('hex');

/**
 * Render ảnh shop để chia sẻ.
 *
 * @param {object}  input
 * @param {Array}   input.items        - đã qua buildItemsFromStorefront
 * @param {string}  input.variant      - daily | night-market | bundle | accessory
 * @param {string}  input.size         - feed (1080, dọc) | og (1200x630)
 * @param {string}  input.lang         - vn | en
 * @param {string}  input.riotId       - chỉ vẽ khi showRiotId = true
 * @param {boolean} input.showRiotId   - MẶC ĐỊNH false, không lộ Riot ID
 * @returns {Promise<{buffer: Buffer, contentType: string, width: number, height: number, cached: boolean}>}
 */
export const renderShopImage = async (input = {}) => {
  const {
    items = [],
    variant = 'daily',
    size = 'feed',
    lang = 'vn',
    shard = '',
    riotId = '',
    showRiotId = false,
    title,
    date
  } = input;

  const usableItems = items
    .filter((item) => item && item.name)
    .slice(0, MAX_ITEMS);

  if (!usableItems.length) {
    throw new Error('NO_ITEMS_TO_RENDER');
  }

  const language = lang === 'en' ? 'en' : 'vn';
  const baseTheme = size === 'og' ? OG_THEME : FEED_THEME;
  const theme = computeLayout(baseTheme, usableItems.length);
  const dateLabel = formatDate(date ? new Date(date) : new Date(), language);

  const resolvedTitle = normalizeText(
    title || VARIANT_TITLES[variant]?.[language] || VARIANT_TITLES.daily[language],
    40
  ).toUpperCase();

  const metaParts = [dateLabel];
  if (shard) metaParts.push(String(shard).toUpperCase());
  if (showRiotId && riotId) metaParts.push(normalizeText(riotId, 40));

  const cacheKey = buildCacheKey({
    v: 3,
    variant,
    size,
    language,
    resolvedTitle,
    meta: metaParts.join('|'),
    items: usableItems.map((item) => [
      item.name, item.imageUrl, item.tierName, item.tierIconUrl,
      item.priceText, item.basePriceText, item.discountPercent, item.isWishlist
    ])
  });

  const cached = renderCache.get(cacheKey);
  if (cached) return { ...cached, cached: true };

  return renderSingleFlight('render:' + cacheKey, async () => {
    const again = renderCache.get(cacheKey);
    if (again) return { ...again, cached: true };

    const { width, height, cols, cardW, pad, gap, cardH, imgH } = theme;
    const innerPad = Math.round(cardW * 0.037);
    const imgW = cardW - innerPad * 2;

    const positions = usableItems.map((item, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      return {
        item,
        x: pad + col * (cardW + gap),
        y: theme.headerH + row * (cardH + gap)
      };
    });

    // 1) Vẽ toàn bộ nền/card/chữ trong MỘT svg -> chỉ rasterize một lần.
    let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height +
      '" viewBox="0 0 ' + width + ' ' + height + '">';
    svg += buildDefs(height, width);
    svg += buildHeader(theme, {
      title: resolvedTitle,
      metaLine: metaParts.join('  ·  '),
      itemCount: usableItems.length + ' items'
    });
    positions.forEach(({ item, x, y }) => {
      svg += buildCard(theme, item, x, y, language);
    });
    svg += buildFooter(theme, height, {
      siteLabel: SITE_URL.replace(/^https?:\/\//, ''),
      tagline: FOOTER_TAGLINE[language]
    });
    svg += '</svg>';

    // 2) Tải + resize ảnh song song (có cache + giới hạn concurrency).
    const cellJobs = [];
    positions.forEach(({ item, x, y }) => {
      cellJobs.push(
        safeCell(item.imageUrl, imgW, imgH).then((cell) =>
          cell ? { cell, left: x + innerPad, top: y + innerPad, z: 0 } : null
        )
      );

      if (item.tierIconUrl) {
        const iconSize = theme.tierIcon;
        cellJobs.push(
          safeCell(item.tierIconUrl, iconSize, iconSize).then((cell) =>
            cell
              ? {
                  cell,
                  left: x + innerPad + 12,
                  top: y + innerPad + imgH - 12 - iconSize,
                  z: 1
                }
              : null
          )
        );
      }
    });

    const overlays = (await Promise.all(cellJobs))
      .filter(Boolean)
      .sort((a, b) => a.z - b.z)
      .map(({ cell, left, top }) => ({
        input: cell.data,
        raw: { width: cell.width, height: cell.height, channels: cell.channels },
        left,
        top
      }));

    // 3) Composite bằng raw pixel, xuất JPEG (nhỏ hơn PNG ~5-8 lần, đủ nét cho ảnh share).
    const buffer = await sharp(Buffer.from(svg), { density: 72 })
      .composite(overlays)
      .flatten({ background: COLORS.bgBottom })
      .jpeg({ quality: 90, progressive: true, mozjpeg: true, chromaSubsampling: '4:4:4' })
      .toBuffer();

    const result = { buffer, contentType: 'image/jpeg', width, height };
    renderCache.set(cacheKey, result);
    return { ...result, cached: false };
  });
};

/**
 * Tiện ích cho luồng cron/Discord: nhận storefront thô, trả ảnh daily store.
 */
export const renderStorefrontImage = async (storefront, options = {}) => {
  const variant = options.variant || 'daily';
  const items = buildItemsFromStorefront(storefront, {
    variant,
    wishlistNames: options.wishlistNames,
    wishlistUuids: options.wishlistUuids
  });

  return renderShopImage({
    ...options,
    variant,
    items,
    title: variant === 'bundle' ? getBundleTitle(storefront) || undefined : options.title
  });
};

export default {
  renderShopImage,
  renderStorefrontImage,
  buildItemsFromStorefront,
  getAvailableVariants,
  getBundleTitle,
  isAllowedImageUrl,
  getImageCacheStats,
  SITE_URL,
  MAX_ITEMS
};
