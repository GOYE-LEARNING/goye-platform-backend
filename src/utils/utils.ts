import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_KEY)
export const SendEmail = async (to: string, subject: string, text: string) => {
    await resend.emails.send({
        from: 'seanimayi@gmail.com',
        to,
        subject,
        html: `<h1>${text}</h1>`
    })
};
