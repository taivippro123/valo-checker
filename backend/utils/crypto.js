import crypto from 'crypto';

const getKey = () => {
  const rawKey = process.env.ENCRYPTION_KEY || 'valo-check-default-encryption-key';

  if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    return Buffer.from(rawKey, 'hex');
  }

  return crypto.createHash('sha256').update(rawKey).digest();
};

export const encryptText = (value) => {
  if (!value) return '';

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
};

export const decryptText = (payload) => {
  if (!payload || typeof payload !== 'string') return '';

  const parts = payload.split(':');
  if (parts.length !== 3) return payload;

  const [ivValue, tagValue, encryptedValue] = parts;
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivValue, 'base64'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64')),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
};
