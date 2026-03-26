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

interface CreateDiscussionDTO {
  content: string;
  isPublic: boolean;
}

interface ReplyToDiscussionDTO {
  content: string;
}

interface SendPrivateMessageDTO {
  receiverId: string;
  content: string;
}

@Route("discussion")
@Tags("Discussion & Messaging APIs")
export class DiscussionController extends Controller {
  
  // ==================== PUBLIC DISCUSSIONS ====================
  
  /**
   * Create a new public discussion
   */
  @Security("bearerAuth")
  @Post("/public")
  public async CreatePublicDiscussion(
    @Request() req: any,
    @Body() body: CreateDiscussionDTO
  ): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return { message: "User not authorized" };
    }

    try {
      const discussion = await prisma.discussion.create({
        data: {
          content: body.content,
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

      // Award XP for starting a discussion
      const gamificationResult = await GamificationService.AddPointsWithGamification(
        userId,
        ActionType.DISCUSSION_PARTICIPATION,
      );

      this.setStatus(201);
      return {
        message: "Discussion created successfully",
        data: discussion,
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

  /**
   * Get all public discussions
   */
  @Get("/public")
  public async GetPublicDiscussions(
    @Query() sort: "latest" | "popular" = "latest"
  ): Promise<any> {
    try {
      
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
          replies: {
            take: 3,
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
            },
          },
        },
        orderBy,

      });

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
          discussions,
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
   * Get a single discussion with all replies
   */
  @Get("/public/{discussionId}")
  public async GetDiscussionById(
    @Path() discussionId: string,
    @Query() page: number = 1,
    @Query() limit: number = 20
  ): Promise<any> {
    try {
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
              replies: {
                take: 3,
                orderBy: { createdAt: "asc" },
                include: {
                  author: {
                    select: {
                      id: true,
                      first_name: true,
                      last_name: true,
                      user_pic: true,
                    },
                  },
                },
              },
            },
          },
          likes: {
            include: {
              user: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
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

      const totalReplies = await prisma.discussion.count({
        where: {
          parentId: discussionId,
        },
      });

      this.setStatus(200);
      return {
        message: "Discussion fetched successfully",
        data: {
          ...discussion,
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
   * Reply to a discussion
   */
  @Security("bearerAuth")
  @Post("/public/{discussionId}/reply")
  public async ReplyToDiscussion(
    @Request() req: any,
    @Path() discussionId: string,
    @Body() body: ReplyToDiscussionDTO
  ): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return { message: "User not authorized" };
    }

    try {
      // Check if parent discussion exists
      const parent = await prisma.discussion.findUnique({
        where: { id: discussionId, isPublic: true },
        include: {
          author: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              role: true
            },
          },
        },
      });

      if (!parent) {
        this.setStatus(404);
        return { message: "Discussion not found" };
      }

      const reply = await prisma.discussion.create({
        data: {
          content: body.content,
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

      // Award XP for replying
      const gamificationResult = await GamificationService.AddPointsWithGamification(
        userId,
        ActionType.DISCUSSION_PARTICIPATION,
      );

      // Send notification to the discussion author
      if (parent.authorId !== userId) {
        await NotificationService.createNotification({
          message: `${req.user?.first_name} ${req.user?.last_name} replied to your discussion"`,
          title: "New Reply",
          type: "discussion",
          role: parent.author.role === "instructor" ? Role.INSTRUCTOR : Role.STUDENT,
          to: parent.author.role === "instructor" ? Role.INSTRUCTOR : Role.STUDENT,
          userId: parent.authorId,
        });
      }

      this.setStatus(201);
      return {
        message: "Reply added successfully",
        data: reply,
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
   * Like or unlike a discussion/reply
   */
  @Security("bearerAuth")
  @Post("/{discussionId}/like")
  public async ToggleLike(
    @Request() req: any,
    @Path() discussionId: string
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

  /**
   * Delete a discussion or reply (only author or admin can delete)
   */
  @Security("bearerAuth")
  @Delete("/{discussionId}")
  public async DeleteDiscussion(
    @Request() req: any,
    @Path() discussionId: string
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

      // Check if user is author or admin/instructor
      if (discussion.authorId !== userId && userRole !== "instructor" && userRole !== "admin") {
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

  // ==================== PRIVATE MESSAGES ====================
  
  /**
   * Send a private message to another user
   */
  @Security("bearerAuth")
  @Post("/private")
  public async SendPrivateMessage(
    @Request() req: any,
    @Body() body: SendPrivateMessageDTO
  ): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return { message: "User not authorized" };
    }

    try {
      // Check if receiver exists
      const receiver = await prisma.user.findUnique({
        where: { id: body.receiverId },
      });

      if (!receiver) {
        this.setStatus(404);
        return { message: "User not found" };
      }

      // Don't allow sending message to self
      if (userId === body.receiverId) {
        this.setStatus(400);
        return { message: "You cannot send a message to yourself" };
      }

      const message = await prisma.privateMessage.create({
        data: {
          content: body.content,
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

      // Send notification
      await NotificationService.createNotification({
        message: `${req.user?.first_name} ${req.user?.last_name} sent you a private message`,
        title: "New Private Message",
        type: "private_message",
        role: receiver.role === "instructor" ? Role.INSTRUCTOR : Role.STUDENT,
        to: receiver.role === "instructor" ? Role.INSTRUCTOR : Role.STUDENT,
        userId: receiver.id,
      });

      // Award XP for sending a message
      const gamificationResult = await GamificationService.AddPointsWithGamification(
        userId,
        ActionType.DISCUSSION_PARTICIPATION,
      );

      this.setStatus(201);
      return {
        message: "Message sent successfully",
        data: message,
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

  /**
   * Get all conversations (list of users you've messaged with)
   */
  @Security("bearerAuth")
  @Get("/private/conversations")
  public async GetPrivateConversations(@Request() req: any): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return { message: "User not authorized" };
    }

    try {
      // Get all unique users that the current user has messaged with
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

      // Combine and deduplicate
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
          // Update unread count for existing conversation
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

      const conversations = Array.from(conversationsMap.values())
        .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

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
   * Get private messages between current user and another user
   */
  @Security("bearerAuth")
  @Get("/private/{userId}")
  public async GetPrivateMessages(
    @Request() req: any,
    @Path() userId: string,
    @Query() page: number = 1,
    @Query() limit: number = 50
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

      // Mark messages as read
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
          messages: messages.reverse(),
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

  /**
   * Get unread message count
   */
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
}