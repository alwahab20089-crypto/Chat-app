const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendEmail({ to, subject, html }) {
  await transporter.sendMail({
    from: `"AURA" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
}

function otpEmailTemplate(code, purpose) {
  const heading = purpose === 'password_reset' ? 'Reset your password' : 'Verify your email';
  return `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
    <h2 style="color:#4f46e5;">AURA</h2>
    <p>${heading}</p>
    <div style="font-size: 32px; letter-spacing: 8px; font-weight: bold; background:#f5f3ff; padding: 16px; text-align:center; border-radius: 8px; color:#4338ca;">${code}</div>
    <p style="color:#6b7280; font-size:14px;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
  </div>`;
}

module.exports = { sendEmail, otpEmailTemplate };