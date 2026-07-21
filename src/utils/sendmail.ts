// utils/sendmail.ts

// Organization Verification OTP Template
const orgVerificationOTPTemplate = (otp: string, organizationName: string) => `
<div style="background:#121318; min-height:100vh; padding:40px 16px; font-family:Arial,sans-serif;">
  <div style="max-width:520px; margin:0 auto;">

    <div style="text-align:center; margin-bottom:28px;">
      <span style="font-size:18px; font-weight:500; color:#E8EAEF;">GOYE Platform</span>
    </div>

    <div style="background:#1a1d26; border-radius:16px; border:1px solid #252830; overflow:hidden;">

      <div style="background:linear-gradient(135deg,#FFA500 0%,#FBB041 100%); padding:32px; text-align:center;">
        <h1 style="margin:0 0 4px; font-size:22px; color:#121318;">Organization Verification</h1>
        <p style="margin:0; font-size:14px; color:rgba(18,19,24,0.65);">${organizationName}</p>
      </div>

      <div style="padding:32px;">
        <p style="margin:0 0 10px; font-size:15px; color:#B8BCC8; line-height:1.7; text-align:center;">
          Thank you for registering <strong style="color:#FFA500;">${organizationName}</strong> on the GOYE Platform.
        </p>
        <p style="margin:0 0 24px; font-size:15px; color:#B8BCC8; line-height:1.7; text-align:center;">
          Please use the verification code below to complete your organization registration. 
          This code expires in <span style="color:#FBB041; font-weight:500;">10 minutes</span>.
        </p>

        <div style="background:#252830; border-radius:12px; border:1px solid rgba(255,165,0,0.2); padding:24px 16px; text-align:center; margin-bottom:24px;">
          <div style="font-size:32px; font-weight:bold; letter-spacing:8px; color:#FFA500;">
            ${otp}
          </div>
          <p style="margin:10px 0 0; font-size:12px; color:#9CA3B0;">Your verification code</p>
        </div>

        <div style="background:rgba(254,153,0,0.05); border-radius:10px; border:1px solid rgba(255,165,0,0.18); padding:14px 16px; margin-bottom:28px;">
          <p style="margin:0; font-size:13px; color:#9CA3B0; line-height:1.6;">
            &#9432; If you did not request this verification, you can safely ignore this email. 
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

// Keep your existing templates
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
          <div style="font-size:28px; font-weight:bold; letter-spacing:4px; color:#FFA500;">
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
      &copy; 2026 GOYE Platform. All rights reserved.
    </p>
  </div>
</div>`;

const invitationTemplate = (
  organizationName: string,
  inviteLink: string,
  userName: string = "",
) => `
<div style="background:#121318; min-height:100vh; padding:40px 16px; font-family:Arial,sans-serif;">
  <div style="max-width:520px; margin:0 auto;">

    <div style="text-align:center; margin-bottom:28px;">
      <span style="font-size:18px; font-weight:500; color:#E8EAEF;">GOYE Platform</span>
    </div>

    <div style="background:#1a1d26; border-radius:16px; border:1px solid #252830; overflow:hidden;">

      <div style="background:linear-gradient(135deg,#FFA500 0%,#FBB041 100%); padding:32px; text-align:center;">
        <h1 style="margin:0 0 4px; font-size:22px; color:#121318;">You're Invited!</h1>
        <p style="margin:0; font-size:14px; color:rgba(18,19,24,0.65);">Join ${organizationName}</p>
      </div>

      <div style="padding:32px;">
        ${
          userName
            ? `<p style="margin:0 0 10px; font-size:15px; color:#B8BCC8; line-height:1.7; text-align:center;">
          Hello ${userName},
        </p>`
            : ""
        }
        <p style="margin:0 0 28px; font-size:15px; color:#B8BCC8; line-height:1.7; text-align:center;">
          You have been invited to join <strong style="color:#FFA500;">${organizationName}</strong> on the GOYE Platform.
          Click the button below to accept your invitation and complete your registration.
        </p>

        <div style="text-align:center; margin-bottom:28px;">
          <a href="${inviteLink}" style="display:inline-block; background:#FFA500; color:#121318; font-size:15px; font-weight:500; text-decoration:none; padding:14px 40px; border-radius:10px;">
            Accept Invitation
          </a>
        </div>

        <div style="background:#252830; border-radius:10px; padding:14px 16px; margin-bottom:24px;">
          <p style="margin:0 0 6px; font-size:12px; color:#9CA3B0;">Or copy and paste this link into your browser:</p>
          <p style="margin:0; font-size:12px; color:#FFA500; word-break:break-all;">${inviteLink}</p>
        </div>

        <div style="background:rgba(254,153,0,0.05); border-radius:10px; border:1px solid rgba(255,165,0,0.18); padding:14px 16px; margin-bottom:28px;">
          <p style="margin:0; font-size:13px; color:#9CA3B0; line-height:1.6;">
            ⓘ This invitation link will expire in <span style="color:#FFA500; font-weight:500;">24 hours</span>. 
            If you did not expect this invitation, you can safely ignore this email.
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

// Platform broadcast / announcement template — renders an arbitrary message
// body (from a super admin) in the branded GOYE style. Unlike the OTP/reset/
// invite templates, the body text is the actual message, not a code or link.
const broadcastTemplate = (message: string, heading: string, userName?: string) => `
<div style="background:#121318; min-height:100vh; padding:40px 16px; font-family:Arial,sans-serif;">
  <div style="max-width:520px; margin:0 auto;">

    <div style="text-align:center; margin-bottom:28px;">
      <span style="font-size:18px; font-weight:500; color:#E8EAEF;">GOYE Platform</span>
    </div>

    <div style="background:#1a1d26; border-radius:16px; border:1px solid #252830; overflow:hidden;">

      <div style="background:linear-gradient(135deg,#FFA500 0%,#FBB041 100%); padding:32px; text-align:center;">
        <h1 style="margin:0; font-size:22px; color:#121318;">${heading}</h1>
      </div>

      <div style="padding:32px;">
        ${userName ? `<p style="margin:0 0 16px; font-size:15px; color:#E8EAEF;">Hi ${userName},</p>` : ""}
        <div style="font-size:15px; color:#B8BCC8; line-height:1.8; white-space:pre-wrap;">${message}</div>

        <div style="border-top:1px solid #252830; padding-top:20px; margin-top:28px; text-align:center;">
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

// Updated SendEmail function with organization verification support
export const SendEmail = async (
  to: string,
  subject: string,
  content: string,
  type: "otp" | "reset-password" | "invitation" | "org-verification" | "broadcast" = "otp",
  additionalData?: { organizationName?: string; userName?: string; heading?: string },
) => {
  let html: string;

  if (type === "reset-password") {
    html = resetPasswordTemplate(content);
  } else if (type === "invitation") {
    html = invitationTemplate(
      additionalData?.organizationName || "Organization",
      content, // content is the invite link
      additionalData?.userName || "",
    );
  } else if (type === "org-verification") {
    html = orgVerificationOTPTemplate(
      content, // content is the OTP
      additionalData?.organizationName || "Your Organization",
    );
  } else if (type === "broadcast") {
    html = broadcastTemplate(
      content, // content is the message body
      additionalData?.heading || subject,
      additionalData?.userName,
    );
  } else {
    html = otpTemplate(content);
  }

  // Get sender email from environment variables
  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.GMAIL_USER;

  if (!senderEmail) {
    throw new Error(
      "No sender email configured. Set BREVO_SENDER_EMAIL or GMAIL_USER",
    );
  }

  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    throw new Error("No Brevo API key configured. Set BREVO_API_KEY");
  }

  console.log(`[Email] Sending ${type} email to ${to} from ${senderEmail}`);

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "GOYE Platform",
          email: senderEmail,
        },
        to: [{ email: to }],
        subject: subject,
        htmlContent: html,
        replyTo: {
          email: "support@goye.com",
          name: "GOYE Support",
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Email] Brevo API Error:", {
        status: response.status,
        statusText: response.statusText,
        error: data,
      });
      throw new Error(
        `Brevo API Error: ${data.message || JSON.stringify(data)}`,
      );
    }

    console.log("[Email] Sent successfully! Message ID:", data.messageId);
    return data;
  } catch (error) {
    console.error("[Email] Failed to send:", error);
    throw error;
  }
};

// Helper function specifically for organization verification
export const sendOrganizationVerificationOTP = async (
  email: string,
  otp: string,
  organizationName: string,
) => {
  return SendEmail(
    email,
    `Verify Your Organization - ${organizationName}`,
    otp,
    "org-verification",
    { organizationName },
  );
};
