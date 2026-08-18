import { SITE_URL } from './shopImageService.js';

/**
 * Trang HTML cho link chia sẻ /s/:id.
 *
 * Trước đây phần này là serverless function của Vercel, nhưng Vercel chỉ nhận
 * thư mục `api/` nằm trong Root Directory của project - đặt sai chỗ là function
 * không được deploy, `/s/:id` rơi vào rewrite catch-all rồi về SPA (mất hẳn thẻ og:).
 * Để backend tự render thì chỉ cần một rewrite proxy, không phụ thuộc cấu hình đó nữa.
 */

const VARIANT_LABEL = {
  daily: { vn: 'Shop hàng ngày', en: 'Daily Store' },
  'night-market': { vn: 'Chợ đêm', en: 'Night Market' },
  bundle: { vn: 'Bundle nổi bật', en: 'Featured Bundle' },
  accessory: { vn: 'Cửa hàng phụ kiện', en: 'Accessory Store' }
};

const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const STYLE = `
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; padding: 32px 20px 48px;
    background: radial-gradient(120% 80% at 50% 0%, #1B2836 0%, #0B131B 55%, #070C11 100%);
    color: #ECE8E1; display: flex; flex-direction: column; align-items: center;
    font-family: 'Segoe UI', system-ui, -apple-system, Roboto, Arial, sans-serif;
  }
  a { text-decoration: none; }
  .brand { font-weight: 800; letter-spacing: .32em; color: #FF4655; font-size: 15px; }
  h1 { margin: 14px 0 6px; font-size: clamp(24px, 5vw, 36px); font-weight: 800; text-align: center; }
  .meta { margin: 0 0 24px; color: #7E8C99; font-size: 14px; text-align: center; max-width: 640px; }
  .shot {
    width: 100%; max-width: 560px; border-radius: 18px; display: block;
    border: 1px solid rgba(255,255,255,.08); box-shadow: 0 24px 60px rgba(0,0,0,.55);
  }
  .cta {
    margin-top: 28px; display: inline-flex; align-items: center; gap: 10px;
    background: #FF4655; color: #fff; font-weight: 800; font-size: 16px;
    padding: 15px 30px; border-radius: 12px;
  }
  .cta:hover { background: #E03D4B; }
  .sub { margin-top: 14px; color: #7E8C99; font-size: 13px; text-align: center; }
  .sub a { color: #ECE8E1; border-bottom: 1px solid rgba(236,232,225,.35); }
`;

const buildPage = ({ title, description, imageUrl, canonical, bodyHtml, indexable }) => `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}"/>
<link rel="canonical" href="${esc(canonical)}"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="VALOCHECK"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(description)}"/>
<meta property="og:url" content="${esc(canonical)}"/>
${imageUrl ? `<meta property="og:image" content="${esc(imageUrl)}"/>
<meta property="og:image:secure_url" content="${esc(imageUrl)}"/>
<meta property="og:image:type" content="image/jpeg"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:image:alt" content="${esc(title)}"/>
<meta name="twitter:image" content="${esc(imageUrl)}"/>` : ''}
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(description)}"/>
<meta name="robots" content="${indexable ? 'index, follow' : 'noindex, follow'}"/>
<style>${STYLE}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

export const renderExpiredPage = (canonical) =>
  buildPage({
    indexable: false,
    title: 'Link chia sẻ đã hết hạn — VALOCHECK',
    description: 'Link shop này không còn tồn tại. Xem shop Valorant của chính bạn tại VALOCHECK.',
    imageUrl: `${SITE_URL}/opengraph-image.png`,
    canonical,
    bodyHtml: `
      <div class="brand">VALOCHECK</div>
      <h1>Link này đã hết hạn</h1>
      <p class="meta">Link chia sẻ chỉ sống trong 30 ngày.</p>
      <a class="cta" href="${SITE_URL}/">Xem shop Valorant của bạn</a>
    `
  });

/**
 * @param {object} snapshot - document ShopSnapshot (lean)
 * @param {object} urls     - { pageUrl, imageUrl, ogImageUrl } từ snapshotUrls()
 */
export const renderSharePage = (snapshot, urls) => {
  const lang = snapshot.lang === 'en' ? 'en' : 'vn';
  const label = snapshot.title || VARIANT_LABEL[snapshot.variant]?.[lang] || VARIANT_LABEL.daily[lang];
  const names = (snapshot.items || []).map((item) => item.name).filter(Boolean);

  const title = `${label}${snapshot.shard ? ` · ${String(snapshot.shard).toUpperCase()}` : ''} — VALOCHECK`;
  const description = names.length
    ? `${names.slice(0, 4).join(' · ')}${names.length > 4 ? ` và ${names.length - 4} món khác` : ''}`
    : 'Xem shop Valorant hằng ngày kèm thông báo Discord khi skin trong wishlist xuất hiện.';

  return buildPage({
    indexable: true,
    title,
    description,
    imageUrl: urls.ogImageUrl,
    canonical: urls.pageUrl,
    bodyHtml: `
      <div class="brand">VALOCHECK</div>
      <h1>${esc(label)}</h1>
      <p class="meta">${esc(description)}</p>
      <img class="shot" src="${esc(urls.imageUrl)}" alt="${esc(label)}" loading="eager"/>
      <a class="cta" href="${SITE_URL}/">Xem shop Valorant của bạn</a>
      <p class="sub">Miễn phí · nhận thông báo Discord khi skin bạn săn vào shop ·
        <a href="${SITE_URL}/guide">xem hướng dẫn</a></p>
    `
  });
};
