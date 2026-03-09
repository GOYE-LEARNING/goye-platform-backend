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
  
  // IMMEDIATE SAFETY CHECK: Skip middleware for public routes
  const publicPatterns = ['/login', '/signup', '/sendOtp', '/verify-otp', '/forgot-password', '/health', '/docs'];
  const fullPath = req.originalUrl || req.url;
  const path = req.path;
  
  if (publicPatterns.some(pattern => fullPath.includes(pattern) || path.includes(pattern))) {
    console.log(`🔓 Public route detected: ${path} - passing through`);
    return next();
  }

  console.log('🔐 ===== DEVICE-AWARE AUTH MIDDLEWARE RUNNING =====');
  console.log('Path:', path);
  console.log('Method:', req.method);
  console.log('Cookies present:', !!req.cookies?.token);
  console.log('X-Tab-ID header:', req.headers['x-tab-id']);
  console.log('User-Agent:', req.headers['user-agent']?.substring(0, 50));
  
  try {
    const token = req.cookies?.token;
    
    if (!token) {
      console.log('❌ No token found - unauthorized');
      return res.status(401).json({ 
        message: 'Unauthorized - Missing token',
        code: 'MISSING_TOKEN'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.BEARERAUTH_SECRET as string) as any;
    console.log('✅ Token verified for user:', decoded.id || decoded.userId);
    
    // Get user ID based on type
    let userId: string;
    let userType: string;

    if (decoded.type === 'ORGANIZATION') {
      userId = decoded.userId || decoded.id;
      userType = 'ORGANIZATION';
    } else {
      userId = decoded.id || decoded.userId;
      userType = decoded.type || 'USER';
    }

    // Detect device type and generate device ID
    const userAgent = req.headers['user-agent'] || '';
    const deviceType = detectDeviceType(userAgent);
    console.log('📱 Device type:', deviceType);
    
    // For web: use tab ID from header, for mobile: generate stable ID
    let deviceId: string;
    
    if (deviceType === 'web') {
      const tabId = req.headers['x-tab-id'] as string;
      if (!tabId) {
        console.log('❌ Web access missing tab ID');
        return res.status(401).json({
          message: 'Web access requires tab ID',
          code: 'MISSING_TAB_ID'
        });
      }
      deviceId = `web_tab_${tabId}`;
      console.log('🆔 Web device ID:', deviceId);
    } else {
      // For mobile/tablet, generate a stable device ID from user agent and IP
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      deviceId = `${deviceType}_${Buffer.from(userAgent + ipAddress).toString('base64').substring(0, 30)}`;
      console.log('🆔 Mobile device ID:', deviceId);
    }

    // Validate session
    const session = await SessionService.validateSession(deviceId, token);
    
    if (!session) {
      console.log('🆕 No existing session, checking for conflicts...');
      
      // For mobile/tablet: if there are web sessions, kill them and allow mobile
      if (deviceType === 'mobile' || deviceType === 'tablet') {
        const activeSessions = await SessionService.getUserSessions(userId);
        const webSessions = activeSessions.filter(s => s.deviceType === 'web');
        
        if (webSessions.length > 0) {
          console.log(`📱 Mobile logging in - killing ${webSessions.length} web sessions`);
          
          // Kill all web sessions
          for (const session of webSessions) {
            await SessionService.deleteSession(session.deviceId);
          }
          
          // Allow mobile to proceed
          console.log('✅ Creating new mobile session');
          await SessionService.createSession(
            userId, 
            deviceId, 
            deviceType, 
            token, 
            userType,
            userAgent,
            req.ip || req.connection.remoteAddress
          );
          
          req.user = decoded;
          req.deviceId = deviceId;
          req.deviceType = deviceType;
          
          console.log('🎉 Mobile login with web sessions killed - proceeding');
          return next();
        }
      }
      
      // Check if this user has a session on another device
      const hasConflict = await SessionService.hasActiveSessionOnOtherDevice(
        userId, 
        deviceId, 
        deviceType
      );
      
      if (hasConflict) {
        // Get active sessions to provide more info
        const activeSessions = await SessionService.getUserSessions(userId);
        const activeDeviceTypes = activeSessions.map(s => s.deviceType).join(', ');
        console.log('⚠️ Conflict detected! Active devices:', activeDeviceTypes);
        
        return res.status(409).json({
          message: deviceType === 'mobile' || deviceType === 'tablet'
            ? `Account is already logged in on another device (${activeDeviceTypes}). Please logout first.`
            : `Account is already logged in on a mobile device. Please logout from that device first.`,
          code: 'DEVICE_CONFLICT',
          activeDevices: activeDeviceTypes
        });
      }

      // Create new session
      console.log('✅ Creating new session for device:', deviceId);
      await SessionService.createSession(
        userId, 
        deviceId, 
        deviceType, 
        token, 
        userType,
        userAgent,
        req.ip || req.connection.remoteAddress
      );
    } else {
      console.log('✅ Existing session validated for device:', deviceId);
    }

    // Attach user info and device info to request
    req.user = decoded;
    req.deviceId = deviceId;
    req.deviceType = deviceType;

    console.log('🎉 Middleware complete - proceeding to route handler');
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      console.log('❌ Invalid token:', error.message);
      return res.status(401).json({ 
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    if (error instanceof jwt.TokenExpiredError) {
      console.log('❌ Token expired');
      return res.status(401).json({ 
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    console.error('❌ Middleware error:', error);
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