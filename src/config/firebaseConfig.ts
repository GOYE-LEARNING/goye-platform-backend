import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Check for environment variables first (Render production)
    if (process.env.FIREBASE_PROJECT_ID && 
        process.env.FIREBASE_CLIENT_EMAIL && 
        process.env.FIREBASE_PRIVATE_KEY) {
      
      // Production: Use environment variables
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
      
      console.log('✅ Firebase Admin initialized with environment variables');
      
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      
      // Alternative: Use JSON string from environment
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      
      console.log('✅ Firebase Admin initialized with JSON environment variable');
      
    } else {
      
      // Development: Try to load local file
      try {
        // Try different possible paths
        const fs = require('fs');
        const path = require('path');
        
        const possiblePaths = [
          path.resolve(__dirname, '../utils/service_account.json'),
          path.resolve(__dirname, '../../utils/service_account.json'),
          path.resolve(process.cwd(), 'utils/service_account.json'),
          path.resolve(process.cwd(), 'service_account.json'),
        ];
        
        let serviceAccountPath = null;
        
        for (const p of possiblePaths) {
          if (fs.existsSync(p)) {
            serviceAccountPath = p;
            break;
          }
        }
        
        if (serviceAccountPath) {
          const serviceAccount = require(serviceAccountPath);
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
          console.log(`✅ Firebase Admin initialized with local file: ${serviceAccountPath}`);
        } else {
          throw new Error('No service account file found in any expected location');
        }
      } catch (fileError) {
        console.error('❌ No Firebase credentials found');
        throw new Error('Firebase Admin initialization failed: No credentials provided');
      }
    }
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin:', error);
    throw new Error('Firebase Admin initialization failed');
  }
}

export const auth = admin.auth();
export const firestore = admin.firestore();
export default admin;