// src/auth/authentication.ts
import { Request } from 'express';
import jwt from 'jsonwebtoken';

export async function expressAuthentication(
  request: Request,
  securityName: string,
  scopes?: string[]
): Promise<any> {
  if (securityName === 'bearerAuth') {
    const token = request.headers['authorization']?.split(' ')[1];

    if (!token) {
      throw new Error('No token provided');
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
  
  throw new Error(`Security scheme ${securityName} not implemented`);
}