import nodemailer from "nodemailer";

export const SendEmail = async (to: string, subject: string, text: string) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `GOYE VERIFICATION <${process.env.GMAIL_USER}>`,
    to,
    subject,
    text,
  });
};
