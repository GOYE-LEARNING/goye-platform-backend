// services/session.service.ts (new database version)
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
  }

  static async validateSession(deviceId: string, token: string): Promise<any | null> {
    const session = await prisma.userSession.findUnique({
      where: { deviceId }
    });

    if (!session) return null;
    if (session.token !== token) return null;
    if (session.expiresAt < new Date()) {
      await this.deleteSession(deviceId);
      return null;
    }

    await prisma.userSession.update({
      where: { deviceId },
      data: { lastActive: new Date() }
    });

    return session;
  }

  static async hasActiveSessionOnOtherDevice(
    userId: string, 
    currentDeviceId: string, 
    deviceType: string
  ): Promise<boolean> {
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
  }

  static async getUserSessions(userId: string): Promise<any[]> {
    return prisma.userSession.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() }
      },
      orderBy: { lastActive: 'desc' }
    });
  }

  static async deleteSession(deviceId: string): Promise<void> {
    await prisma.userSession.deleteMany({
      where: { deviceId }
    });
  }

  static async deleteAllUserSessions(userId: string): Promise<void> {
    await prisma.userSession.deleteMany({
      where: { userId }
    });
  }

  static async cleanupExpiredSessions(): Promise<void> {
    await prisma.userSession.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });
  }
}