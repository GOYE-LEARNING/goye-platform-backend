// backend/middleware/device-aware-auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { SessionService } from '../services/session.service';

// Extend Request type
interface AuthenticatedRequest extends Request {
  user?: any;
  org?: any;
  deviceId?: string;
  deviceType?: string;
}

export const deviceAwareAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.token;
    
    if (!token) {
      return res.status(401).json({ 
        message: 'Unauthorized - Missing token',
        code: 'MISSING_TOKEN'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.BEARERAUTH_SECRET as string) as any;
    
    // Get user ID based on type
    let userId: string;
    let userType: string;

    if (decoded.type === 'ORGANIZATION') {
      userId = decoded.userId;
      userType = 'ORGANIZATION';
    } else {
      userId = decoded.id;
      userType = decoded.type || 'USER';
    }

    // Detect device type and generate device ID
    const userAgent = req.headers['user-agent'] || '';
    const deviceType = detectDeviceType(userAgent);
    
    // For web: use tab ID from header, for mobile: generate stable ID
    let deviceId: string;
    
    if (deviceType === 'web') {
      const tabId = req.headers['x-tab-id'] as string;
      if (!tabId) {
        return res.status(401).json({
          message: 'Web access requires tab ID',
          code: 'MISSING_TAB_ID'
        });
      }
      deviceId = `web_tab_${tabId}`;
    } else {
      // For mobile/tablet, generate a stable device ID from user agent and IP
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      deviceId = `${deviceType}_${Buffer.from(userAgent + ipAddress).toString('base64').substring(0, 30)}`;
    }

    // Validate session
    const session = SessionService.validateSession(deviceId, token);
    
    if (!session) {
      // Check if this user has a session on another device
      const hasConflict = SessionService.hasActiveSessionOnOtherDevice(
        userId, 
        deviceId, 
        deviceType
      );
      
      if (hasConflict) {
        // Get active sessions to provide more info
        const activeSessions = SessionService.getUserSessions(userId);
        const activeDeviceTypes = activeSessions.map(s => s.deviceType).join(', ');
        
        return res.status(409).json({
          message: deviceType === 'mobile' || deviceType === 'tablet'
            ? `Account is already logged in on another device (${activeDeviceTypes}). Please logout first.`
            : `Account is already logged in on a mobile device. Please logout from that device first.`,
          code: 'DEVICE_CONFLICT',
          activeDevices: activeDeviceTypes
        });
      }

      // Create new session
      SessionService.createSession(
        userId, 
        deviceId, 
        deviceType, 
        token, 
        userType,
        userAgent,
        req.ip || req.connection.remoteAddress
      );
    }

    // Attach user info and device info to request
    req.user = decoded;
    req.deviceId = deviceId;
    req.deviceType = deviceType;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ 
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ 
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
};

// Helper function to detect device type
function detectDeviceType(userAgent: string): 'web' | 'mobile' | 'tablet' {
  const ua = userAgent.toLowerCase();
  
  // Check for mobile devices
  if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(ua)) {
    return 'mobile';
  }
  
  // Check for tablets
  if (/ipad|tablet|kindle|silk/i.test(ua)) {
    return 'tablet';
  }
  
  // Default to web
  return 'web';
}