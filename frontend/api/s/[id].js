/**
 * Trang chia sẻ /s/:id
 *
 * Vercel rewrite mọi đường dẫn về index.html, nên crawler của Facebook/Discord/Zalo
 * không bao giờ đọc được thẻ og: của SPA. Function này trả HTML tĩnh có sẵn og:image
 * để link dán ra ngoài hiện đúng ảnh shop, đồng thời làm luôn landing page cho người thật
 * (hiện ảnh + CTA vẫn chuyển đổi tốt hơn là redirect thẳng về trang chủ).
 */

const API_BASE = (
  process.env.PUBLIC_API_URL ||
  process.env.API_URL ||
  process.env.VITE_API_URL ||
  ''
).replace(/\/$/, '');

const SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://valocheck.vercel.app').replace(/\/$/, '');

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

const page = ({ title, description, imageUrl, canonical, bodyHtml, status }) => `<!doctype html>
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
<meta property="og:image:type" content="image/jpeg"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta name="twitter:image" content="${esc(imageUrl)}"/>` : ''}
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(description)}"/>
<meta name="robots" content="${status === 200 ? 'index, follow' : 'noindex, follow'}"/>
<style>
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
  .meta { margin: 0 0 24px; color: #7E8C99; font-size: 14px; text-align: center; }
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
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

const notFound = (canonical) =>
  page({
    status: 404,
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

export default async function handler(req, res) {
  const id = String(req.query?.id || '').trim();
  const canonical = `${SITE_URL}/s/${id}`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (!/^[A-Za-z0-9_-]{4,16}$/.test(id) || !API_BASE) {
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.status(404).send(notFound(canonical));
    return;
  }

  let snapshot = null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const upstream = await fetch(`${API_BASE}/api/share/s/${id}`, { signal: controller.signal });
    clearTimeout(timeout);
    if (upstream.ok) snapshot = await upstream.json();
  } catch (error) {
    console.error('[share-og] upstream failed:', error.message);
  }

  if (!snapshot) {
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.status(404).send(notFound(canonical));
    return;
  }

  const lang = snapshot.lang === 'en' ? 'en' : 'vn';
  const label = snapshot.title || VARIANT_LABEL[snapshot.variant]?.[lang] || VARIANT_LABEL.daily[lang];
  const names = Array.isArray(snapshot.itemNames) ? snapshot.itemNames : [];
  const imageUrl = `${API_BASE}/api/share/s/${id}/og`;
  const shotUrl = `${API_BASE}/api/share/s/${id}/image`;

  const title = `${label}${snapshot.shard ? ` · ${String(snapshot.shard).toUpperCase()}` : ''} — VALOCHECK`;
  const description = names.length
    ? `${names.slice(0, 4).join(' · ')}${names.length > 4 ? ` và ${names.length - 4} món khác` : ''}`
    : 'Xem shop Valorant hằng ngày kèm thông báo Discord khi skin trong wishlist xuất hiện.';

  // Snapshot là bất biến -> để CDN Vercel giữ lâu, crawler và người xem đều không chạm backend.
  res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=86400, stale-while-revalidate=604800');
  res.status(200).send(
    page({
      status: 200,
      title,
      description,
      imageUrl,
      canonical,
      bodyHtml: `
        <div class="brand">VALOCHECK</div>
        <h1>${esc(label)}</h1>
        <p class="meta">${esc(description)}</p>
        <img class="shot" src="${esc(shotUrl)}" alt="${esc(label)}" loading="eager"/>
        <a class="cta" href="${SITE_URL}/">Xem shop Valorant của bạn</a>
        <p class="sub">Miễn phí · nhận thông báo Discord khi skin bạn săn vào shop ·
          <a href="${SITE_URL}/guide">xem hướng dẫn</a></p>
      `
    })
  );
}
