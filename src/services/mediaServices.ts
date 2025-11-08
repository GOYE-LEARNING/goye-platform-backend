import { supabase, BUCKETS } from "../utils/supabase.js";

export class MediaService {
  static async uploadUserAvatar(
    userId: string,
    file: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<{ url: string; error: string | null }> {
    try {
      const fileExt = fileName.split(".").pop();
      const filePath = `${userId}/avatar-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from(BUCKETS.USER_AVATARS)
        .upload(filePath, file, {
          contentType: mimeType,
          upsert: true,
        });

      if (error) {
        return { url: "", error: error.message };
      }

      const { data: { publicUrl } } = supabase.storage
        .from(BUCKETS.USER_AVATARS)
        .getPublicUrl(filePath);
      
      return { url: publicUrl, error: null };
    } catch (error: any) {
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
      const filePath = `courses/${courseId}/images/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from(BUCKETS.COURSE_IMAGES)
        .upload(filePath, file, {
          contentType: mimeType,
          upsert: true
        });

      if (error) {
        return { url: '', error: error.message };
      }

      const { data: { publicUrl } } = supabase.storage
        .from(BUCKETS.COURSE_IMAGES)
        .getPublicUrl(filePath);

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
      const filePath = `courses/${courseId}/modules/${moduleId}/videos/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from(BUCKETS.LESSON_VIDEOS)
        .upload(filePath, file, {
          contentType: mimeType,
          upsert: false
        });

      if (error) {
        return { url: '', error: error.message };
      }

      const { data: { publicUrl } } = supabase.storage
        .from(BUCKETS.LESSON_VIDEOS)
        .getPublicUrl(filePath);

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
      const fileExt = fileName.split('.').pop();
      const filePath = `courses/${courseId}/materials/${Date.now()}-${fileName}`;

      const { data, error } = await supabase.storage
        .from(BUCKETS.COURSE_MATERIALS)
        .upload(filePath, file, {
          contentType: mimeType,
          upsert: false
        });

      if (error) {
        return { url: '', error: error.message };
      }

      const { data: { publicUrl } } = supabase.storage
        .from(BUCKETS.COURSE_MATERIALS)
        .getPublicUrl(filePath);

      return { url: publicUrl, error: null };
    } catch (error: any) {
      return { url: '', error: error.message };
    }
  }

  // Delete file
  static async deleteFile(bucket: string, filePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      return !error;
    } catch (error) {
      return false;
    }
  }
}