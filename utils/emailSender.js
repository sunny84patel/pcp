import nodemailer from 'nodemailer';

export const sendEmailOTP = async (to, otp) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail', // or use your provider like Outlook, etc.
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const mailOptions = {
    from: `Your App <${process.env.SMTP_EMAIL}>`,
    to,
    subject: 'Your OTP Code',
    text: `Your OTP code is: ${otp}. It will expire in 5 minutes.`,
  };

  await transporter.sendMail(mailOptions);
};
