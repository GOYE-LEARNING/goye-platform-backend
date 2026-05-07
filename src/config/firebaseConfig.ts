// config/firebaseConfig.ts
import admin from 'firebase-admin';
import * as path from 'path';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    const serviceAccountPath = path.resolve(__dirname, '../utils/service_account.json');
    
    admin.initializeApp({
      credential: admin.credential.cert(require(serviceAccountPath))
    });
    
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin:', error);
    throw new Error('Firebase Admin initialization failed');
  }
}

export const auth = admin.auth();
export default admin;