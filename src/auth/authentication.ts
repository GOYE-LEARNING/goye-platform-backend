import { Request } from 'express';
import jwt from 'jsonwebtoken';

export async function expressAuthentication(
  request: Request,
  securityName: string,
  scopes?: string[]
): Promise<any> {
  if (securityName === 'bearerAuth') {
    // Look for token in both cookie and header
    const tokenFromCookie = request.cookies?.token;
    const tokenFromHeader = request.headers['authorization']?.split(' ')[1];
    const token = tokenFromCookie || tokenFromHeader;

    if (!token) {
      throw new Error('No token provided');
    }

    try {
      const decoded = jwt.verify(token, process.env.BEARERAUTH_SECRET!);
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  throw new Error(`Security scheme ${securityName} not implemented`);
}
