import nodemailer from "nodemailer";

// Configure the Gmail transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER, // Your gmail address
    pass: process.env.GMAIL_PASSWORD, // The 16-character App Password
  },
});

export const SendEmail = async (to: string, subject: string, text: string) => {
  try {
    await transporter.sendMail({
      from: '"GOYE Platform" <your-email@gmail.com>',
      to,
      subject,
      html: `<h1>${text}</h1>`,
    });
    console.log("Email sent successfully!");
  } catch (error) {
    console.error("Error sending email:", error);
  }
};