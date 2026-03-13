import cloudinary from "../utils/cloudinary";

export class MediaService {
  static async uploadUserAvatar(
    userId: string,
    file: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<{ url: string; error: string | null }> {
    try {
      console.log("📤 Uploading avatar to Cloudinary...");

      // Convert buffer to base64 (fine for small avatar images)
      const base64File = `data:${mimeType};base64,${file.toString("base64")}`;

      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(base64File, {
        folder: "user_avatars",
        public_id: `avatar_${userId}_${Date.now()}`,
        overwrite: true,
        resource_type: "image",
        chunk_size: 6000000, // 6MB chunks
        timeout: 30000, // 30 second timeout
        quality: "auto",
        transformation: [
          { width: 200, height: 200, crop: "fill" }, // Resize avatar
          { quality: "auto:good" }, // Optimize quality
        ],
      });

      console.log("✅ Avatar upload successful:", result.secure_url);
      return { url: result.secure_url, error: null };
    } catch (error: any) {
      console.error("❌ Cloudinary avatar upload error:", error);
      return { url: "", error: error.message };
    }
  }

  static async UploadOrganizationImage(
    organizationId: string,
    file: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<{ url: string; error: string | null }> {
    try {
      console.log("📤 Uploading avatar to Cloudinary...");
      const base64File = `data:${mimeType};base64,${file.toString("base64")}`;
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(base64File, {
        folder: "organization_image",
        public_id: `avatar_${organizationId}_${Date.now()}`,
        overwrite: true,
        resource_type: "image",
        chunk_size: 6000000, // 6MB chunks
        timeout: 30000, // 30 second timeout
        quality: "auto",
        transformation: [
          { width: 200, height: 200, crop: "fill" }, // Resize avatar
          { quality: "auto:good" }, // Optimize quality
        ],
      });
      console.log("✅ Avatar upload successful:", result.secure_url);
      return { url: result.secure_url, error: null };
    } catch (error: any) {
      console.error("❌ Cloudinary avatar upload error:", error);
      return { url: "", error: error.message };
    }
  }

  static async uploadGroupImage(
    group_id: string,
    file: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<{ url: string; error: string | null }> {
    try {
      console.log("📤 Uploading group image to Cloudinary...");
      const base64 = `data:${mimeType};base64,${file.toString("base64")}`;
      const result = await cloudinary.uploader.upload(base64, {
        folder: "group-images",
        public_id: `avatar_${group_id}_${Date.now()}`,
        overwrite: true,
        resource_type: "image",
        chunk_size: 6000000,
        timeout: 30000,
        quality: "auto",
        transformation: [
          { width: 800, height: 450, crop: "limit" }, // Limit size for group images
        ],
      });

      console.log("✅ Group image upload successful:", result.secure_url);
      return {
        url: result.secure_url,
        error: null,
      };
    } catch (error: any) {
      console.error("❌ Group image upload error:", error);
      return { url: "", error: error.message };
    }
  }

  static async uploadCourseImage(
    courseId: string,
    file: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<{ url: string; error: string | null }> {
    try {
      console.log("📤 Uploading course image to Cloudinary...");
      const base64File = `data:${mimeType};base64,${file.toString("base64")}`;

      const result = await cloudinary.uploader.upload(base64File, {
        folder: "course_images",
        public_id: `course_${courseId}_${Date.now()}`,
        overwrite: true,
        resource_type: "image",
        chunk_size: 6000000,
        timeout: 30000,
        quality: "auto",
        transformation: [
          { width: 1200, height: 675, crop: "limit" }, // Standard course image size
        ],
      });

      console.log("✅ Course image upload successful:", result.secure_url);
      return { url: result.secure_url, error: null };
    } catch (error: any) {
      console.error("❌ Course image upload error:", error);
      return { url: "", error: error.message };
    }
  }

  // In your MediaService.uploadLessonVideo method
  static async uploadLessonVideo(
    courseId: string,
    moduleId: string,
    file: Buffer,
    fileName: string,
  ): Promise<{ url: string; error: string | null }> {
    return new Promise((resolve) => {
      console.log("📤 Streaming video to Cloudinary...");
      console.log(`File size: ${(file.length / 1024 / 1024).toFixed(2)}MB`);
      console.log(`File name: ${fileName}`);

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `lesson_videos/${courseId}/${moduleId}`,
          public_id: `video_${Date.now()}`,
          resource_type: "video",
          chunk_size: 20000000, // 20MB chunks
          timeout: 300000, // 5 minutes timeout
          eager: [
            { streaming_profile: "hd", format: "m3u8" },
            { width: 640, height: 360, crop: "pad", format: "jpg" },
          ],
          eager_async: true,
          allowed_formats: ["mp4", "mov", "avi", "mkv", "webm"],
        },
        (error, result) => {
          if (error) {
            console.error("❌ Cloudinary Error:", error);
            return resolve({ url: "", error: error.message });
          }
          console.log("✅ Video uploaded successfully:", result?.secure_url);
          resolve({ url: result?.secure_url || "", error: null });
        },
      );

      // Handle large files by streaming in chunks
      const chunkSize = 1024 * 1024; // 1MB chunks
      let offset = 0;

      const writeNextChunk = () => {
        if (offset >= file.length) {
          uploadStream.end();
          return;
        }

        const end = Math.min(offset + chunkSize, file.length);
        const chunk = file.slice(offset, end);
        const canWrite = uploadStream.write(chunk);

        offset = end;

        if (canWrite) {
          process.nextTick(writeNextChunk);
        } else {
          uploadStream.once("drain", writeNextChunk);
        }
      };

      writeNextChunk();
    });
  }

  static async uploadCourseMaterial(
    courseId: string,
    file: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<{ url: string; error: string | null }> {
    return new Promise((resolve) => {
      try {
        console.log("📤 Uploading course material to Cloudinary...");

        // Check if it's a large file and use streaming
        const isLargeFile = file.length > 10 * 1024 * 1024; // > 10MB

        if (isLargeFile) {
          console.log("📊 Large file detected, using streaming upload...");

          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: "course_materials",
              public_id: `material_${courseId}_${Date.now()}_${
                fileName.split(".")[0]
              }`,
              resource_type: "auto", // Handles PDFs, docs, etc.
              chunk_size: 10000000, // 10MB chunks for large files
              timeout: 120000, // 2 minutes for large files
            },
            (error, result) => {
              if (error) {
                console.error("❌ Course material upload error:", error);
                resolve({ url: "", error: error.message });
              } else {
                console.log(
                  "✅ Course material upload successful:",
                  result.secure_url,
                );
                resolve({ url: result.secure_url, error: null });
              }
            },
          );

          uploadStream.end(file);
        } else {
          // For small files, use base64
          const base64File = `data:${mimeType};base64,${file.toString(
            "base64",
          )}`;

          cloudinary.uploader.upload(
            base64File,
            {
              folder: "course_materials",
              public_id: `material_${courseId}_${Date.now()}_${
                fileName.split(".")[0]
              }`,
              resource_type: "auto",
            },
            (error, result) => {
              if (error) {
                console.error("❌ Course material upload error:", error);
                resolve({ url: "", error: error.message });
              } else {
                console.log(
                  "✅ Course material upload successful:",
                  result.secure_url,
                );
                resolve({ url: result.secure_url, error: null });
              }
            },
          );
        }
      } catch (error: any) {
        console.error("❌ Unexpected error in uploadCourseMaterial:", error);
        resolve({ url: "", error: error.message });
      }
    });
  }

  static async deleteFile(
    publicId: string,
    resourceType: string = "image",
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      console.log(`🗑️ Deleting file: ${publicId}`);
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType, // Can be "image", "video", or "raw"
        invalidate: true, // Invalidate CDN cache
      });

      if (result.result === "ok") {
        console.log(`✅ File deleted successfully: ${publicId}`);
        return { success: true, error: null };
      } else {
        console.error(`❌ File deletion failed: ${result.result}`);
        return { success: false, error: result.result };
      }
    } catch (error: any) {
      console.error("❌ Delete error:", error);
      return { success: false, error: error.message };
    }
  }

  static async UploadOrganizationChurchLogo(
    organizationId: string,
    file: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<{ url: string; error: string | null }> {
    try {
      console.log("Uploading organization church logo");
      const base64File = `data:${mimeType};base64,${file.toString("base64")}`;
      const result = await cloudinary.uploader.upload(base64File, {
        folder: "org_church_logo",
        public_id: `org_${organizationId}_${Date.now()}`,
        overwrite: true,
        resource_type: "image",
        chunk_size: 6000000,
        timeout: 30000,
        quality: "auto",
        transformation: [{ width: 1200, height: 675, crop: "limit" }],
      });

      console.log("Organization Church Logo uploaded successfully.");

      return {
        url: result.secure_url,
        error: null,
      };
    } catch (error: any) {
      console.error("❌ Church image upload error:", error);
      return { url: "", error: error.message };
    }
  }

  static async UploadOrganizationSchoolLogo(
    organizationId: string,
    file: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<{ url: string; error: string | null }> {
    try {
      console.log("Uploading organization school logo");
      const base64File = `data:${mimeType};base64,${file.toString("base64")}`;
      const result = await cloudinary.uploader.upload(base64File, {
        folder: "org_school_logo",
        public_id: `org_${organizationId}_${Date.now()}`,
        overwrite: true,
        resource_type: "image",
        chunk_size: 6000000,
        timeout: 30000,
        quality: "auto",
        transformation: [{ width: 1200, height: 675, crop: "limit" }],
      });

      console.log("Organization School Logo uploaded successfully.");

      return {
        url: result.secure_url,
        error: null,
      };
    } catch (error: any) {
      console.error("❌ School image upload error:", error);
      return { url: "", error: error.message };
    }
  }

  static async uploadSchoolMaterial(
    organizationId: string,
    file: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<{ url: string; error: string | null }> {
    return new Promise((resolve) => {
      try {
        console.log("📤 Uploading school material to Cloudinary...");

        // Check if it's a large file and use streaming
        const isLargeFile = file.length > 10 * 1024 * 1024; // > 10MB

        if (isLargeFile) {
          console.log("📊 Large file detected, using streaming upload...");

          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: "school_materials",
              public_id: `material_${organizationId}_${Date.now()}_${
                fileName.split(".")[0]
              }`,
              resource_type: "auto", // Handles PDFs, docs, etc.
              chunk_size: 10000000, // 10MB chunks for large files
              timeout: 120000, // 2 minutes for large files
            },
            (error, result) => {
              if (error) {
                console.error("❌ School material upload error:", error);
                resolve({ url: "", error: error.message });
              } else {
                console.log(
                  "✅ School material upload successful:",
                  result.secure_url,
                );
                resolve({ url: result.secure_url, error: null });
              }
            },
          );

          uploadStream.end(file);
        } else {
          // For small files, use base64
          const base64File = `data:${mimeType};base64,${file.toString(
            "base64",
          )}`;

          cloudinary.uploader.upload(
            base64File,
            {
              folder: "school_materials",
              public_id: `material_${organizationId}_${Date.now()}_${
                fileName.split(".")[0]
              }`,
              resource_type: "auto",
            },
            (error, result) => {
              if (error) {
                console.error("❌ School material upload error:", error);
                resolve({ url: "", error: error.message });
              } else {
                console.log(
                  "✅ School material upload successful:",
                  result.secure_url,
                );
                resolve({ url: result.secure_url, error: null });
              }
            },
          );
        }
      } catch (error: any) {
        console.error("❌ Unexpected error in uploadSchoolMaterial:", error);
        resolve({ url: "", error: error.message });
      }
    });
  }

  static async uploadClubMaterial(
    organizationId: string,
    file: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<{ url: string; error: string | null }> {
    return new Promise((resolve) => {
      try {
        console.log("📤 Uploading club material to Cloudinary...");

        // Check if it's a large file and use streaming
        const isLargeFile = file.length > 10 * 1024 * 1024; // > 10MB

        if (isLargeFile) {
          console.log("📊 Large file detected, using streaming upload...");

          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: "club_materials",
              public_id: `material_${organizationId}_${Date.now()}_${
                fileName.split(".")[0]
              }`,
              resource_type: "auto", // Handles PDFs, docs, etc.
              chunk_size: 10000000, // 10MB chunks for large files
              timeout: 120000, // 2 minutes for large files
            },
            (error, result) => {
              if (error) {
                console.error("❌ Club material upload error:", error);
                resolve({ url: "", error: error.message });
              } else {
                console.log(
                  "✅ Club material upload successful:",
                  result.secure_url,
                );
                resolve({ url: result.secure_url, error: null });
              }
            },
          );

          uploadStream.end(file);
        } else {
          // For small files, use base64
          const base64File = `data:${mimeType};base64,${file.toString(
            "base64",
          )}`;

          cloudinary.uploader.upload(
            base64File,
            {
              folder: "club_materials",
              public_id: `material_${organizationId}_${Date.now()}_${
                fileName.split(".")[0]
              }`,
              resource_type: "auto",
            },
            (error, result) => {
              if (error) {
                console.error("❌ Club material upload error:", error);
                resolve({ url: "", error: error.message });
              } else {
                console.log(
                  "✅ Club material upload successful:",
                  result.secure_url,
                );
                resolve({ url: result.secure_url, error: null });
              }
            },
          );
        }
      } catch (error: any) {
        console.error("❌ Unexpected error in uploadClubMaterial:", error);
        resolve({ url: "", error: error.message });
      }
    });
  }

  // Additional utility method for getting video info
  static async getVideoInfo(publicId: string): Promise<any> {
    try {
      const result = await cloudinary.api.resource(publicId, {
        resource_type: "video",
      });
      return result;
    } catch (error) {
      console.error("❌ Error getting video info:", error);
      throw error;
    }
  }

  // Method to create video thumbnail
  static async generateVideoThumbnail(videoUrl: string): Promise<string> {
    try {
      // Extract public ID from URL
      const urlParts = videoUrl.split("/");
      const publicIdWithExtension = urlParts.slice(-2).join("/").split(".")[0];

      // Generate thumbnail URL
      const thumbnailUrl = cloudinary.url(publicIdWithExtension, {
        resource_type: "video",
        transformation: [
          { width: 320, height: 180, crop: "fill" },
          { format: "jpg" },
          { quality: "auto" },
        ],
      });

      return thumbnailUrl;
    } catch (error) {
      console.error("❌ Error generating thumbnail:", error);
      return "";
    }
  }
}
