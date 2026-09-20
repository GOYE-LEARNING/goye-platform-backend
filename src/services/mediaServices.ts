import cloudinary from "../utils/cloudinary";

/**
 * Builds a Cloudinary public_id for a document that keeps its extension.
 *
 * The previous `fileName.split(".")[0]` was wrong twice over:
 *
 *  - It dropped the extension. Cloudinary delivers a raw asset at exactly the
 *    public_id you give it, so the URL came out with no ".pdf" on the end.
 *    With no extension there is no Content-Type, and a browser that is handed
 *    a typeless blob downloads it instead of rendering it — which is why
 *    students could not view course documents.
 *  - It truncated at the FIRST dot, so "week.3.notes.pdf" became "week".
 *
 * Also strips characters Cloudinary treats specially in a public_id, so an
 * upload can't produce a URL that 404s.
 */
function documentPublicId(prefix: string, fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  const hasExtension = lastDot > 0 && lastDot < fileName.length - 1;

  const base = (hasExtension ? fileName.slice(0, lastDot) : fileName)
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .slice(0, 80) || "file";

  const extension = hasExtension
    ? fileName.slice(lastDot + 1).replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
    : "";

  const stem = `${prefix}_${Date.now()}_${base}`;
  return extension ? `${stem}.${extension}` : stem;
}

/**
 * Shared options for every document upload.
 *
 * `resource_type: "raw"` for all sizes. This used to be "raw" under 10MB and
 * "auto" over it, inside the same function — so whether a document rendered
 * for a student depended on how big it happened to be. "raw" is the right
 * choice for documents generally: "auto" reclassifies PDFs as images (a
 * different URL shape and subject to Cloudinary's PDF delivery restriction),
 * and mangles formats it doesn't recognise, such as .docx and .pptx.
 */
const DOCUMENT_UPLOAD_OPTIONS = {
  resource_type: "raw" as const,
  // Serve inline rather than forcing a download, so a PDF opens in the viewer.
  type: "upload" as const,
  overwrite: false,
};

/**
 * Rewrites a Cloudinary delivery URL to add `f_auto,q_auto`.
 *
 * f_auto is a *delivery* transformation: Cloudinary picks the best format for
 * the requesting browser (AVIF/WebP where supported, otherwise the original)
 * and q_auto picks a quality that holds up visually at a smaller size.
 *
 * It has to be in the URL to do anything. Passing `fetch_format: "auto"` in an
 * upload's `transformation` array — which the forum image and video uploads
 * already did — applies an *incoming* transformation at upload time, when
 * there is no browser to detect, so it does essentially nothing. That is why
 * this is a URL rewrite rather than another upload option.
 *
 * Deliberately skips `/raw/` URLs: raw assets are served byte-for-byte and
 * transformations do not apply, so injecting one produces a broken link. This
 * is the same distinction that made documents fail to render in the first
 * place, so it is worth being explicit about.
 */
function withAutoFormat(url: string): string {
  if (!url || !url.includes("/upload/")) return url;
  if (url.includes("/raw/upload/")) return url;
  // Already carries an f_auto — leave it alone rather than stacking another.
  if (/\/upload\/[^/]*f_auto/.test(url)) return url;
  return url.replace("/upload/", "/upload/f_auto,q_auto/");
}

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

      console.log(" Avatar upload successful:", result.secure_url);
      return { url: withAutoFormat(result.secure_url), error: null };
    } catch (error: any) {
      console.error(" Cloudinary avatar upload error:", error);
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
      console.log(" Avatar upload successful:", result.secure_url);
      return { url: withAutoFormat(result.secure_url), error: null };
    } catch (error: any) {
      console.error(" Cloudinary avatar upload error:", error);
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

      console.log(" Group image upload successful:", result.secure_url);
      return {
        url: withAutoFormat(result.secure_url),
        error: null,
      };
    } catch (error: any) {
      console.error(" Group image upload error:", error);
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

      console.log(" Course image upload successful:", result.secure_url);
      return { url: withAutoFormat(result.secure_url), error: null };
    } catch (error: any) {
      console.error(" Course image upload error:", error);
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
          chunk_size: 50000000, // 50MB chunks
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
            console.error(" Cloudinary Error:", error);
            return resolve({ url: "", error: error.message });
          }
          console.log(" Video uploaded successfully:", result?.secure_url);
          resolve({ url: withAutoFormat(result?.secure_url || ""), error: null });
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
    return MediaService.uploadDocument(
      "course_materials",
      `material_${courseId}`,
      file,
      fileName,
    );
  }

  /**
   * Uploads any document (PDF, Office file, etc.) to Cloudinary.
   *
   * One code path regardless of size. The three material uploaders used to
   * each carry their own near-identical copy of this logic, which is how they
   * drifted: course materials ended up using a different resource_type for
   * small files than for large ones, so a student could open one tutor's
   * handout and not another's for no reason they could see.
   *
   * Streams every file rather than branching on size — streaming is correct
   * for a 40MB file and harmless for a 40KB one, and base64 inflated each
   * upload by a third in memory before sending it.
   */
  private static uploadDocument(
    folder: string,
    idPrefix: string,
    file: Buffer,
    fileName: string,
  ): Promise<{ url: string; error: string | null }> {
    return new Promise((resolve) => {
      try {
        const publicId = documentPublicId(idPrefix, fileName);
        console.log(
          `📤 Uploading document to ${folder}/${publicId} (${(file.length / 1024 / 1024).toFixed(2)}MB)`,
        );

        const uploadStream = cloudinary.uploader.upload_stream(
          {
            ...DOCUMENT_UPLOAD_OPTIONS,
            folder,
            public_id: publicId,
            chunk_size: 10000000,
            timeout: 120000,
          },
          (error, result) => {
            if (error) {
              console.error(`❌ Document upload failed (${folder}):`, error);
              return resolve({ url: "", error: error.message });
            }
            console.log("✅ Document uploaded:", result?.secure_url);
            resolve({ url: result?.secure_url || "", error: null });
          },
        );

        uploadStream.end(file);
      } catch (error: any) {
        console.error(`❌ Unexpected error uploading to ${folder}:`, error);
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
        console.log(` File deleted successfully: ${publicId}`);
        return { success: true, error: null };
      } else {
        console.error(` File deletion failed: ${result.result}`);
        return { success: false, error: result.result };
      }
    } catch (error: any) {
      console.error(" Delete error:", error);
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
        url: withAutoFormat(result.secure_url),
        error: null,
      };
    } catch (error: any) {
      console.error(" Church image upload error:", error);
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
        url: withAutoFormat(result.secure_url),
        error: null,
      };
    } catch (error: any) {
      console.error(" School image upload error:", error);
      return { url: "", error: error.message };
    }
  }

  static async uploadSchoolMaterial(
    organizationId: string,
    file: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<{ url: string; error: string | null }> {
    return MediaService.uploadDocument(
      "school_materials",
      `material_${organizationId}`,
      file,
      fileName,
    );
  }

  static async uploadClubMaterial(
    organizationId: string,
    file: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<{ url: string; error: string | null }> {
    return MediaService.uploadDocument(
      "club_materials",
      `material_${organizationId}`,
      file,
      fileName,
    );
  }


static async uploadPublicMessageImage(
  publicId: string,
  authorId: string,
  file: Buffer,
  fileName: string,
  mimeType: string,
): Promise<{ url: string; error: string | null }> {
  try {
    console.log("📤 Uploading image to Cloudinary...");
    const base64File = `data:${mimeType};base64,${file.toString("base64")}`;

    const result = await cloudinary.uploader.upload(base64File, {
      folder: `public_discussions/${publicId}/${authorId}`,
      public_id: `image_${Date.now()}`,
      resource_type: "image",
      chunk_size: 20000000, // 20MB chunks
      timeout: 60000, // 60 second timeout (longer for images)
      quality: "auto:good",
      transformation: [
        { width: 1200, height: 1200, crop: "limit" }, // Max dimensions, preserve aspect ratio
        { quality: "auto" },
        { fetch_format: "auto" }, // Auto format (webp for modern browsers)
      ],
    });

    console.log(" Image upload successful:", result.secure_url);
    
    // Return media object with metadata
    return { 
      url: withAutoFormat(result.secure_url), 
      error: null 
    };
  } catch (error) {
    console.error(" Image upload error:", error);
    return { url: "", error: error.message };
  }
}

static async uploadPublicMessageVideos(
  publicId: string,
  authorId: string,
  file: Buffer,
  fileName: string,
): Promise<{ url: string; error: string | null; metadata?: any }> {
  return new Promise((resolve) => {
    console.log("📤 Uploading video to Cloudinary...");
    console.log(`File size: ${(file.length / 1024 / 1024).toFixed(2)}MB`);
    console.log(`File name: ${fileName}`);

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `public_discussions/${publicId}/${authorId}`,
        public_id: `video_${Date.now()}`,
        resource_type: "video",
        chunk_size: 20000000, // 20MB chunks
        timeout: 300000, // 5 minutes timeout
        eager: [
          { streaming_profile: "hd", format: "m3u8" }, // HLS streaming
          { width: 640, height: 360, crop: "pad", format: "jpg" }, // Thumbnail
        ],
        eager_async: true,
        allowed_formats: ["mp4", "mov", "avi", "mkv", "webm", "m4v"],
        transformation: [
          { quality: "auto" },
          { fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error) {
          console.error(" Cloudinary Error:", error);
          return resolve({ url: "", error: error.message });
        }
        
        console.log(" Video uploaded successfully:", result?.secure_url);
        
        // Return media object with metadata
        resolve({ 
          url: withAutoFormat(result?.secure_url || ""), 
          error: null,
          metadata: {
            duration: result?.duration,
            format: result?.format,
            width: result?.width,
            height: result?.height,
            bytes: result?.bytes,
            thumbnail: result?.eager?.[1]?.secure_url || null,
            streamingUrl: result?.eager?.[0]?.secure_url || null,
          }
        });
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

  // Additional utility method for getting video info
  static async getVideoInfo(publicId: string): Promise<any> {
    try {
      const result = await cloudinary.api.resource(publicId, {
        resource_type: "video",
      });
      return result;
    } catch (error) {
      console.error(" Error getting video info:", error);
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
      console.error(" Error generating thumbnail:", error);
      return "";
    }
  }
}
