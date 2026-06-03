import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Path,
  Request,
  Security,
  Tags,
  Query,
  Route,
} from "tsoa";
import prisma from "../db";
import { NotificationService, Role } from "../services/notificationServices";
import {
  ActionType,
  GamificationService,
} from "../services/gamificationService";
import { EncryptionUtil } from "../utils/encryption";
import { MediaService } from "../services/mediaServices";
// ==================== INTERFACES ====================
const category: Record<string, string> = {
  discussion: "DISCUSSION",
  prayer: "PRAYER",
  devotion: "DEVOTION",
  blessing: "BLESSING",
  testimony: "TESTIMONY",
  question: "QUESTION",
};
interface MediaItem {
  type: "image" | "video";
  url: string;
  filename: string;
  caption?: string;
}

interface CreateDiscussionDTO {
  content: string;
  category: typeof category;
  isPublic: boolean;
  mediaUrls?: MediaItem[];
}

interface ReplyToDiscussionDTO {
  content: string;
  mediaUrls?: MediaItem[];
  parentReplyId?: string; // For nested replies
}

interface SendPrivateMessageDTO {
  receiverId: string;
  content: string;
}

interface NestedReplyDTO {
  content: string;
  mediaUrls?: MediaItem[];
}

@Route("discussion")
@Tags("Discussion & Messaging APIs")
export class DiscussionController extends Controller {
  // ==================== MEDIA UPLOADS ====================

  @Security("bearerAuth")
  @Post("/upload/image")
  public async UploadPublicImage(
    @Request() req: any,
    @Body() body: { file: string; fileName: string; mimeType: string },
  ): Promise<any> {
    const userId = req.user?.id;
    const discussionId = `temp_${userId}_${Date.now()}`;

    const buffer = Buffer.from(body.file, "base64");

    try {
      const result = await MediaService.uploadPublicMessageImage(
        discussionId,
        userId,
        buffer,
        body.fileName,
        body.mimeType,
      );

      if (result.error) {
        this.setStatus(500);
        return { message: "Upload failed", error: result.error };
      }

      this.setStatus(201);
      return {
        message: "Image uploaded successfully",
        data: { url: result.url },
      };
    } catch (error: any) {
      console.error("Upload error:", error);
      this.setStatus(500);
      return { message: "Failed to upload image", error: error.message };
    }
  }

  @Security("bearerAuth")
  @Post("/upload/video")
  public async UploadPublicVideo(
    @Request() req: any,
    @Body() body: { file: string; fileName: string; mimeType: string },
  ): Promise<any> {
    const userId = req.user?.id;
    const discussionId = `temp_${userId}_${Date.now()}`;

    const buffer = Buffer.from(body.file, "base64");

    try {
      const result = await MediaService.uploadPublicMessageVideos(
        discussionId,
        userId,
        buffer,
        body.fileName,
      );

      if (result.error) {
        this.setStatus(500);
        return { message: "Upload failed", error: result.error };
      }

      this.setStatus(201);
      return {
        message: "Video uploaded successfully",
        data: { url: result.url },
      };
    } catch (error: any) {
      console.error("Upload error:", error);
      this.setStatus(500);
      return { message: "Failed to upload video", error: error.message };
    }
  }

  // ==================== PUBLIC DISCUSSIONS (ENCRYPTED) ====================

  @Security("bearerAuth")
  @Post("/public")
  public async CreatePublicDiscussion(
    @Request() req: any,
    @Body() body: CreateDiscussionDTO,
  ): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return { message: "User not authorized" };
    }

    try {
      if (!body.content && (!body.mediaUrls || body.mediaUrls.length === 0)) {
        this.setStatus(400);
        return { message: "Content or media is required" };
      }

      // ENCRYPT the public discussion content
      const encryptedContent = EncryptionUtil.encrypt(body.content);
      const discussion = await prisma.discussion.create({
        data: {
          content: encryptedContent,
          category: body.category as any,
          mediaUrls: (body.mediaUrls as any) || [],
          isPublic: true,
          authorId: userId,
        },
        include: {
          author: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              user_pic: true,
              role: true,
            },
          },
          _count: {
            select: {
              replies: true,
              likes: true,
            },
          },
        },
      });

      const gamificationResult =
        await GamificationService.AddPointsWithGamification(
          userId,
          ActionType.DISCUSSION_PARTICIPATION,
        );

      this.setStatus(201);
      return {
        message: "Discussion created successfully",
        data: {
          ...discussion,
          content: body.content,
        },
        gamification: {
          pointsEarned: gamificationResult.data?.pointsAdded,
          leveledUp: gamificationResult.data?.leveledUp,
          newLevel: gamificationResult.data?.newLevel,
        },
      };
    } catch (error: any) {
      console.error("Error creating discussion:", error);
      this.setStatus(500);
      return {
        message: "Failed to create discussion",
        error: error.message,
      };
    }
  }

  @Get("/public")
  public async GetPublicDiscussions(
    @Request() req: any,
    @Query() sort: "latest" | "popular" = "latest",
  ): Promise<any> {
    try {
      const userId = req.user?.id; // Get current user ID

      let orderBy: any = { createdAt: "desc" };
      if (sort === "popular") {
        orderBy = { likes: { _count: "desc" } };
      }

      const discussions = await prisma.discussion.findMany({
        where: {
          isPublic: true,
          parentId: null,
        },
        include: {
          author: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              user_pic: true,
              role: true,
            },
          },
          _count: {
            select: {
              replies: true,
              likes: true,
            },
          },
          // Include likes to check if current user liked this discussion
          likes: {
            where: { userId: userId },
            select: { userId: true },
          },
        },
        orderBy,
      });

      // DECRYPT each discussion content and add liked status
      const decryptedDiscussions = discussions.map((discussion) => ({
        ...discussion,
        content: EncryptionUtil.decrypt(discussion.content),
        liked: discussion.likes && discussion.likes.length > 0, // This adds the liked field
        likes: undefined, // Remove the likes array from response
      }));

      const totalCount = await prisma.discussion.count({
        where: {
          isPublic: true,
          parentId: null,
        },
      });

      this.setStatus(200);
      return {
        message: "Discussions fetched successfully",
        data: {
          discussions: decryptedDiscussions,
          pagination: {
            total: totalCount,
          },
        },
      };
    } catch (error: any) {
      console.error("Error fetching discussions:", error);
      this.setStatus(500);
      return {
        message: "Failed to fetch discussions",
        error: error.message,
      };
    }
  }

  /**
   * Get a single discussion with all nested replies (full thread)
   */
  @Get("/public/{discussionId}")
  public async GetDiscussionById(
    @Request() req: any,
    @Path() discussionId: string,
    @Query() page: number = 1,
    @Query() limit: number = 20,
  ): Promise<any> {
    try {
      const userId = req.user?.id;
      const skip = (page - 1) * limit;

      const discussion = await prisma.discussion.findUnique({
        where: { id: discussionId, isPublic: true },
        include: {
          author: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              user_pic: true,
              role: true,
            },
          },
          _count: {
            select: {
              replies: true,
              likes: true,
            },
          },
          // Include likes to check if current user liked this discussion
          likes: {
            where: { userId: userId },
            select: { userId: true },
          },
          replies: {
            where: { parentId: null },
            orderBy: { createdAt: "asc" },
            skip,
            take: limit,
            include: {
              author: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  user_pic: true,
                  role: true,
                },
              },
              _count: {
                select: {
                  likes: true,
                },
              },
              // Include likes for replies
              likes: {
                where: { userId: userId },
                select: { userId: true },
              },
              replies: {
                orderBy: { createdAt: "asc" },
                include: {
                  author: {
                    select: {
                      id: true,
                      first_name: true,
                      last_name: true,
                      user_pic: true,
                      role: true,
                    },
                  },
                  _count: {
                    select: {
                      likes: true,
                    },
                  },
                  // Include likes for nested replies
                  likes: {
                    where: { userId: userId },
                    select: { userId: true },
                  },
                  parent: {
                    include: {
                      author: {
                        select: {
                          id: true,
                          first_name: true,
                          last_name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!discussion) {
        this.setStatus(404);
        return { message: "Discussion not found" };
      }

      // Recursive function to decrypt and add liked status
      const decryptAndAddLiked = (replies: any[]): any[] => {
        return replies.map((reply) => ({
          ...reply,
          content: EncryptionUtil.decrypt(reply.content),
          liked: reply.likes && reply.likes.length > 0, // Add liked for reply
          likes: undefined,
          replies: reply.replies ? decryptAndAddLiked(reply.replies) : [],
          parent: reply.parent
            ? {
                ...reply.parent,
                author: reply.parent.author,
              }
            : null,
        }));
      };

      const decryptedDiscussion = {
        ...discussion,
        content: EncryptionUtil.decrypt(discussion.content),
        liked: discussion.likes && discussion.likes.length > 0, // Add liked for discussion
        likes: undefined,
        replies: decryptAndAddLiked(discussion.replies),
      };

      const totalReplies = await prisma.discussion.count({
        where: {
          parentId: discussionId,
        },
      });

      this.setStatus(200);
      return {
        message: "Discussion fetched successfully",
        data: {
          ...decryptedDiscussion,
          pagination: {
            page,
            limit,
            total: totalReplies,
            totalPages: Math.ceil(totalReplies / limit),
          },
        },
      };
    } catch (error: any) {
      console.error("Error fetching discussion:", error);
      this.setStatus(500);
      return {
        message: "Failed to fetch discussion",
        error: error.message,
      };
    }
  }

  /**
   * Reply to a discussion (top-level comment)
   */
  @Security("bearerAuth")
  @Post("/public/{discussionId}/reply")
  public async ReplyToDiscussion(
    @Request() req: any,
    @Path() discussionId: string,
    @Body() body: ReplyToDiscussionDTO,
  ): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return { message: "User not authorized" };
    }

    try {
      const parent = await prisma.discussion.findUnique({
        where: { id: discussionId, isPublic: true },
        include: {
          author: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              role: true,
            },
          },
        },
      });

      if (!parent) {
        this.setStatus(404);
        return { message: "Discussion not found" };
      }

      const encryptedContent = EncryptionUtil.encrypt(body.content);

      const reply = await prisma.discussion.create({
        data: {
          content: encryptedContent,
          mediaUrls: (body.mediaUrls as any) || [],
          isPublic: true,
          authorId: userId,
          parentId: discussionId,
        },
        include: {
          author: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              user_pic: true,
              role: true,
            },
          },
          _count: {
            select: {
              likes: true,
            },
          },
        },
      });

      const gamificationResult =
        await GamificationService.AddPointsWithGamification(
          userId,
          ActionType.DISCUSSION_PARTICIPATION,
        );

      if (parent.authorId !== userId) {
        await NotificationService.createNotification({
          message: `${req.user?.first_name} ${req.user?.last_name} replied to your discussion`,
          title: "New Reply",
          type: "discussion",
          role:
            parent.author.role === "instructor"
              ? Role.INSTRUCTOR
              : Role.STUDENT,
          to:
            parent.author.role === "instructor"
              ? Role.INSTRUCTOR
              : Role.STUDENT,
          userId: parent.authorId,
        });
      }

      this.setStatus(201);
      return {
        message: "Reply added successfully",
        data: {
          ...reply,
          content: body.content,
        },
        gamification: {
          pointsEarned: gamificationResult.data?.pointsAdded,
          leveledUp: gamificationResult.data?.leveledUp,
          newLevel: gamificationResult.data?.newLevel,
        },
      };
    } catch (error: any) {
      console.error("Error replying to discussion:", error);
      this.setStatus(500);
      return {
        message: "Failed to add reply",
        error: error.message,
      };
    }
  }

  /**
   * Reply to a specific reply (nested reply)
   * This creates a nested comment showing "User replied to @User"
   */
  @Security("bearerAuth")
  @Post("/reply/{replyId}/nested")
  public async ReplyToReply(
    @Request() req: any,
    @Path() replyId: string,
    @Body() body: NestedReplyDTO,
  ): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return { message: "User not authorized" };
    }

    try {
      // Find the parent reply
      const parentReply = await prisma.discussion.findUnique({
        where: { id: replyId, isPublic: true },
        include: {
          author: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              role: true,
            },
          },
          parent: {
            select: {
              id: true,
              authorId: true,
              author: {
                select: {
                  first_name: true,
                  last_name: true,
                },
              },
            },
          },
        },
      });

      if (!parentReply) {
        this.setStatus(404);
        return { message: "Reply not found" };
      }

      // Get the original discussion ID (root parent)
      let rootDiscussionId = replyId;
      let current = parentReply;
      while (current.parentId) {
        const parent = await prisma.discussion.findUnique({
          where: { id: current.parentId },
          select: { id: true, parentId: true },
        });
        if (!parent) break;
        rootDiscussionId = parent.id;
        current = parent as any;
      }

      // Create the nested reply with reference to who they're replying to
      const replyToName = `${parentReply.author.first_name} ${parentReply.author.last_name}`;
      const contentWithMention = `${body.content}`;

      const encryptedContent = EncryptionUtil.encrypt(contentWithMention);

      const nestedReply = await prisma.discussion.create({
        data: {
          content: encryptedContent,
          mediaUrls: (body.mediaUrls as any) || [],
          isPublic: true,
          authorId: userId,
          parentId: replyId, // This makes it a child of the parent reply
        },
        include: {
          author: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              user_pic: true,
              role: true,
            },
          },
          _count: {
            select: {
              likes: true,
            },
          },
        },
      });

      const gamificationResult =
        await GamificationService.AddPointsWithGamification(
          userId,
          ActionType.DISCUSSION_PARTICIPATION,
        );

      // Send notification to the user being replied to
      if (parentReply.authorId !== userId) {
        await NotificationService.createNotification({
          message: `${req.user?.first_name} ${req.user?.last_name} replied to your comment: "${body.content.substring(0, 50)}..."`,
          title: "New Reply",
          type: "discussion",
          role:
            parentReply.author.role === "instructor"
              ? Role.INSTRUCTOR
              : Role.STUDENT,
          to:
            parentReply.author.role === "instructor"
              ? Role.INSTRUCTOR
              : Role.STUDENT,
          userId: parentReply.authorId,
        });
      }

      this.setStatus(201);
      return {
        message: "Nested reply added successfully",
        data: {
          ...nestedReply,
          content: body.content,
          replyTo: {
            id: parentReply.author.id,
            name: replyToName,
          },
        },
        gamification: {
          pointsEarned: gamificationResult.data?.pointsAdded,
          leveledUp: gamificationResult.data?.leveledUp,
          newLevel: gamificationResult.data?.newLevel,
        },
      };
    } catch (error: any) {
      console.error("Error creating nested reply:", error);
      this.setStatus(500);
      return {
        message: "Failed to add nested reply",
        error: error.message,
      };
    }
  }

  /**
   * Get a single reply with all its nested replies
   */
  @Get("/reply/{replyId}")
  public async GetReplyWithNested(
    @Path() replyId: string,
    @Query() page: number = 1,
    @Query() limit: number = 20,
  ): Promise<any> {
    try {
      const skip = (page - 1) * limit;

      const reply = await prisma.discussion.findUnique({
        where: { id: replyId, isPublic: true },
        include: {
          author: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              user_pic: true,
              role: true,
            },
          },
          _count: {
            select: {
              likes: true,
              replies: true,
            },
          },
          parent: {
            include: {
              author: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                },
              },
            },
          },
          replies: {
            orderBy: { createdAt: "asc" },
            skip,
            take: limit,
            include: {
              author: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  user_pic: true,
                  role: true,
                },
              },
              _count: {
                select: {
                  likes: true,
                },
              },
              parent: {
                include: {
                  author: {
                    select: {
                      id: true,
                      first_name: true,
                      last_name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!reply) {
        this.setStatus(404);
        return { message: "Reply not found" };
      }

      // Decrypt all content
      const decryptedReply = {
        ...reply,
        content: EncryptionUtil.decrypt(reply.content),
        replies: reply.replies.map((nestedReply) => ({
          ...nestedReply,
          content: EncryptionUtil.decrypt(nestedReply.content),
          parent: nestedReply.parent
            ? {
                ...nestedReply.parent,
                author: nestedReply.parent.author,
              }
            : null,
        })),
        parent: reply.parent
          ? {
              ...reply.parent,
              author: reply.parent.author,
            }
          : null,
      };

      const totalReplies = await prisma.discussion.count({
        where: {
          parentId: replyId,
        },
      });

      this.setStatus(200);
      return {
        message: "Reply fetched successfully",
        data: {
          ...decryptedReply,
          pagination: {
            page,
            limit,
            total: totalReplies,
            totalPages: Math.ceil(totalReplies / limit),
          },
        },
      };
    } catch (error: any) {
      console.error("Error fetching reply:", error);
      this.setStatus(500);
      return {
        message: "Failed to fetch reply",
        error: error.message,
      };
    }
  }

  // ==================== LIKE FUNCTIONALITY ====================

  @Security("bearerAuth")
  @Post("/{discussionId}/like")
  public async ToggleLike(
    @Request() req: any,
    @Path() discussionId: string,
  ): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return { message: "User not authorized" };
    }

    try {
      const discussion = await prisma.discussion.findUnique({
        where: { id: discussionId },
      });

      if (!discussion) {
        this.setStatus(404);
        return { message: "Discussion not found" };
      }

      const existingLike = await prisma.discussionLike.findUnique({
        where: {
          discussionId_userId: {
            discussionId,
            userId,
          },
        },
      });

      let liked = false;

      if (existingLike) {
        await prisma.discussionLike.delete({
          where: {
            discussionId_userId: {
              discussionId,
              userId,
            },
          },
        });
        liked = false;
      } else {
        await prisma.discussionLike.create({
          data: {
            discussionId,
            userId,
          },
        });
        liked = true;
      }

      const likeCount = await prisma.discussionLike.count({
        where: { discussionId },
      });

      this.setStatus(200);
      return {
        message: liked ? "Liked successfully" : "Unliked successfully",
        data: {
          liked,
          likeCount,
        },
      };
    } catch (error: any) {
      console.error("Error toggling like:", error);
      this.setStatus(500);
      return {
        message: "Failed to toggle like",
        error: error.message,
      };
    }
  }

  @Security("bearerAuth")
  @Put("/{discussionId}")
  public async UpdateDiscussion(
    @Request() req: any,
    @Path() discussionId: string,
    @Body() body: { content: string; category: string; mediaUrls?: MediaItem[] },
  ): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return { message: "User not authorized" };
    }

    try {
      const discussion = await prisma.discussion.findUnique({
        where: { id: discussionId },
      });

      if (!discussion) {
        this.setStatus(404);
        return { message: "Discussion not found" };
      }

      // Only the author can edit
      if (discussion.authorId !== userId) {
        this.setStatus(403);
        return { message: "You can only edit your own posts" };
      }

      const encryptedContent = EncryptionUtil.encrypt(body.content);

      const updated = await prisma.discussion.update({
        where: { id: discussionId },
        data: {
          content: encryptedContent,
          category: body.category as any,
          mediaUrls: (body.mediaUrls as any) || discussion.mediaUrls,
        },
        include: {
          author: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              user_pic: true,
              role: true,
            },
          },
          _count: {
            select: { replies: true, likes: true },
          },
        },
      });

      this.setStatus(200);
      return {
        message: "Post updated successfully",
        data: {
          ...updated,
          content: body.content, // return decrypted
        },
      };
    } catch (error: any) {
      console.error("Error updating discussion:", error);
      this.setStatus(500);
      return { message: "Failed to update post", error: error.message };
    }
  }

  @Security("bearerAuth")
  @Delete("/{discussionId}")
  public async DeleteDiscussion(
    @Request() req: any,
    @Path() discussionId: string,
  ): Promise<any> {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      this.setStatus(401);
      return { message: "User not authorized" };
    }

    try {
      const discussion = await prisma.discussion.findUnique({
        where: { id: discussionId },
      });

      if (!discussion) {
        this.setStatus(404);
        return { message: "Discussion not found" };
      }

      if (
        discussion.authorId !== userId &&
        userRole !== "instructor" &&
        userRole !== "admin"
      ) {
        this.setStatus(403);
        return { message: "You don't have permission to delete this" };
      }

      await prisma.discussion.delete({
        where: { id: discussionId },
      });

      this.setStatus(200);
      return {
        message: "Deleted successfully",
      };
    } catch (error: any) {
      console.error("Error deleting discussion:", error);
      this.setStatus(500);
      return {
        message: "Failed to delete",
        error: error.message,
      };
    }
  }

  // ==================== PRIVATE MESSAGES (ENCRYPTED) ====================
  /**
   * Get a user's public profile by ID
   */
  @Security("bearerAuth")
  @Get("/profile/:userId")
  public async GetUserById(
    @Request() req: any,
    @Path() userId: string,
  ): Promise<any> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          user_pic: true,
          role: true,
          isOnline: true,
          lastActive: true,
        },
      });

      if (!user) {
        this.setStatus(404);
        return { message: "User not found" };
      }

      this.setStatus(200);
      return {
        message: "User fetched successfully",
        data: user,
      };
    } catch (error: any) {
      console.error("Error fetching user:", error);
      this.setStatus(500);
      return { message: "Failed to fetch user", error: error.message };
    }
  }
  @Security("bearerAuth")
  @Post("/private")
  public async SendPrivateMessage(
    @Request() req: any,
    @Body() body: SendPrivateMessageDTO,
  ): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return { message: "User not authorized" };
    }

    try {
      const receiver = await prisma.user.findUnique({
        where: { id: body.receiverId },
      });

      if (!receiver) {
        this.setStatus(404);
        return { message: "User not found" };
      }

      if (userId === body.receiverId) {
        this.setStatus(400);
        return { message: "You cannot send a message to yourself" };
      }

      const encryptedContent = EncryptionUtil.encrypt(body.content);

      const message = await prisma.privateMessage.create({
        data: {
          content: encryptedContent,
          senderId: userId,
          receiverId: body.receiverId,
        },
        include: {
          sender: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              user_pic: true,
              role: true,
            },
          },
          receiver: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              user_pic: true,
              role: true,
            },
          },
        },
      });

      await NotificationService.createNotification({
        message: `${req.user?.first_name} ${req.user?.last_name} sent you a private message`,
        title: "New Private Message",
        type: "private_message",
        role: receiver.role === "instructor" ? Role.INSTRUCTOR : Role.STUDENT,
        to: receiver.role === "instructor" ? Role.INSTRUCTOR : Role.STUDENT,
        userId: receiver.id,
      });

      const gamificationResult =
        await GamificationService.AddPointsWithGamification(
          userId,
          ActionType.DISCUSSION_PARTICIPATION,
        );

      this.setStatus(201);
      return {
        message: "Message sent successfully",
        data: {
          ...message,
          content: body.content,
        },
        gamification: {
          pointsEarned: gamificationResult.data?.pointsAdded,
          leveledUp: gamificationResult.data?.leveledUp,
          newLevel: gamificationResult.data?.newLevel,
        },
      };
    } catch (error: any) {
      console.error("Error sending private message:", error);
      this.setStatus(500);
      return {
        message: "Failed to send message",
        error: error.message,
      };
    }
  }

  @Security("bearerAuth")
  @Get("/private/conversations")
  public async GetPrivateConversations(@Request() req: any): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return { message: "User not authorized" };
    }

    try {
      const sentMessages = await prisma.privateMessage.findMany({
        where: { senderId: userId },
        distinct: ["receiverId"],
        select: {
          receiverId: true,
          receiver: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      const receivedMessages = await prisma.privateMessage.findMany({
        where: { receiverId: userId },
        distinct: ["senderId"],
        select: {
          senderId: true,
          sender: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      const conversationsMap = new Map();

      for (const msg of sentMessages) {
        if (!conversationsMap.has(msg.receiverId)) {
          const unreadCount = await prisma.privateMessage.count({
            where: {
              senderId: msg.receiverId,
              receiverId: userId,
              readAt: null,
            },
          });

          conversationsMap.set(msg.receiverId, {
            user: msg.receiver,
            lastMessageAt: msg.createdAt,
            unreadCount,
          });
        }
      }

      for (const msg of receivedMessages) {
        if (!conversationsMap.has(msg.senderId)) {
          const unreadCount = await prisma.privateMessage.count({
            where: {
              senderId: msg.senderId,
              receiverId: userId,
              readAt: null,
            },
          });

          conversationsMap.set(msg.senderId, {
            user: msg.sender,
            lastMessageAt: msg.createdAt,
            unreadCount,
          });
        } else {
          const existing = conversationsMap.get(msg.senderId);
          const unreadCount = await prisma.privateMessage.count({
            where: {
              senderId: msg.senderId,
              receiverId: userId,
              readAt: null,
            },
          });
          conversationsMap.set(msg.senderId, {
            ...existing,
            unreadCount,
          });
        }
      }

      const conversations = Array.from(conversationsMap.values()).sort(
        (a, b) =>
          new Date(b.lastMessageAt).getTime() -
          new Date(a.lastMessageAt).getTime(),
      );

      this.setStatus(200);
      return {
        message: "Conversations fetched successfully",
        data: conversations,
      };
    } catch (error: any) {
      console.error("Error fetching conversations:", error);
      this.setStatus(500);
      return {
        message: "Failed to fetch conversations",
        error: error.message,
      };
    }
  }

  /**
   * Get all comments/replies for a specific discussion
   */
  @Get("/public/{discussionId}/comments")
  public async GetDiscussionComments(
    @Path() discussionId: string,
    @Query() page: number = 1,
    @Query() limit: number = 20,
  ): Promise<any> {
    try {
      const skip = (page - 1) * limit;

      // Check discussion exists
      const discussion = await prisma.discussion.findUnique({
        where: { id: discussionId, isPublic: true },
        select: { id: true },
      });

      if (!discussion) {
        this.setStatus(404);
        return { message: "Discussion not found" };
      }

      // Get top-level replies only
      const replies = await prisma.discussion.findMany({
        where: {
          parentId: discussionId,
          isPublic: true,
        },
        include: {
          author: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              user_pic: true,
              role: true,
            },
          },
          _count: {
            select: {
              likes: true,
              replies: true,
            },
          },
          // Fetch nested replies too
          replies: {
            orderBy: { createdAt: "asc" },
            include: {
              author: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  user_pic: true,
                  role: true,
                },
              },
              _count: {
                select: {
                  likes: true,
                },
              },
              parent: {
                include: {
                  author: {
                    select: {
                      id: true,
                      first_name: true,
                      last_name: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
        skip,
        take: limit,
      });

      // Decrypt all content
      const decryptedReplies = replies.map((reply) => ({
        ...reply,
        content: EncryptionUtil.decrypt(reply.content),
        replies: reply.replies.map((nested) => ({
          ...nested,
          content: EncryptionUtil.decrypt(nested.content),
          parent: nested.parent
            ? { ...nested.parent, author: nested.parent.author }
            : null,
        })),
      }));

      const totalCount = await prisma.discussion.count({
        where: {
          parentId: discussionId,
          isPublic: true,
        },
      });

      this.setStatus(200);
      return {
        message: "Comments fetched successfully",
        data: {
          comments: decryptedReplies,
          pagination: {
            page,
            limit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit),
            hasMore: skip + replies.length < totalCount,
          },
        },
      };
    } catch (error: any) {
      console.error("Error fetching comments:", error);
      this.setStatus(500);
      return {
        message: "Failed to fetch comments",
        error: error.message,
      };
    }
  }

  @Security("bearerAuth")
  @Get("/private/{userId}")
  public async GetPrivateMessages(
    @Request() req: any,
    @Path() userId: string,
    @Query() page: number = 1,
    @Query() limit: number = 50,
  ): Promise<any> {
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      this.setStatus(401);
      return { message: "User not authorized" };
    }

    try {
      const skip = (page - 1) * limit;

      const messages = await prisma.privateMessage.findMany({
        where: {
          OR: [
            { senderId: currentUserId, receiverId: userId },
            { senderId: userId, receiverId: currentUserId },
          ],
        },
        include: {
          sender: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              user_pic: true,
              role: true,
            },
          },
          receiver: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              user_pic: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      });

      const decryptedMessages = messages.map((message) => ({
        ...message,
        content: EncryptionUtil.decrypt(message.content),
      }));

      await prisma.privateMessage.updateMany({
        where: {
          senderId: userId,
          receiverId: currentUserId,
          readAt: null,
        },
        data: {
          readAt: new Date(),
        },
      });

      const totalCount = await prisma.privateMessage.count({
        where: {
          OR: [
            { senderId: currentUserId, receiverId: userId },
            { senderId: userId, receiverId: currentUserId },
          ],
        },
      });

      this.setStatus(200);
      return {
        message: "Messages fetched successfully",
        data: {
          messages: decryptedMessages.reverse(),
          pagination: {
            page,
            limit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit),
          },
        },
      };
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      this.setStatus(500);
      return {
        message: "Failed to fetch messages",
        error: error.message,
      };
    }
  }

  @Security("bearerAuth")
  @Get("/private/unread/count")
  public async GetUnreadCount(@Request() req: any): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return { message: "User not authorized" };
    }

    try {
      const unreadCount = await prisma.privateMessage.count({
        where: {
          receiverId: userId,
          readAt: null,
        },
      });

      this.setStatus(200);
      return {
        message: "Unread count fetched",
        data: { unreadCount },
      };
    } catch (error: any) {
      console.error("Error fetching unread count:", error);
      this.setStatus(500);
      return {
        message: "Failed to fetch unread count",
        error: error.message,
      };
    }
  }

  // ==================== TUTOR FETCHING ENDPOINTS ====================

  /**
   * Get tutors/instructors based on student's enrolled courses and groups
   * This returns all instructors/tutors that the student can message
   */

  @Security("bearerAuth")
  @Get("/tutors")
  public async GetAvailableTutors(@Request() req: any): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return { message: "User not authorized" };
    }

    try {
      // Get the user's role
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      // If user is an instructor/tutor, they can see other instructors in their courses
      const isInstructor =
        user?.role === "instructor" ||
        user?.role === "admin" ||
        user?.role === "tutor";

      let tutors: any[] = [];

      if (isInstructor) {
        // For instructors: get other instructors from shared courses
        const instructorCourses = await prisma.course.findMany({
          where: {
            createdUserId: userId,
          },
          select: {
            id: true,
            createdUserId: true,
          },
        });

        const courseIds = instructorCourses.map((c) => c.id);

        // Get other instructors from same courses
        const otherInstructors = await prisma.course.findMany({
          where: {
            id: { in: courseIds },
            createdUserId: { not: userId },
          },
          select: {
            createdByDetails: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                user_pic: true,
                role: true,
              },
            },
          },
        });

        tutors = otherInstructors
          .filter((c) => c.createdByDetails)
          .map((c) => ({
            id: c.createdByDetails.id,
            first_name: c.createdByDetails.first_name,
            last_name: c.createdByDetails.last_name,
            user_pic: c.createdByDetails.user_pic,
            role: c.createdByDetails.role,
            source: "course",
          }));
      } else {
        // For students: get tutors from enrolled courses

        // 1. Get all courses the student is enrolled in
        const enrollments = await prisma.enrollment.findMany({
          where: {
            userId: userId,
            status: "ENROLLED",
          },
          include: {
            course: {
              include: {
                createdByDetails: {
                  select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                    user_pic: true,
                    role: true,
                  },
                },
              },
            },
          },
        });

        // Extract tutors from courses
        const courseTutors = enrollments
          .filter((e) => e.course.createdByDetails)
          .map((e) => ({
            id: e.course.createdByDetails.id,
            first_name: e.course.createdByDetails.first_name,
            last_name: e.course.createdByDetails.last_name,
            user_pic: e.course.createdByDetails.user_pic,
            role: e.course.createdByDetails.role,
            source: "course",
          }));

        // 2. Get groups the student has joined
        const joinedGroups = await prisma.joinedGroup.findMany({
          where: {
            studentId: userId,
            isJoined: true,
          },
          include: {
            group: {
              include: {
                createdBy: {
                  select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                    user_pic: true,
                    role: true,
                  },
                },
              },
            },
          },
        });

        // Extract group creators (tutors)
        const groupTutors = joinedGroups
          .filter((g) => g.group.createdBy)
          .map((g) => ({
            id: g.group.createdBy.id,
            first_name: g.group.createdBy.first_name,
            last_name: g.group.createdBy.last_name,
            user_pic: g.group.createdBy.user_pic,
            role: g.group.createdBy.role,
            source: "group",
          }));

        // Combine and deduplicate tutors
        const tutorMap = new Map();

        [...courseTutors, ...groupTutors].forEach((tutor) => {
          if (!tutorMap.has(tutor.id)) {
            tutorMap.set(tutor.id, {
              ...tutor,
              sources: [tutor.source],
            });
          } else {
            const existing = tutorMap.get(tutor.id);
            existing.sources.push(tutor.source);
            tutorMap.set(tutor.id, existing);
          }
        });

        tutors = Array.from(tutorMap.values());
      }

      // Remove duplicate tutors and sort by name
      const uniqueTutors = tutors.reduce((acc, current) => {
        const exists = acc.find((t) => t.id === current.id);
        if (!exists) {
          acc.push(current);
        }
        return acc;
      }, []);

      uniqueTutors.sort((a, b) => a.first_name.localeCompare(b.first_name));

      // Get last message and unread count for each tutor
      const tutorsWithMessages = await Promise.all(
        uniqueTutors.map(async (tutor) => {
          // Get last message between current user and this tutor
          const lastMessage = await prisma.privateMessage.findFirst({
            where: {
              OR: [
                { senderId: userId, receiverId: tutor.id },
                { senderId: tutor.id, receiverId: userId },
              ],
            },
            orderBy: { createdAt: "desc" },
            select: {
              content: true,
              createdAt: true,
              senderId: true,
            },
          });

          // Get unread count
          const unreadCount = await prisma.privateMessage.count({
            where: {
              senderId: tutor.id,
              receiverId: userId,
              readAt: null,
            },
          });

          // Decrypt last message content if exists
          let lastMessageContent = null;
          if (lastMessage) {
            lastMessageContent = {
              text: EncryptionUtil.decrypt(lastMessage.content),
              time: lastMessage.createdAt,
              isFromCurrentUser: lastMessage.senderId === userId,
            };
          }

          return {
            ...tutor,
            lastMessage: lastMessageContent,
            unreadCount,
            online: false, // Will be updated by Socket.IO
          };
        }),
      );

      // Group tutors by conversation time
      const today: any[] = [];
      const yesterday: any[] = [];
      const persons: any[] = [];

      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);

      tutorsWithMessages.forEach((tutor) => {
        if (!tutor.lastMessage) {
          persons.push(tutor);
          return;
        }

        const messageDate = new Date(tutor.lastMessage.time);

        if (messageDate >= todayStart) {
          today.push(tutor);
        } else if (messageDate >= yesterdayStart) {
          yesterday.push(tutor);
        } else {
          persons.push(tutor);
        }
      });

      this.setStatus(200);
      return {
        message: "Tutors fetched successfully",
        data: {
          today,
          yesterday,
          persons,
          total: tutorsWithMessages.length,
        },
      };
    } catch (error: any) {
      console.error("Error fetching tutors:", error);
      this.setStatus(500);
      return {
        message: "Failed to fetch tutors",
        error: error.message,
      };
    }
  }

  /**
   * Search for tutors by name (for finding new conversations)
   */
  @Security("bearerAuth")
  @Get("/tutors/search")
  public async SearchTutors(
    @Request() req: any,
    @Query() query: string,
    @Query() limit: number = 20,
  ): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return { message: "User not authorized" };
    }

    try {
      if (!query || query.length < 2) {
        this.setStatus(400);
        return { message: "Search query must be at least 2 characters" };
      }

      // Search for users with role instructor/tutor/admin
      const tutors = await prisma.user.findMany({
        where: {
          AND: [
            {
              OR: [
                { role: "instructor" },
                { role: "tutor" },
                { role: "admin" },
              ],
            },
            {
              id: { not: userId },
            },
            {
              OR: [
                { first_name: { contains: query, mode: "insensitive" } },
                { last_name: { contains: query, mode: "insensitive" } },
                { email_address: { contains: query, mode: "insensitive" } },
              ],
            },
          ],
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          user_pic: true,
          role: true,
        },
        take: limit,
      });

      this.setStatus(200);
      return {
        message: "Tutors found",
        data: tutors,
      };
    } catch (error: any) {
      console.error("Error searching tutors:", error);
      this.setStatus(500);
      return {
        message: "Failed to search tutors",
        error: error.message,
      };
    }
  }

  /**
   * Get the latest conversation for a specific tutor
   */
  @Security("bearerAuth")
  @Get("/tutors/{tutorId}/conversation")
  public async GetTutorConversation(
    @Request() req: any,
    @Path() tutorId: string,
    @Query() page: number = 1,
    @Query() limit: number = 50,
  ): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return { message: "User not authorized" };
    }

    try {
      const skip = (page - 1) * limit;

      const messages = await prisma.privateMessage.findMany({
        where: {
          OR: [
            { senderId: userId, receiverId: tutorId },
            { senderId: tutorId, receiverId: userId },
          ],
        },
        include: {
          sender: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              user_pic: true,
              role: true,
            },
          },
          receiver: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              user_pic: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      });

      const decryptedMessages = messages
        .map((message) => ({
          ...message,
          content: EncryptionUtil.decrypt(message.content),
        }))
        .reverse();

      const totalCount = await prisma.privateMessage.count({
        where: {
          OR: [
            { senderId: userId, receiverId: tutorId },
            { senderId: tutorId, receiverId: userId },
          ],
        },
      });

      // Mark messages from tutor as read
      await prisma.privateMessage.updateMany({
        where: {
          senderId: tutorId,
          receiverId: userId,
          readAt: null,
        },
        data: {
          readAt: new Date(),
        },
      });

      this.setStatus(200);
      return {
        message: "Conversation fetched successfully",
        data: {
          messages: decryptedMessages,
          pagination: {
            page,
            limit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit),
          },
        },
      };
    } catch (error: any) {
      console.error("Error fetching conversation:", error);
      this.setStatus(500);
      return {
        message: "Failed to fetch conversation",
        error: error.message,
      };
    }
  }

  /**
   * Get students for tutors/instructors to communicate with
   * Returns all students enrolled in the tutor's courses or groups
   */
  @Security("bearerAuth")
  @Get("/students")
  public async GetAvailableStudents(@Request() req: any): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return { message: "User not authorized" };
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      // Only instructors/tutors/admins can fetch students
      const isInstructor =
        user?.role === "instructor" ||
        user?.role === "admin" ||
        user?.role === "tutor";

      if (!isInstructor) {
        this.setStatus(403);
        return { message: "Only tutors can access this endpoint" };
      }

      // 1. Get all courses created by this tutor
      const tutorCourses = await prisma.course.findMany({
        where: { createdUserId: userId },
        select: { id: true, course_title: true },
      });

      const courseIds = tutorCourses.map((c) => c.id);

      // 2. Get all students enrolled in those courses
      const enrollments = await prisma.enrollment.findMany({
        where: {
          courseId: { in: courseIds },
          status: "ENROLLED",
        },
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              user_pic: true,
              role: true,
            },
          },
        },
      });

      // 3. Get all groups created by this tutor
      const tutorGroups = await prisma.group.findMany({
        where: { userId },
        select: { id: true, group_title: true, member: true },
      });

      const groupIds = tutorGroups.map((g) => g.id);

      // 4. Get all students in those groups
      const groupMembers = await prisma.joinedGroup.findMany({
        where: {
          groupId: { in: groupIds },
          isJoined: true,
        },
        include: {
          student: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              user_pic: true,
              role: true,
            },
          },
        },
      });

      // 5. Combine and deduplicate students
      const studentMap = new Map();

      enrollments.forEach((e) => {
        if (e.user && e.user.id !== userId) {
          if (!studentMap.has(e.user.id)) {
            studentMap.set(e.user.id, {
              ...e.user,
              sources: ["course"],
            });
          }
        }
      });

      groupMembers.forEach((g) => {
        if (g.student && g.student.id !== userId) {
          if (!studentMap.has(g.student.id)) {
            studentMap.set(g.student.id, {
              ...g.student,
              sources: ["group"],
            });
          } else {
            const existing = studentMap.get(g.student.id);
            if (!existing.sources.includes("group")) {
              existing.sources.push("group");
            }
          }
        }
      });

      const students = Array.from(studentMap.values());
      students.sort((a, b) => a.first_name.localeCompare(b.first_name));

      // 6. Get last message and unread count for each student
      const studentsWithMessages = await Promise.all(
        students.map(async (student) => {
          const lastMessage = await prisma.privateMessage.findFirst({
            where: {
              OR: [
                { senderId: userId, receiverId: student.id },
                { senderId: student.id, receiverId: userId },
              ],
            },
            orderBy: { createdAt: "desc" },
            select: {
              content: true,
              createdAt: true,
              senderId: true,
            },
          });

          const unreadCount = await prisma.privateMessage.count({
            where: {
              senderId: student.id,
              receiverId: userId,
              readAt: null,
            },
          });

          let lastMessageContent = null;
          if (lastMessage) {
            lastMessageContent = {
              text: EncryptionUtil.decrypt(lastMessage.content),
              time: lastMessage.createdAt,
              isFromCurrentUser: lastMessage.senderId === userId,
            };
          }

          return {
            ...student,
            lastMessage: lastMessageContent,
            unreadCount,
            online: false,
          };
        }),
      );

      // 7. Group by conversation time (today, yesterday, persons)
      const today: any[] = [];
      const yesterday: any[] = [];
      const persons: any[] = [];

      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);

      studentsWithMessages.forEach((student) => {
        if (!student.lastMessage) {
          persons.push(student);
          return;
        }

        const messageDate = new Date(student.lastMessage.time);

        if (messageDate >= todayStart) {
          today.push(student);
        } else if (messageDate >= yesterdayStart) {
          yesterday.push(student);
        } else {
          persons.push(student);
        }
      });

      this.setStatus(200);
      return {
        message: "Students fetched successfully",
        data: {
          today,
          yesterday,
          persons,
          total: studentsWithMessages.length,
        },
      };
    } catch (error: any) {
      console.error("Error fetching students:", error);
      this.setStatus(500);
      return {
        message: "Failed to fetch students",
        error: error.message,
      };
    }
  }

  // Add to DiscussionController

  /**
   * Update a private message (edit)
   */
  @Security("bearerAuth")
  @Put("/private/message/{messageId}")
  public async UpdatePrivateMessage(
    @Request() req: any,
    @Path() messageId: string,
    @Body() body: { content: string },
  ): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return { message: "User not authorized" };
    }

    try {
      const message = await prisma.privateMessage.findFirst({
        where: {
          id: messageId,
          senderId: userId,
        },
      });

      if (!message) {
        this.setStatus(404);
        return { message: "Message not found or you don't have permission" };
      }

      const encryptedContent = EncryptionUtil.encrypt(body.content);

      const updated = await prisma.privateMessage.update({
        where: { id: messageId },
        data: { content: encryptedContent },
        include: {
          sender: { select: { id: true, first_name: true, last_name: true } },
          receiver: { select: { id: true, first_name: true, last_name: true } },
        },
      });

      this.setStatus(200);
      return {
        message: "Message updated",
        data: {
          ...updated,
          content: body.content,
        },
      };
    } catch (error: any) {
      console.error("Error updating message:", error);
      this.setStatus(500);
      return { message: "Failed to update message", error: error.message };
    }
  }

  /**
   * Delete a private message (soft delete)
   */
  @Security("bearerAuth")
  @Delete("/private/message/{messageId}")
  public async DeletePrivateMessage(
    @Request() req: any,
    @Path() messageId: string,
  ): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return { message: "User not authorized" };
    }

    try {
      const message = await prisma.privateMessage.findFirst({
        where: {
          id: messageId,
          senderId: userId,
        },
      });

      if (!message) {
        this.setStatus(404);
        return { message: "Message not found or you don't have permission" };
      }

      // Soft delete - mark as deleted (you may want to add a deletedAt field)
      // For now, we'll actually delete it
      await prisma.privateMessage.delete({
        where: { id: messageId },
      });

      this.setStatus(200);
      return { message: "Message deleted successfully" };
    } catch (error: any) {
      console.error("Error deleting message:", error);
      this.setStatus(500);
      return { message: "Failed to delete message", error: error.message };
    }
  }

  // Add to DiscussionController

  /**
   * Clear all messages between current user and another user
   */
  @Security("bearerAuth")
  @Delete("/private/clear/{userId}")
  public async ClearPrivateMessages(
    @Request() req: any,
    @Path() userId: string,
  ): Promise<any> {
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      this.setStatus(401);
      return { message: "User not authorized" };
    }

    try {
      await prisma.privateMessage.deleteMany({
        where: {
          OR: [
            { senderId: currentUserId, receiverId: userId },
            { senderId: userId, receiverId: currentUserId },
          ],
        },
      });

      this.setStatus(200);
      return { message: "Chat cleared successfully" };
    } catch (error: any) {
      console.error("Error clearing chat:", error);
      this.setStatus(500);
      return { message: "Failed to clear chat", error: error.message };
    }
  }
}
