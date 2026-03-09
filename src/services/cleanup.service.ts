import { SessionService } from './session.service';

export const startCleanupJob = () => {
  // Run every hour
  setInterval(async () => {
    console.log('🧹 Running cleanup of expired sessions...');
    await SessionService.cleanupExpiredSessions();
  }, 60 * 60 * 1000); // 1 hour
};