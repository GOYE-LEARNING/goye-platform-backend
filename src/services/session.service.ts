import prisma from "../db";

export class SessionService {
  
  static async createSession(
    userId: string,
    deviceId: string,
    deviceType: 'web' | 'mobile' | 'tablet',
    token: string,
    userType: string = 'USER',
    userAgent?: string,
    ipAddress?: string
  ): Promise<void> {
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    try {
      // For mobile/tablet: Delete any existing sessions of same type
      if (deviceType === 'mobile' || deviceType === 'tablet') {
        await prisma.userSession.deleteMany({
          where: {
            userId,
            deviceType: deviceType
          }
        });
      }

      // For web: Limit to 5 sessions
      if (deviceType === 'web') {
        const webSessions = await prisma.userSession.findMany({
          where: {
            userId,
            deviceType: 'web'
          },
          orderBy: {
            lastActive: 'asc'
          }
        });

        if (webSessions.length >= 5) {
          const oldestSession = webSessions[0];
          await prisma.userSession.delete({
            where: { id: oldestSession.id }
          });
        }
      }

      // Create or update session
      await prisma.userSession.upsert({
        where: { deviceId },
        update: {
          token,
          lastActive: new Date(),
          expiresAt,
          userAgent,
          ipAddress
        },
        create: {
          userId,
          deviceId,
          deviceType,
          token,
          userType,
          expiresAt,
          userAgent,
          ipAddress
        }
      });

      // Clean up expired sessions
      await this.cleanupExpiredSessions();
    } catch (error) {
      console.error('Error in createSession:', error.message);
      throw error;
    }
  }

  static async validateSession(deviceId: string, token: string): Promise<any | null> {
    try {
      const session = await prisma.userSession.findUnique({
        where: { deviceId }
      });

      if (!session) {
        console.log('No session found for device:', deviceId);
        return null;
      }
      
      if (session.token !== token) {
        console.log('Token mismatch for device:', deviceId);
        return null;
      }
      
      if (session.expiresAt < new Date()) {
        console.log('Session expired for device:', deviceId);
        await this.deleteSession(deviceId);
        return null;
      }

      // Update last active - with error handling
      try {
        const updatedSession = await prisma.userSession.update({
          where: { deviceId },
          data: { lastActive: new Date() }
        });
        return updatedSession;
      } catch (updateError) {
        // If update fails (maybe session was deleted), return the original session
        console.log('Session update failed, returning cached session:', updateError.message);
        return session;
      }
    } catch (error) {
      console.error('Error in validateSession:', error.message);
      return null;
    }
  }

  static async hasActiveSessionOnOtherDevice(
    userId: string, 
    currentDeviceId: string, 
    deviceType: string
  ): Promise<boolean> {
    try {
      const activeSessions = await prisma.userSession.findMany({
        where: {
          userId,
          expiresAt: { gt: new Date() }
        }
      });

      // For mobile: block if any other session exists
      if (deviceType === 'mobile' || deviceType === 'tablet') {
        return activeSessions.some(s => s.deviceId !== currentDeviceId);
      }

      // For web: only block if mobile/tablet session exists
      return activeSessions.some(s => 
        (s.deviceType === 'mobile' || s.deviceType === 'tablet') && 
        s.deviceId !== currentDeviceId
      );
    } catch (error) {
      console.error('Error in hasActiveSessionOnOtherDevice:', error.message);
      return false; // Fail open - allow login if we can't check
    }
  }

  static async getUserSessions(userId: string): Promise<any[]> {
    try {
      return await prisma.userSession.findMany({
        where: {
          userId,
          expiresAt: { gt: new Date() }
        },
        orderBy: { lastActive: 'desc' }
      });
    } catch (error) {
      console.error('Error in getUserSessions:', error.message);
      return [];
    }
  }

  static async deleteSession(deviceId: string): Promise<void> {
    try {
      await prisma.userSession.deleteMany({
        where: { deviceId }
      });
    } catch (error) {
      console.error('Error in deleteSession:', error.message);
    }
  }

  static async deleteAllUserSessions(userId: string): Promise<void> {
    try {
      await prisma.userSession.deleteMany({
        where: { userId }
      });
    } catch (error) {
      console.error('Error in deleteAllUserSessions:', error.message);
    }
  }

  static async cleanupExpiredSessions(): Promise<void> {
    try {
      const result = await prisma.userSession.deleteMany({
        where: {
          expiresAt: { lt: new Date() }
        }
      });
      if (result.count > 0) {
        console.log(`🧹 Cleaned up ${result.count} expired sessions`);
      }
    } catch (error) {
      console.error('Error in cleanupExpiredSessions:', error.message);
    }
  }
}