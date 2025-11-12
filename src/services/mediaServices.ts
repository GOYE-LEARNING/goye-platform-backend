import { bucket } from "../utils/firebase.js";

export class MediaService {
  static async uploadUserAvatar(
    userId: string,
    file: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<{ url: string; error: string | null }> {
    try {
      const fileExt = fileName.split(".").pop();
      const filePath = `user_avatars/${userId}/avatar-${Date.now()}.${fileExt}`;

      // Upload to Firebase
      const fileUpload = bucket.file(filePath);
      
      await fileUpload.save(file, {
        metadata: {
          contentType: mimeType,
          metadata: {
            userId: userId,
            uploadedAt: new Date().toISOString()
          }
        }
      });

      // Make file publicly accessible
      await fileUpload.makePublic();

      // Get public URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
      
      return { url: publicUrl, error: null };
    } catch (error: any) {
      console.error('Firebase upload error:', error);
      return { url: "", error: error.message };
    }
  }

  // Upload course image
  static async uploadCourseImage(
    courseId: string,
    file: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<{ url: string; error: string | null }> {
    try {
      const fileExt = fileName.split('.').pop();
      const filePath = `course_images/${courseId}/images/${Date.now()}.${fileExt}`;

      const fileUpload = bucket.file(filePath);
      
      await fileUpload.save(file, {
        metadata: { 
          contentType: mimeType,
          metadata: {
            courseId: courseId,
            uploadedAt: new Date().toISOString()
          }
        }
      });

      await fileUpload.makePublic();
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

      return { url: publicUrl, error: null };
    } catch (error: any) {
      return { url: '', error: error.message };
    }
  }

  // Upload lesson video
  static async uploadLessonVideo(
    courseId: string,
    moduleId: string,
    file: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<{ url: string; error: string | null }> {
    try {
      const fileExt = fileName.split('.').pop();
      const filePath = `lesson_videos/${courseId}/modules/${moduleId}/videos/${Date.now()}.${fileExt}`;

      const fileUpload = bucket.file(filePath);
      
      await fileUpload.save(file, {
        metadata: { 
          contentType: mimeType,
          metadata: {
            courseId: courseId,
            moduleId: moduleId,
            uploadedAt: new Date().toISOString()
          }
        }
      });

      await fileUpload.makePublic();
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

      return { url: publicUrl, error: null };
    } catch (error: any) {
      return { url: '', error: error.message };
    }
  }

  // Upload course material document
  static async uploadCourseMaterial(
    courseId: string,
    file: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<{ url: string; error: string | null }> {
    try {
      const filePath = `course_materials/${courseId}/materials/${Date.now()}-${fileName}`;

      const fileUpload = bucket.file(filePath);
      
      await fileUpload.save(file, {
        metadata: { 
          contentType: mimeType,
          metadata: {
            courseId: courseId,
            uploadedAt: new Date().toISOString()
          }
        }
      });

      await fileUpload.makePublic();
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

      return { url: publicUrl, error: null };
    } catch (error: any) {
      return { url: '', error: error.message };
    }
  }

  // Delete file
  static async deleteFile(filePath: string): Promise<boolean> {
    try {
      await bucket.file(filePath).delete();
      return true;
    } catch (error) {
      console.error('Delete error:', error);
      return false;
    }
  }
}