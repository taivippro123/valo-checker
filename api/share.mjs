/**
 * Proxy cho link chia sẻ: /s/:id, /s/:id/image, /s/:id/og
 *
 * Vì sao cần lớp này thay vì để Vercel rewrite thẳng sang backend:
 * backend đang lộ ra ngoài qua ngrok free, mà ngrok chặn theo User-Agent -
 * Discordbot và trình duyệt đều nhận trang cảnh báo thay vì nội dung thật
 * (Facebook/Twitter/Zalo thì lọt). Thẻ og:image và <img> không gửi được header
 * tuỳ biến, nên phải có chỗ đứng giữa thêm `ngrok-skip-browser-warning`.
 * Nhờ vậy toàn bộ URL công khai cũng nằm trên domain valocheck thay vì ngrok.
 *
 * Bỏ được lớp proxy này khi backend chạy trên domain thật (Cloudflare Tunnel,
 * hoặc trỏ domain vào VPS) - lúc đó rewrite thẳng sang backend là đủ.
 *
 * LƯU Ý: file này phải nằm trong Root Directory của project Vercel. Bản sao ở
 * `frontend/api/share.mjs` để chạy được dù Root Directory là repo gốc hay `frontend`.
 */

const API_BASE = (
  process.env.PUBLIC_API_URL ||
  process.env.VITE_API_URL ||
  process.env.API_URL ||
  'https://wildland-proud-barber.ngrok-free.dev'
).replace(/\/$/, '');

const SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://valocheck.vercel.app').replace(/\/$/, '');

const UPSTREAM_HEADERS = {
  'ngrok-skip-browser-warning': 'true',
  'user-agent': 'valocheck-share-proxy'
};

const ID_PATTERN = /^[A-Za-z0-9_-]{4,16}$/;

const fallbackPage = (message) => `<!doctype html>
<html lang="vi"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Link chia sẻ không khả dụng — VALOCHECK</title>
<meta name="robots" content="noindex, follow"/>
<meta property="og:title" content="VALOCHECK — Shop Valorant hằng ngày"/>
<meta property="og:image" content="${SITE_URL}/opengraph-image.png"/>
<style>
  body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;
  justify-content:center;gap:14px;background:#0B131B;color:#ECE8E1;font-family:system-ui,Arial,sans-serif;padding:24px;text-align:center}
  a{background:#FF4655;color:#fff;font-weight:700;padding:14px 28px;border-radius:12px;text-decoration:none}
</style>
</head><body>
<h1>${message}</h1>
<a href="${SITE_URL}/">Xem shop Valorant của bạn</a>
</body></html>`;

const fetchUpstream = async (path, extraHeaders) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    return await fetch(`${API_BASE}${path}`, {
      headers: { ...UPSTREAM_HEADERS, ...extraHeaders },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
};

export default async function handler(req, res) {
  const id = String(req.query?.id || '').trim();
  const kind = String(req.query?.kind || 'page');

  if (!ID_PATTERN.test(id)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.status(404).send(fallbackPage('Link chia sẻ không hợp lệ'));
    return;
  }

  // Ảnh: chuyển tiếp nguyên bytes, để CDN giữ lâu vì snapshot là bất biến.
  if (kind === 'image' || kind === 'og') {
    try {
      const upstream = await fetchUpstream(
        `/api/share/s/${id}/${kind === 'og' ? 'og' : 'image'}`,
        { accept: 'image/jpeg,image/*' }
      );

      if (!upstream.ok) {
        res.setHeader('Cache-Control', 'public, max-age=60');
        res.status(upstream.status === 404 ? 404 : 502).end();
        return;
      }

      const buffer = Buffer.from(await upstream.arrayBuffer());
      res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/jpeg');
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, immutable');
      res.status(200).end(buffer);
    } catch (error) {
      console.error('[share-proxy] image failed:', error.message);
      res.setHeader('Cache-Control', 'no-store');
      res.status(502).end();
    }
    return;
  }

  // Trang HTML kèm thẻ og: do backend render.
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  try {
    const upstream = await fetchUpstream(`/api/share/s/${id}/page`, { accept: 'text/html' });
    const html = await upstream.text();

    res.setHeader(
      'Cache-Control',
      upstream.ok
        ? 'public, max-age=600, s-maxage=86400, stale-while-revalidate=604800'
        : 'public, max-age=60'
    );
    res.status(upstream.status).send(html);
  } catch (error) {
    console.error('[share-proxy] page failed:', error.message);
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).send(fallbackPage('Không tải được link chia sẻ'));
  }
}
