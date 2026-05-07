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

export interface FindUserResult {
  user: any;
  isExistingUser: boolean;
  isProfileComplete: boolean;
  message: string;
}

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
        emailVerified: userRecord.emailVerified || false
      };
    } catch (error) {
      console.error('Google token verification failed:', error);
      return null;
    }
  }

  async findOrCreateGoogleUser(googleUser: GoogleUser): Promise<FindUserResult> {
    try {
      // Check if user exists by firebase_uid
      let user = await prisma.user.findFirst({
        where: { firebase_uid: googleUser.uid }
      });

      let isExistingUser = false;
      let isProfileComplete = false;
      let message = "";

      // USER EXISTS BY FIREBASE_UID
      if (user) {
        isExistingUser = true;
        isProfileComplete = user.isProfileComplete === true;
        message = isProfileComplete ? "User exists and profile is complete" : "User exists but profile is incomplete";
        
        console.log(`✅ User found by firebase_uid: ${user.email_address}, Profile Complete: ${isProfileComplete}`);
        return { user, isExistingUser, isProfileComplete, message };
      }

      // CHECK IF USER EXISTS BY EMAIL
      user = await prisma.user.findFirst({
        where: { email_address: googleUser.email }
      });

      // USER EXISTS BY EMAIL - LINK GOOGLE ACCOUNT
      if (user) {
        isExistingUser = true;
        
        // Check if profile is already complete
        isProfileComplete = user.isProfileComplete || 
          (user.country && user.country !== "" && 
           user.state && user.state !== "" && 
           user.phone_number && user.phone_number !== "");
        
        message = isProfileComplete ? "User exists and profile is complete" : "User exists but profile is incomplete";
        
        // Link Google account to existing user
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            firebase_uid: googleUser.uid,
            provider: "GOOGLE",
            user_pic: googleUser.picture || user.user_pic,
            isProfileComplete: isProfileComplete
          }
        });
        
        console.log(`🔗 Linked Google account to existing user: ${user.email_address}, Profile Complete: ${isProfileComplete}`);
        return { user, isExistingUser, isProfileComplete, message };
      }

      // USER DOES NOT EXIST - CREATE NEW USER
      // Parse name from googleUser
      const nameParts = googleUser.name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '';

      // Create new user
      user = await prisma.user.create({
        data: {
          email_address: googleUser.email,
          first_name: firstName,
          last_name: lastName,
          firebase_uid: googleUser.uid,
          provider: "GOOGLE",
          user_pic: googleUser.picture,
          password: null,
          form_type: "INDIVIDUAL",
          role: "student",
          country: "",
          state: "",
          phone_number: "",
          level: "1",
          isProfileComplete: false,
          isOnline: true,
          lastActive: new Date()
        }
      });

      isExistingUser = false;
      isProfileComplete = false;
      message = "User does not exist - New user created";

      console.log(`✨ Created new Google user: ${user.email_address}`);
      return { user, isExistingUser, isProfileComplete, message };

    } catch (error) {
      console.error('Error in findOrCreateGoogleUser:', error);
      throw error;
    }
  }
}

export const firebaseAuthService = new FirebaseAuthService();