// Serverless proxy for Vercel that forwards /api/* -> VPS_ORIGIN
// Put this file under the project root's `api/` folder so Vercel exposes
// it as a Serverless Function at /api/proxy/<...path>

export default async function handler(req, res) {
  try {
    const { path = [] } = req.query || {};
    const base = process.env.VPS_ORIGIN; // e.g. http://1.2.3.4:4000
    if (!base) {
      res.status(500).json({ error: 'VPS_ORIGIN is not configured in environment' });
      return;
    }

    // Rebuild target URL: keep query string intact
    const suffix = Array.isArray(path) ? path.join('/') : path;
    const query = req.url && req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const target = `${base.replace(/\/$/, '')}/${suffix}${query}`;

    // Clone headers but remove host to avoid conflicts
    const forwardHeaders = { ...req.headers };
    delete forwardHeaders.host;

    // Build fetch options
    const opts = {
      method: req.method,
      headers: forwardHeaders,
      // allow redirects
      redirect: 'follow'
    };

    // When body exists, forward it. For typical JSON APIs Vercel already parsed body.
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      // If body already parsed, use it; otherwise pipe the raw stream
      if (req.body && Object.keys(req.body).length) {
        // ensure JSON content-type if not set
        if (!opts.headers['content-type'] && !opts.headers['Content-Type']) {
          opts.headers['content-type'] = 'application/json';
        }
        opts.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      } else {
        // fall back to streaming raw request (works for most cases)
        opts.body = req;
      }
    }

    const proxied = await fetch(target, opts);

    // copy status and headers (but be careful with hop-by-hop headers)
    res.status(proxied.status);
    proxied.headers.forEach((value, key) => {
      // Skip problematic headers that Node/Serverless will set
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
