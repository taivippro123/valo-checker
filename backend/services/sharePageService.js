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

const COPY = {
  vn: {
    cta: 'Xem shop Valorant của bạn',
    sub: 'Miễn phí · Nhận thông báo Discord khi skin bạn săn xuất hiện trong shop',
    guide: 'Xem hướng dẫn',
    expiredTitle: 'Link này đã hết hạn',
    expiredNote: 'Link chia sẻ chỉ sống trong 30 ngày.',
    desc: 'Xem shop Valorant hằng ngày kèm thông báo Discord khi skin trong wishlist xuất hiện.'
  },
  en: {
    cta: 'Check your own Valorant store',
    sub: 'Free · get a Discord ping when a wishlist skin appears in your shop',
    guide: 'View the guide',
    expiredTitle: 'This link has expired',
    expiredNote: 'Share links stay alive for 30 days.',
    desc: 'Track your Valorant store daily and get a Discord ping when a wishlist skin shows up.'
  }
};

const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const STYLE = `
  :root {
    color-scheme: dark;
    --red: #FF4655;
    --cream: #ECE8E1;
    --muted: #7D8B99;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body {
    min-height: 100vh;
    padding: clamp(28px, 6vw, 64px) 20px calc(clamp(28px, 6vw, 64px) + env(safe-area-inset-bottom));
    background:
      radial-gradient(90% 60% at 50% -10%, rgba(255,70,85,.16) 0%, rgba(255,70,85,0) 60%),
      radial-gradient(120% 90% at 50% 0%, #1A2634 0%, #0C141C 55%, #070B0F 100%);
    color: var(--cream);
    display: flex; flex-direction: column; align-items: center;
    font-family: 'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  a { text-decoration: none; }

  .wrap { width: 100%; max-width: 860px; display: flex; flex-direction: column; align-items: center; }

  .brand {
    font-size: clamp(34px, 7.5vw, 58px);
    font-weight: 900;
    letter-spacing: .14em;
    line-height: 1;
    margin: 0;
    text-align: center;
  }
  .brand .accent { color: var(--red); }

  .tag {
    margin: 14px 0 clamp(22px, 4vw, 34px);
    font-size: clamp(11px, 2.4vw, 13px);
    font-weight: 700;
    letter-spacing: .26em;
    text-transform: uppercase;
    color: var(--muted);
    text-align: center;
  }

  .frame {
    width: 100%;
    margin-top: clamp(26px, 5vw, 40px);
    padding: 10px;
    border-radius: 20px;
    background: rgba(255,255,255,.03);
    border: 1px solid rgba(255,255,255,.07);
    box-shadow: 0 30px 70px -28px rgba(0,0,0,.9);
  }
  .shot { display: block; width: 100%; height: auto; border-radius: 12px; }

  .cta {
    margin-top: clamp(26px, 5vw, 38px);
    display: inline-flex; align-items: center; gap: 12px;
    padding: 16px 30px;
    border-radius: 14px;
    font-size: clamp(15px, 3vw, 16px);
    font-weight: 700;
    letter-spacing: .01em;
    color: #fff;
    background: linear-gradient(180deg, #FF6470 0%, #FF4655 52%, #E23B49 100%);
    border: 1px solid rgba(255,255,255,.14);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.28),
      inset 0 -1px 0 rgba(0,0,0,.18),
      0 12px 28px -12px rgba(255,70,85,.75);
    transition: transform .16s ease, box-shadow .16s ease, filter .16s ease;
  }
  .cta:hover {
    transform: translateY(-1px);
    filter: saturate(1.06);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.32),
      inset 0 -1px 0 rgba(0,0,0,.18),
      0 18px 34px -12px rgba(255,70,85,.85);
  }
  .cta:active { transform: translateY(0); }
  .cta svg { flex: none; transition: transform .16s ease; }
  .cta:hover svg { transform: translateX(3px); }

  .sub {
    margin: 16px 0 0;
    font-size: 13px;
    line-height: 1.7;
    color: var(--muted);
    text-align: center;
  }
  .sub a { color: var(--cream); border-bottom: 1px solid rgba(236,232,225,.3); }
  .sub a:hover { border-bottom-color: var(--red); }

  @media (prefers-reduced-motion: reduce) {
    .cta, .cta svg { transition: none; }
    .cta:hover { transform: none; }
  }
`;

const ARROW = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
  '<path d="M5 12h13M12 5l7 7-7 7" stroke="currentColor" stroke-width="2.2" ' +
  'stroke-linecap="round" stroke-linejoin="round"/></svg>';

const brandMark = '<h1 class="brand">VALO<span class="accent">CHECK</span></h1>';

const ctaBlock = (copy) => `
      <a class="cta" href="${SITE_URL}/">${esc(copy.cta)}${ARROW}</a>
      <p class="sub">${esc(copy.sub)} ·
        <a href="${SITE_URL}/guide">${esc(copy.guide)}</a></p>`;

const buildPage = ({ title, description, imageUrl, canonical, bodyHtml, indexable, lang = 'vi' }) => `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}"/>
<link rel="canonical" href="${esc(canonical)}"/>
<link rel="icon" href="${SITE_URL}/favicon.svg"/>
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
<main class="wrap">
${bodyHtml}
</main>
</body>
</html>`;

export const renderExpiredPage = (canonical, lang = 'vn') => {
  const copy = COPY[lang === 'en' ? 'en' : 'vn'];

  return buildPage({
    indexable: false,
    title: 'Link chia sẻ đã hết hạn — VALOCHECK',
    description: 'Link shop này không còn tồn tại. Xem shop Valorant của chính bạn tại VALOCHECK.',
    imageUrl: `${SITE_URL}/opengraph-image.png`,
    canonical,
    bodyHtml: `${brandMark}
      <p class="tag">${esc(copy.expiredTitle)}</p>
      <p class="sub" style="margin-top:-10px">${esc(copy.expiredNote)}</p>
${ctaBlock(copy)}`
  });
};

/**
 * @param {object} snapshot - document ShopSnapshot (lean)
 * @param {object} urls     - { pageUrl, imageUrl, ogImageUrl } từ snapshotUrls()
 */
export const renderSharePage = (snapshot, urls) => {
  const lang = snapshot.lang === 'en' ? 'en' : 'vn';
  const copy = COPY[lang];
  const label = snapshot.title || VARIANT_LABEL[snapshot.variant]?.[lang] || VARIANT_LABEL.daily[lang];

  const title = `${label}${snapshot.shard ? ` · ${String(snapshot.shard).toUpperCase()}` : ''} — VALOCHECK`;
  // Không liệt kê tên skin ở đây: ảnh đã hiện đủ, và dòng này là phần chữ
  // Discord/Facebook/Google in ngay dưới tiêu đề khi dán link.
  const description = copy.desc;

  return buildPage({
    indexable: true,
    lang: lang === 'en' ? 'en' : 'vi',
    title,
    description,
    imageUrl: urls.ogImageUrl,
    canonical: urls.pageUrl,
    bodyHtml: `${brandMark}
      <div class="frame">
        <picture>
          <source media="(min-width: 560px)" srcset="${esc(urls.ogImageUrl)}"/>
          <img class="shot" src="${esc(urls.imageUrl)}" alt="${esc(label)}" loading="eager" decoding="async"/>
        </picture>
      </div>
${ctaBlock(copy)}`
  });
};
