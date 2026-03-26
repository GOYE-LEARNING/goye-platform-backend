import CryptoJS from "crypto-js";
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY

export class EncryptionUtil {
  static encrypt(text: string): string {
    try {
      if (!text) return text;
      const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
      return encrypted;
    } catch (error) {
      console.error(error.message);
      return;
    }
  }

  static decrypt(encryptedText: string): string {
    try {
      if (!encryptedText) return encryptedText;
      const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      return decrypted;
    } catch (error) {
      console.error(error.message);
      return encryptedText;
    }
  }

  static isEncrypted(text: string): boolean {
    if (!text) return false;
    return /^U2FsdGVkX1/.test(text) || /^[A-Za-z0-9+/=]+$/.test(text);
  }
}
