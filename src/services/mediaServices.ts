import cloudinary from "../utils/cloudinary.js";

export class MediaService {
  static async uploadUserAvatar(
    userId: string,
    file: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<{ url: string; error: string | null }> {
    try {
      console.log("📤 Uploading to Cloudinary...");

      // Convert buffer to base64
      const base64File = `data:${mimeType};base64,${file.toString("base64")}`;

      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(base64File, {
        folder: "user_avatars",
        public_id: `avatar_${userId}_${Date.now()}`,
        overwrite: true,
        resource_type: "image", // Automatically detect image/video
        chunk_size: 6000000, // 6MB chunks for large files
        timeout: 60000, // 60 second timeout
        quality: "auto", // Optimize quality vs size
      });

      console.log("✅ Upload successful:", result.secure_url);
      return { url: result.secure_url, error: null };
    } catch (error: any) {
      console.error("❌ Cloudinary upload error:", error);
      return { url: "", error: error.message };
    }
  }

  static async uploadCourseImage(
    courseId: string,
    file: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<{ url: string; error: string | null }> {
    try {
      const base64File = `data:${mimeType};base64,${file.toString("base64")}`;

      const result = await cloudinary.uploader.upload(base64File, {
        folder: "course_images",
        public_id: `course_${courseId}_${Date.now()}`,
        overwrite: true,
        resource_type: "image", // Automatically detect image/video
        chunk_size: 6000000, // 6MB chunks for large files
        timeout: 60000, // 60 second timeout
        quality: "auto",
      });

      return { url: result.secure_url, error: null };
    } catch (error: any) {
      return { url: "", error: error.message };
    }
  }

  static async uploadLessonVideo(
    courseId: string,
    moduleId: string,
    file: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<{ url: string; error: string | null }> {
    try {
      const base64File = `data:${mimeType};base64,${file.toString("base64")}`;

      const result = await cloudinary.uploader.upload(base64File, {
        folder: `lesson_videos/${courseId}/${moduleId}`,
        public_id: `video_${Date.now()}`,
        overwrite: true,
        resource_type: "video", // Automatically detect image/video
        chunk_size: 6000000, // 6MB chunks for large files
        timeout: 60000, // 60 second timeout
        quality: "auto", // 6MB chunks for large videos
      });

      return { url: result.secure_url, error: null };
    } catch (error: any) {
      return { url: "", error: error.message };
    }
  }

  static async uploadCourseMaterial(
    courseId: string,
    file: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<{ url: string; error: string | null }> {
    try {
      const base64File = `data:${mimeType};base64,${file.toString("base64")}`;

      const result = await cloudinary.uploader.upload(base64File, {
        folder: "course_materials",
        public_id: `material_${courseId}_${Date.now()}_${fileName}`,
        resource_type: "auto", // Handles PDFs, docs, etc.
      });

      return { url: result.secure_url, error: null };
    } catch (error: any) {
      return { url: "", error: error.message };
    }
  }

  static async deleteFile(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === "ok";
    } catch (error) {
      console.error("Delete error:", error);
      return false;
    }
  }
}
