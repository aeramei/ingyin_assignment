// lib/gmail.ts - CORRECT VERSION
import nodemailer from "nodemailer";

// Configure your email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD, // Use app password for Gmail
  },
});

export async function sendOTPEmail(email: string, otp: string, name: string) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your SyncTech Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #67e8f9, #0ea5e9); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">SYNCTECH</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Email Verification</p>
          </div>
          
          <div style="padding: 30px; background: #f8fafc;">
            <h2 style="color: #1e293b; margin-bottom: 20px;">Hello ${name},</h2>
            <p style="color: #475569; line-height: 1.6;">
              Thank you for registering with SyncTech. Use the verification code below to complete your registration:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="display: inline-block; background: #1e293b; color: white; 
                         padding: 15px 30px; border-radius: 10px; font-size: 32px; 
                         letter-spacing: 8px; font-weight: bold; font-family: monospace;">
                ${otp}
              </div>
            </div>
            
            <p style="color: #475569; line-height: 1.6;">
              This code will expire in 10 minutes. If you didn't request this code, please ignore this email.
            </p>
          </div>
          
          <div style="background: #1e293b; color: #94a3b8; padding: 20px; text-align: center; font-size: 12px;">
            <p>© 2024 SyncTech. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`OTP email sent to ${email}`);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}
