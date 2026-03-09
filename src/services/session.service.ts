// backend/services/session.service.ts
interface DeviceSession {
  userId: string;
  deviceId: string;
  deviceType: 'web' | 'mobile' | 'tablet';
  token: string;
  userType: string;
  createdAt: Date;
  lastActive: Date;
  userAgent?: string;
  ipAddress?: string;
}

export class SessionService {
  private static sessions: Map<string, DeviceSession> = new Map();
  private static userSessions: Map<string, Set<string>> = new Map(); // userId -> Set of deviceIds

  static createSession(
    userId: string,
    deviceId: string,
    deviceType: 'web' | 'mobile' | 'tablet',
    token: string,
    userType: string = 'USER',
    userAgent?: string,
    ipAddress?: string
  ): void {
    
    // For mobile/tablet: Only one session per device type
    if (deviceType === 'mobile' || deviceType === 'tablet') {
      // Remove any existing session of same type
      const userDeviceSet = this.userSessions.get(userId);
      if (userDeviceSet) {
        for (const existingDeviceId of userDeviceSet) {
          const existingSession = this.sessions.get(existingDeviceId);
          if (existingSession && existingSession.deviceType === deviceType) {
            this.sessions.delete(existingDeviceId);
            userDeviceSet.delete(existingDeviceId);
          }
        }
      }
    }

    // For web: Allow multiple tabs (max 5)
    if (deviceType === 'web') {
      const MAX_WEB_SESSIONS = 5;
      const webSessions = this.getUserSessionsByType(userId, 'web');
      
      if (webSessions.length >= MAX_WEB_SESSIONS) {
        // Remove oldest web session
        const oldest = webSessions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
        this.sessions.delete(oldest.deviceId);
        
        const userSet = this.userSessions.get(userId);
        if (userSet) {
          userSet.delete(oldest.deviceId);
        }
      }
    }

    // Create new session
    this.sessions.set(deviceId, {
      userId,
      deviceId,
      deviceType,
      token,
      userType,
      createdAt: new Date(),
      lastActive: new Date(),
      userAgent,
      ipAddress
    });

    // Track user sessions
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId)!.add(deviceId);

    // Auto-cleanup after 24 hours
    setTimeout(() => {
      this.cleanupDevice(deviceId);
    }, 24 * 60 * 60 * 1000);
  }

  static validateSession(deviceId: string, token: string): DeviceSession | null {
    const session = this.sessions.get(deviceId);
    
    if (!session) return null;
    if (session.token !== token) return null;
    
    session.lastActive = new Date();
    return session;
  }

  static hasActiveSessionOnOtherDevice(userId: string, currentDeviceId: string, deviceType: string): boolean {
    const userDeviceSet = this.userSessions.get(userId);
    if (!userDeviceSet) return false;

    // For mobile/tablet: block if any other session exists
    if (deviceType === 'mobile' || deviceType === 'tablet') {
      return userDeviceSet.size > 0;
    }

    // For web: only block if mobile/tablet session exists
    for (const deviceId of userDeviceSet) {
      const session = this.sessions.get(deviceId);
      if (session && (session.deviceType === 'mobile' || session.deviceType === 'tablet')) {
        return true;
      }
    }

    return false;
  }

  static getActiveTabId(userId: string): string | undefined {
    const userDeviceSet = this.userSessions.get(userId);
    if (!userDeviceSet) return undefined;

    // Find the first web session
    for (const deviceId of userDeviceSet) {
      const session = this.sessions.get(deviceId);
      if (session && session.deviceType === 'web') {
        return session.deviceId;
      }
    }
    return undefined;
  }

  static getUserSessionsByType(userId: string, deviceType: string): DeviceSession[] {
    const userDeviceSet = this.userSessions.get(userId);
    if (!userDeviceSet) return [];

    return Array.from(userDeviceSet)
      .map(deviceId => this.sessions.get(deviceId))
      .filter((session): session is DeviceSession => 
        session !== undefined && session.deviceType === deviceType
      );
  }

  static getUserSessions(userId: string): DeviceSession[] {
    const userDeviceSet = this.userSessions.get(userId);
    if (!userDeviceSet) return [];

    return Array.from(userDeviceSet)
      .map(deviceId => this.sessions.get(deviceId))
      .filter((session): session is DeviceSession => session !== undefined);
  }

  static cleanupDevice(deviceId: string): void {
    const session = this.sessions.get(deviceId);
    if (session) {
      const userDeviceSet = this.userSessions.get(session.userId);
      if (userDeviceSet) {
        userDeviceSet.delete(deviceId);
        if (userDeviceSet.size === 0) {
          this.userSessions.delete(session.userId);
        }
      }
      this.sessions.delete(deviceId);
    }
  }

  static cleanupUserSessions(userId: string): void {
    const userDeviceSet = this.userSessions.get(userId);
    if (userDeviceSet) {
      for (const deviceId of userDeviceSet) {
        this.sessions.delete(deviceId);
      }
      this.userSessions.delete(userId);
    }
  }
}