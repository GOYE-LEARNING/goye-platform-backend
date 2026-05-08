declare module "@getbrevo/brevo" {
  export class TransactionalEmailsApi {
    setApiKey(key: string, value: string): void;
    sendTransacEmail(email: any): Promise<any>;
  }
  
  export class SendSmtpEmail {
    subject?: string;
    htmlContent?: string;
    sender?: { name: string; email: string };
    to?: Array<{ email: string }>;
    replyTo?: { email: string; name: string };
  }
  
  export const TransactionalEmailsApiApiKeys: {
    apiKey: string;
  };
}