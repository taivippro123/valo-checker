import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();
let cachedTransporter = null;

const getMailConfig = () => {
  const host = process.env.SMTP_HOST || '';
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  const from = process.env.MAIL_FROM || user;

  if (!host || !user || !pass || !from) {
    return null;
  }

  return { host, port, secure, auth: { user, pass }, from };
};

const getTransporter = () => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const config = getMailConfig();
  if (!config) {
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth
  });

  return cachedTransporter;
};

export const isMailConfigured = () => Boolean(getMailConfig());

export const sendOtpEmail = async ({ to, otp, fullName = '', language = 'vn' }) => {
  const config = getMailConfig();
  const transporter = getTransporter();

  if (!config || !transporter) {
    throw new Error('MAIL_NOT_CONFIGURED');
  }

  const subject = language === 'en'
    ? 'VALOCHECK password reset OTP'
    : 'Mã OTP đặt lại mật khẩu VALOCHECK';

  const intro = language === 'en'
    ? `Hello ${fullName || 'user'}`
    : `Xin chào ${fullName || 'bạn'}`;

  const text = language === 'en'
    ? `${intro},\n\nYour password reset OTP is: ${otp}\nThis code will expire in 10 minutes.\nIf you did not request this, please ignore this email.\nBest regards,\n\nhttps://valocheck.vercel.app/`
    : `${intro},\n\nMã OTP đặt lại mật khẩu của bạn là: ${otp}\nMã này sẽ hết hạn sau 10 phút.\nNếu bạn không yêu cầu, hãy bỏ qua email này.\nTrân trọng,\n\nhttps://valocheck.vercel.app/`;

  const html = language === 'en'
    ? `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
        <p>${intro},</p>
        <p>Your password reset OTP is:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:4px;margin:16px 0;">${otp}</p>
        <p>This code will expire in 10 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
        <p>Best regards,<br>https://valocheck.vercel.app/</p>
      </div>
    `
    : `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
        <p>${intro},</p>
        <p>Mã OTP đặt lại mật khẩu của bạn là:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:4px;margin:16px 0;">${otp}</p>
        <p>Mã này sẽ hết hạn sau 10 phút.</p>
        <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
        <p>Trân trọng,<br>https://valocheck.vercel.app/</p>
      </div>
    `;

  await transporter.sendMail({
    from: config.from,
    to,
    subject,
    text,
    html
  });
};