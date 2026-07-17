// Serverless proxy for Vercel that forwards /api/* -> VPS_ORIGIN
// This file is placed under frontend/api so Vercel deploys it when root is frontend.

export default async function handler(req, res) {
  try {
    const rawPath = req.query.path || req.query['...path'] || [];
    const base = process.env.VPS_ORIGIN;
    if (!base) {
      res.status(500).json({ error: 'VPS_ORIGIN is not configured in environment' });
      return;
    }

    const suffix = Array.isArray(rawPath) ? rawPath.join('/') : rawPath;
    const parsedUrl = new URL(req.url, 'http://localhost');
    parsedUrl.searchParams.delete('path');
    parsedUrl.searchParams.delete('...path');
    const queryString = parsedUrl.searchParams.toString() ? `?${parsedUrl.searchParams.toString()}` : '';
    const baseUrl = base.replace(/\/$/, '');
    const target = suffix ? `${baseUrl}/${suffix}${queryString}` : `${baseUrl}${queryString}`;

    console.log('Vercel proxy request:', {
      method: req.method,
      rawPath,
      suffix,
      queryString,
      target,
      vpsOrigin: base
    });

    const forwardHeaders = { ...req.headers };
    delete forwardHeaders.host;

    const opts = {
      method: req.method,
      headers: forwardHeaders,
      redirect: 'follow'
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (req.body && Object.keys(req.body).length) {
        if (!opts.headers['content-type'] && !opts.headers['Content-Type']) {
          opts.headers['content-type'] = 'application/json';
        }
        opts.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      } else {
        opts.body = req;
      }
    }

    const proxied = await fetch(target, opts);

    res.status(proxied.status);
    proxied.headers.forEach((value, key) => {
      if (['transfer-encoding', 'content-encoding', 'connection'].includes(key.toLowerCase())) return;
      res.setHeader(key, value);
    });

    const buffer = await proxied.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Proxy error', err);
    res.status(502).json({ error: 'Proxy error', details: err.message });
  }
}
