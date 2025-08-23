import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();

const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SID;

if (!accountSid || !authToken || !verifySid) {
  throw new Error("❌ Twilio credentials are missing in .env");
}

const client = twilio(accountSid, authToken);

/**
 * ✅ Send OTP to mobile
 * @param {string} to - Phone number in E.164 format (+91XXXXXXXXXX)
 */
export const sendMobileOTP = async (to) => {
  if (!to.startsWith("+")) {
    throw new Error("Phone number must be in E.164 format (e.g., +919999999999)");
  }

  const verification = await client.verify.v2.services(verifySid).verifications.create({
    to,
    channel: "sms", // can also be "call" or "whatsapp"
  });

  console.log("✅ OTP sent:", verification.sid);
  return verification;
};

/**
 * ✅ Verify OTP entered by user
 * @param {string} to - Phone number in E.164 format
 * @param {string} code - OTP code entered by user
 */
export const verifyMobileOTP = async (to, code) => {
  const result = await client.verify.v2.services(verifySid).verificationChecks.create({
    to,
    code,
  });

  if (result.status === "approved") {
    console.log("🎉 OTP verified successfully!");
    return true;
  } else {
    console.log("❌ OTP verification failed:", result.status);
    return false;
  }
};
