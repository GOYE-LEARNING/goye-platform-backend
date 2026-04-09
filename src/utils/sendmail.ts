import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD,
  },
});

const otpTemplate = (otp: string) => `
<div style="background:#121318; min-height:100vh; padding:40px 16px; font-family:Arial,sans-serif;">
  <div style="max-width:520px; margin:0 auto;">

    <div style="text-align:center; margin-bottom:28px;">
      <span style="font-size:18px; font-weight:500; color:#E8EAEF;">GOYE Platform</span>
    </div>

    <div style="background:#1a1d26; border-radius:16px; border:1px solid #252830; overflow:hidden;">

      <div style="background:linear-gradient(135deg,#FFA500 0%,#FBB041 100%); padding:32px; text-align:center;">
        <h1 style="margin:0 0 4px; font-size:22px; color:#121318;">Verify your identity</h1>
        <p style="margin:0; font-size:14px; color:rgba(18,19,24,0.65);">One-time passcode</p>
      </div>

      <div style="padding:32px;">
        <p style="margin:0 0 24px; font-size:15px; color:#B8BCC8; line-height:1.7; text-align:center;">
          Use the code below to complete your verification. It expires in 
          <span style="color:#FBB041; font-weight:500;">5 minutes</span>.
        </p>

        <div style="background:#252830; border-radius:12px; border:1px solid rgba(255,165,0,0.2); padding:24px 16px; text-align:center; margin-bottom:24px;">
          <div style="letter-spacing:14px; font-size:36px; font-weight:bold; color:#FFA500; margin-left:14px;">
            ${otp}
          </div>
          <p style="margin:10px 0 0; font-size:12px; color:#9CA3B0;">Your one-time passcode</p>
        </div>

        <div style="background:rgba(254,153,0,0.05); border-radius:10px; border:1px solid rgba(255,165,0,0.18); padding:14px 16px; margin-bottom:28px;">
          <p style="margin:0; font-size:13px; color:#9CA3B0; line-height:1.6;">
            &#9432; If you did not request this code, you can safely ignore this email. 
            Do not share this code with anyone.
          </p>
        </div>

        <div style="border-top:1px solid #252830; padding-top:20px; text-align:center;">
          <p style="margin:0 0 4px; font-size:13px; color:#9CA3B0;">Need help? Reach us at</p>
          <a href="mailto:support@goye.com" style="font-size:13px; color:#FFA500;">support@goye.com</a>
        </div>
      </div>
    </div>

    <p style="text-align:center; font-size:12px; color:#9CA3B0; margin-top:20px;">
      &copy; 2026 GOYE Platform. All rights reserved.
    </p>
  </div>
</div>`;

const resetPasswordTemplate = (link: string) => `
<div style="background:#121318; min-height:100vh; padding:40px 16px; font-family:Arial,sans-serif;">
  <div style="max-width:520px; margin:0 auto;">

    <div style="text-align:center; margin-bottom:28px;">
      <span style="font-size:18px; font-weight:500; color:#E8EAEF;">GOYE Platform</span>
    </div>

    <div style="background:#1a1d26; border-radius:16px; border:1px solid #252830; overflow:hidden;">

      <div style="background:linear-gradient(135deg,#FFA500 0%,#FBB041 100%); padding:32px; text-align:center;">
        <h1 style="margin:0 0 4px; font-size:22px; color:#121318;">Reset your password</h1>
        <p style="margin:0; font-size:14px; color:rgba(18,19,24,0.65);">Password reset request</p>
      </div>

      <div style="padding:32px;">
        <p style="margin:0 0 10px; font-size:15px; color:#B8BCC8; line-height:1.7; text-align:center;">
          We received a request to reset your GOYE account password.
        </p>
        <p style="margin:0 0 28px; font-size:15px; color:#B8BCC8; line-height:1.7; text-align:center;">
          Click the button below to choose a new password. This link expires in
          <span style="color:#FBB041; font-weight:500;">30 minutes</span>.
        </p>

        <div style="text-align:center; margin-bottom:28px;">
          <a href="${link}" style="display:inline-block; background:#FFA500; color:#121318; font-size:15px; font-weight:500; text-decoration:none; padding:14px 40px; border-radius:10px;">
            Reset password
          </a>
        </div>

        <div style="background:#252830; border-radius:10px; padding:14px 16px; margin-bottom:24px;">
          <p style="margin:0 0 6px; font-size:12px; color:#9CA3B0;">Or copy and paste this link into your browser:</p>
          <p style="margin:0; font-size:12px; color:#FFA500; word-break:break-all;">${link}</p>
        </div>

        <div style="background:rgba(254,153,0,0.05); border-radius:10px; border:1px solid rgba(255,165,0,0.18); padding:14px 16px; margin-bottom:28px;">
          <p style="margin:0; font-size:13px; color:#9CA3B0; line-height:1.6;">
            &#9432; If you did not request a password reset, please ignore this email 
            or contact support immediately. Your password will not change.
          </p>
        </div>

        <div style="border-top:1px solid #252830; padding-top:20px; text-align:center;">
          <p style="margin:0 0 4px; font-size:13px; color:#9CA3B0;">Need help? Reach us at</p>
          <a href="mailto:support@goye.com" style="font-size:13px; color:#FFA500;">support@goye.com</a>
        </div>
      </div>
    </div>

    <p style="text-align:center; font-size:12px; color:#9CA3B0; margin-top:20px;">
      &copy; 2025 GOYE Platform. All rights reserved.
    </p>
  </div>
</div>`;

export const SendEmail = async (
  to: string,
  subject: string,
  content: string,
  type: "otp" | "reset-password" = "otp",
) => {
  const html =
    type === "reset-password"
      ? resetPasswordTemplate(content)
      : otpTemplate(content);

  try {
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to,
      subject,
      html,
    });
    console.log("Email sent successfully!");
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};
