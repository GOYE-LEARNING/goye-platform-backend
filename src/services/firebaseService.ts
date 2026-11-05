// services/firebaseAuthService.ts
import { auth } from '../config/firebaseConfig';
import prisma from '../db';

export interface GoogleUser {
  uid: string;
  email: string;
  name: string;
  picture: string | null;
  emailVerified: boolean;
}

/**
 * Read-only result of checking whether an account already exists for this
 * Google identity. `new` means no user row exists — the caller should
 * proceed with signup (and create the user via /signup after OTP). The
 * `existing_*` variants mean a user row already exists — the caller should
 * run the login flow for that user.
 */
export type GoogleLookupResult =
  | { kind: "new"; googleUser: GoogleUser }
  | { kind: "existing_linked"; user: any; isProfileComplete: boolean }
  | { kind: "existing_by_email"; user: any; isProfileComplete: boolean };

export class FirebaseAuthService {
  async verifyGoogleToken(idToken: string): Promise<GoogleUser | null> {
    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      const userRecord = await auth.getUser(decodedToken.uid);

      if (!userRecord.email) {
        console.error('No email provided from Google');
        return null;
      }

      return {
        uid: userRecord.uid,
        email: userRecord.email,
        name: userRecord.displayName || userRecord.email.split('@')[0],
        picture: userRecord.photoURL || null,
        emailVerified: userRecord.emailVerified || false,
      };
    } catch (error) {
      console.error('Google token verification failed:', error);
      return null;
    }
  }

  /**
   * Read-only lookup. Never writes to the DB.
   *
   * Resolution order:
   *   1. Account already linked by firebase_uid  → existing_linked
   *   2. Account already exists by email         → existing_by_email
   *   3. Neither                                  → new
   *
   * Callers use `new` to route to the signup form (prefill only) and
   * `existing_*` to route to the login/dashboard flow. The actual user
   * creation happens in /signup after OTP verification.
   */
  async lookupGoogleUser(googleUser: GoogleUser): Promise<GoogleLookupResult> {
    const byUid = await prisma.user.findFirst({
      where: { firebase_uid: googleUser.uid },
    });
    if (byUid) {
      return {
        kind: "existing_linked",
        user: byUid,
        isProfileComplete: byUid.isProfileComplete === true,
      };
    }

    const byEmail = await prisma.user.findFirst({
      where: { email_address: googleUser.email },
    });
    if (byEmail) {
      return {
        kind: "existing_by_email",
        user: byEmail,
        isProfileComplete: byEmail.isProfileComplete === true,
      };
    }

    return { kind: "new", googleUser };
  }
}

export const firebaseAuthService = new FirebaseAuthService();