import nodemailer from 'nodemailer';

// Reuse transporter instance (don't create new one per request)
let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    throw new Error('SMTP_EMAIL and SMTP_PASSWORD environment variables are required');
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
    pool: true, // Use pooled connections
    maxConnections: 5,
  });

  return transporter;
};

export const sendEmailOTP = async (to, otp) => {
  if (!to || !otp) {
    throw new Error('Email and OTP are required');
  }

  const mailTransporter = getTransporter();
  const appName = process.env.APP_NAME || 'PCP';

  const mailOptions = {
    from: `${appName} <${process.env.SMTP_EMAIL}>`,
    to,
    subject: `${appName} - Your Verification Code`,
    text: `Your verification code is: ${otp}\n\nThis code will expire in 5 minutes.\n\nIf you didn't request this code, please ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Verification Code</h2>
        <p>Your verification code is:</p>
        <h1 style="font-size: 32px; letter-spacing: 5px; color: #007bff; background: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px;">${otp}</h1>
        <p style="color: #666;">This code will expire in 5 minutes.</p>
        <p style="color: #999; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
      </div>
    `,
  };

  try {
    await mailTransporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Failed to send email:', error.message);
    throw new Error('Failed to send verification email. Please try again.');
  }
};