import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config();
const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const senderPhone = process.env.TWILIO_PHONE;
console.log('SID:', process.env.TWILIO_SID);
console.log('TOKEN:', process.env.TWILIO_AUTH_TOKEN);
console.log('PHONE:', process.env.TWILIO_PHONE);

if (!accountSid || !authToken || !senderPhone) {
  throw new Error('Twilio credentials are missing in .env');
}

const client = twilio(accountSid, authToken);

export const sendMobileOTP = async (to, otp) => {
  if (!to.startsWith('+')) {
    throw new Error('Phone number must be in E.164 format (e.g., +919999999999)');
  }

  const message = await client.messages.create({
    body: `Your OTP is ${otp}. It will expire in 5 minutes.`,
    from: senderPhone,
    to,
  });

  console.log('✅ SMS sent:', message.sid);
};
