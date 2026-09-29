import crypto from 'crypto';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

const TOO_FAST_MESSAGE = {
  message: 'Bạn sử dụng quá nhanh, vui lòng thử lại sau'
};

const createRequestLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 5,
  keyGenerator
} = {}) => rateLimit({
  windowMs,
  max,
  ...(keyGenerator ? { keyGenerator } : {}),
  standardHeaders: false,
  legacyHeaders: false,
  message: TOO_FAST_MESSAGE
});

export const storeCheckLimiter = createRequestLimiter();
export const loginLimiter = createRequestLimiter();
export const registrationLimiter = createRequestLimiter({
  windowMs: 24 * 60 * 60 * 1000
});
export const passwordResetOtpLimiter = createRequestLimiter();
export const passwordResetOtpIdentifierLimiter = createRequestLimiter({ keyGenerator: (req) => {
  const identifier = String(req.body?.identifier || '').trim().toLowerCase();
  const key = identifier || `ip:${ipKeyGenerator(req.ip || 'unknown')}`;
  return crypto.createHash('sha256').update(key).digest('hex');
} });
export const passwordResetLimiter = createRequestLimiter();
export const passwordResetIdentifierLimiter = createRequestLimiter({ keyGenerator: (req) => {
  const identifier = String(req.body?.identifier || '').trim().toLowerCase();
  const key = identifier || `ip:${ipKeyGenerator(req.ip || 'unknown')}`;
  return crypto.createHash('sha256').update(key).digest('hex');
} });