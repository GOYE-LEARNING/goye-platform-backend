// services/userCleanup.ts - Run this separately (e.g., in your server startup)
import prisma from '../db.js';

export class UserCleanupService {
  static async markInactiveUsersOffline(): Promise<void> {
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      
      const result = await prisma.user.updateMany({
        where: {
          lastActive: { lt: fifteenMinutesAgo },
          isOnline: true
        },
        data: {
          isOnline: false
        }
      });
      
      console.log(`Marked ${result.count} inactive users as offline`);
    } catch (error) {
      console.error('Error in user cleanup:', error);
    }
  }
}

// Run every 15 minutes
setInterval(UserCleanupService.markInactiveUsersOffline, 15 * 60 * 1000);

// Also run on server start
UserCleanupService.markInactiveUsersOffline();