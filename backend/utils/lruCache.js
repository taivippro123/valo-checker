/**
 * Cache LRU + TTL tối giản, không phụ thuộc thư viện ngoài.
 * Dùng cho buffer ảnh skin và ảnh đã render (xem shopImageService).
 */
export class TtlLruCache {
  /**
   * @param {object}   options
   * @param {number}   options.max      - trần số lượng entry
   * @param {number}   options.maxBytes - trần dung lượng; bắt buộc phải có khi
   *                                      giá trị lưu là buffer/pixel thô, vì chỉ
   *                                      giới hạn số lượng sẽ không chặn được RAM
   *                                      (một ô pixel RGBA 456x238 đã ~424KB).
   * @param {Function} options.sizeOf   - trả về số byte của một giá trị
   */
  constructor({ max = 200, maxBytes = 0, ttlMs = 24 * 60 * 60 * 1000, name = 'cache', sizeOf } = {}) {
    this.max = max;
    this.maxBytes = maxBytes;
    this.sizeOf = sizeOf;
    this.ttlMs = ttlMs;
    this.name = name;
    this.store = new Map();
    this.bytes = 0;
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses += 1;
      return undefined;
    }

    if (entry.expiresAt <= Date.now()) {
      this.#remove(key);
      this.misses += 1;
      return undefined;
    }

    // Đưa lên cuối Map để đánh dấu vừa dùng (Map giữ thứ tự chèn)
    this.store.delete(key);
    this.store.set(key, entry);
    this.hits += 1;
    return entry.value;
  }

  set(key, value, ttlMs = this.ttlMs) {
    if (this.store.has(key)) this.#remove(key);

    const bytes = this.sizeOf ? Number(this.sizeOf(value)) || 0 : 0;
    this.store.set(key, { value, bytes, expiresAt: Date.now() + ttlMs });
    this.bytes += bytes;

    while (
      this.store.size > this.max ||
      (this.maxBytes > 0 && this.bytes > this.maxBytes && this.store.size > 1)
    ) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey === undefined) break;
      this.#remove(oldestKey);
      this.evictions += 1;
    }

    return value;
  }

  #remove(key) {
    const entry = this.store.get(key);
    if (!entry) return;
    this.bytes -= entry.bytes || 0;
    if (this.bytes < 0) this.bytes = 0;
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
    this.bytes = 0;
  }

  stats() {
    const total = this.hits + this.misses;
    return {
      name: this.name,
      size: this.store.size,
      max: this.max,
      mb: Number((this.bytes / 1024 / 1024).toFixed(1)),
      maxMb: this.maxBytes ? Number((this.maxBytes / 1024 / 1024).toFixed(0)) : null,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRate: total ? Number((this.hits / total).toFixed(3)) : 0
    };
  }
}

/**
 * Gộp các lời gọi trùng key đang chạy đồng thời thành một lần thực thi.
 * Cần thiết cho burst lúc cron 07:01: nhiều account cùng có một skin
 * thì chỉ tải/resize ảnh đó đúng một lần.
 */
export const createSingleFlight = () => {
  const inflight = new Map();

  return (key, factory) => {
    const running = inflight.get(key);
    if (running) return running;

    const promise = (async () => factory())().finally(() => {
      inflight.delete(key);
    });

    inflight.set(key, promise);
    return promise;
  };
};

/**
 * Giới hạn số tác vụ async chạy song song (chống spike RAM/CPU khi render hàng loạt).
 */
export const createLimiter = (concurrency = 6) => {
  let active = 0;
  const queue = [];

  const next = () => {
    if (active >= concurrency || queue.length === 0) return;
    active += 1;
    const { factory, resolve, reject } = queue.shift();
    Promise.resolve()
      .then(factory)
      .then(resolve, reject)
      .finally(() => {
        active -= 1;
        next();
      });
  };

  return (factory) =>
    new Promise((resolve, reject) => {
      queue.push({ factory, resolve, reject });
      next();
    });
};
