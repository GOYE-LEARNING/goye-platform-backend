import {
  Body,
  Controller,
  Post,
  Route,
  Tags,
  Security,
  Request,
  Path,
  Get,
  Delete,
  Put,
  Query,
} from "tsoa";
import { EventDTO, Group, PostDTO, ReplyDTO } from "../interface/interfaces";
import prisma from "../db";
import { MediaService } from "../services/mediaServices";
import { NotificationService, Role } from "../services/notificationServices";
import { GrowthService } from "../services/growthService";
import {
  ActionType,
  GamificationService,
} from "../services/gamificationService";

@Route("socials")
@Tags("Social controllers")
export class SocialController extends Controller {
  @Post("/create-post/{courseId}")
  @Security("bearerAuth")
  public async CreatePost(
    @Request() req: any,
    @Path() courseId: string,
    @Body() body: Omit<PostDTO, "id" | "userId">,
  ): Promise<any> {
    const userId = req.user?.id;
    const orgId = req.org?.id;

    try {
      const createPost = await prisma.post.create({
        data: {
          title: body.title,
          content: body.content,
          userId: orgId ? null : (userId ?? null),
          organizationId: orgId ?? null,
          courseId,
        },
        include: {
          user: userId
            ? {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  user_pic: true,
                },
              }
            : false,
          organization: orgId
            ? {
                select: {
                  id: true,
                  organization_name: true,
                  organization_image: true,
                },
              }
            : false,
          courses: true,
          replies: {
            include: {
              user: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  user_pic: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
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
          _count: {
            select: {
              replies: true,
              likes: true,
            },
          },
        },
      });

      // Award XP for creating a post (discussion participation)
      if (userId) {
        await GamificationService.AddPointsWithGamification(
          userId,
          ActionType.DISCUSSION_PARTICIPATION,
          { courseId },
        );
      }

      this.setStatus(201);
      return {
        message: "Post created successfully",
        data: createPost,
      };
    } catch (error: any) {
      console.error("Error creating post:", error);
      this.setStatus(500);
      return {
        message: "Failed to create post",
        error: error.message,
      };
    }
  }

  @Post("/create-reply/{postId}")
  @Security("bearerAuth")
  public async CreateReply(
    @Request() req: any,
    @Path() postId: string,
    @Body() body: Omit<ReplyDTO, "id" | "userId">,
  ): Promise<any> {
    const userId = req.user?.id;

    try {
      // Validate post exists
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { courseId: true, id: true },
      });

      if (!post) {
        this.setStatus(404);
        return { message: "Post not found" };
      }

      // If this is a nested reply (replying to another reply), validate parent exists
      if (body.parentId) {
        const parentReply = await prisma.reply.findUnique({
          where: { id: body.parentId },
        });

        if (!parentReply) {
          this.setStatus(404);
          return { message: "Parent reply not found" };
        }

        // Ensure parent reply belongs to the same post
        if (parentReply.postId !== postId) {
          this.setStatus(400);
          return { message: "Parent reply does not belong to this post" };
        }
      }

      const createReply = await prisma.reply.create({
        data: {
          content: body.content,
          userId,
          postId: postId,
          parentId: body.parentId || null,
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
          likes: {
            include: {
              user: { select: { id: true, first_name: true, last_name: true } },
            },
          },
          _count: { select: { likes: true } },
          parent: {
            select: {
              id: true,
              content: true,
              user: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                },
              },
            },
          },
          children: {
            take: 3,
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
              _count: { select: { likes: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      // Award XP for creating a reply (discussion participation)
      await GamificationService.AddPointsWithGamification(
        userId,
        ActionType.DISCUSSION_PARTICIPATION,
        { courseId: post.courseId },
      );

      // Send notification to the user being replied to
      if (body.parentId) {
        const parentReply = await prisma.reply.findUnique({
          where: { id: body.parentId },
          include: { user: true },
        });

        if (parentReply && parentReply.userId !== userId) {
          await NotificationService.createNotification({
            message: `${req.user?.first_name || "Someone"} replied to your comment`,
            title: "New Reply",
            type: "reply",
            role: Role.STUDENT,
            to: Role.STUDENT,
            userId: parentReply.userId,
            postId: postId,
            replyId: createReply.id,
          });
        }
      }

      this.setStatus(201);
      return {
        message: body.parentId
          ? "Nested reply created successfully"
          : "Reply created successfully",
        data: createReply,
      };
    } catch (error: any) {
      console.error("Error creating reply:", error);
      this.setStatus(500);
      return { message: "Failed to create reply", error: error.message };
    }
  }

  @Get("/get-post-replies/{postId}")
  public async GetPostReplies(
    @Path() postId: string,
    @Query() page?: number,
    @Query() limit?: number,
  ): Promise<any> {
    try {
      const skip = page && limit ? (page - 1) * limit : undefined;
      const take = limit || undefined;

      const replies = await prisma.reply.findMany({
        where: {
          postId: postId,
          parentId: null, // Only get top-level replies
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
          likes: {
            include: {
              user: { select: { id: true, first_name: true, last_name: true } },
            },
            take: 5,
          },
          _count: { select: { likes: true, children: true } },
          children: {
            take: 2,
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
              _count: { select: { likes: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
        skip,
        take,
      });

      const totalCount = await prisma.reply.count({
        where: { postId: postId, parentId: null },
      });

      this.setStatus(200);
      return {
        message: "Replies fetched successfully",
        data: replies,
        pagination: {
          total: totalCount,
          page: page || 1,
          limit: limit || totalCount,
          totalPages: limit ? Math.ceil(totalCount / limit) : 1,
        },
      };
    } catch (error: any) {
      console.error("Error fetching replies:", error);
      this.setStatus(500);
      return { message: "Failed to fetch replies", error: error.message };
    }
  }

  @Get("/get-post-with-replies/{postId}")
  public async GetPostWithReplies(
    @Path() postId: string,
    @Query() maxDepth?: number,
    @Query() page?: number,
    @Query() limit?: number,
  ): Promise<any> {
    try {
      // First, fetch the post itself
      const post = await prisma.post.findUnique({
        where: { id: postId },
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
          likes: {
            include: {
              user: {
                select: { id: true, first_name: true, last_name: true },
              },
            },
          },
          _count: { select: { likes: true, replies: true } },
        },
      });

      if (!post) {
        this.setStatus(404);
        return { message: "Post not found" };
      }

      // Improved recursive function with depth limiting and pagination
      const maxDepthReached = maxDepth || 3;
      const skip = page && limit ? (page - 1) * limit : 0;
      const take = limit || 20;

      async function fetchRepliesWithChildren(
        postId: string,
        parentId: string | null = null,
        currentDepth: number = 0,
        skipCount: number = 0,
        takeCount: number = 20,
      ): Promise<any[]> {
        // Stop recursion if max depth reached
        if (currentDepth >= maxDepthReached) {
          return [];
        }

        const replies = await prisma.reply.findMany({
          where: { postId, parentId },
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
            likes: {
              include: {
                user: {
                  select: { id: true, first_name: true, last_name: true },
                },
              },
              take: 5,
            },
            _count: { select: { likes: true } },
          },
          orderBy: { createdAt: "asc" },
          skip: parentId === null ? skipCount : 0,
          take: parentId === null ? takeCount : undefined,
        });

        // Recursively fetch children for each reply
        const repliesWithChildren = await Promise.all(
          replies.map(async (reply) => {
            const children = await fetchRepliesWithChildren(
              postId,
              reply.id,
              currentDepth + 1,
              0,
              5, // Limit nested replies to 5 per parent
            );

            // Check if there are more children
            const totalChildren = await prisma.reply.count({
              where: { parentId: reply.id },
            });

            return {
              ...reply,
              children,
              hasMoreChildren: children.length < totalChildren,
              totalChildrenCount: totalChildren,
            };
          }),
        );

        return repliesWithChildren;
      }

      // Fetch all top-level replies and their nested children
      const repliesWithChildren = await fetchRepliesWithChildren(
        postId,
        null,
        0,
        skip,
        take,
      );

      const totalTopLevelReplies = await prisma.reply.count({
        where: { postId, parentId: null },
      });

      this.setStatus(200);
      return {
        message: "Post with all replies fetched successfully",
        data: {
          ...post,
          replies: repliesWithChildren,
        },
        pagination: {
          total: totalTopLevelReplies,
          page: page || 1,
          limit: limit || 20,
          totalPages: limit ? Math.ceil(totalTopLevelReplies / limit) : 1,
        },
      };
    } catch (error: any) {
      console.error("Error fetching post with replies:", error);
      this.setStatus(500);
      return {
        message: "Failed to fetch post with replies",
        error: error.message,
      };
    }
  }

  @Get("/get-reply-thread/{replyId}")
  public async GetReplyThread(
    @Path() replyId: string,
    @Query() maxDepth?: number,
  ): Promise<any> {
    try {
      // Fetch the reply and its parent chain
      const reply = await prisma.reply.findUnique({
        where: { id: replyId },
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
          likes: {
            include: {
              user: { select: { id: true, first_name: true, last_name: true } },
            },
          },
          _count: { select: { likes: true } },
          parent: {
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

      if (!reply) {
        this.setStatus(404);
        return { message: "Reply not found" };
      }

      const maxDepthReached = maxDepth || 5;

      // Fetch all children recursively with depth limit
      async function fetchChildren(
        parentId: string,
        currentDepth: number = 0,
      ): Promise<any[]> {
        if (currentDepth >= maxDepthReached) {
          return [];
        }

        const children = await prisma.reply.findMany({
          where: { parentId },
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
            likes: {
              include: {
                user: {
                  select: { id: true, first_name: true, last_name: true },
                },
              },
              take: 5,
            },
            _count: { select: { likes: true } },
          },
          orderBy: { createdAt: "asc" },
        });

        const childrenWithNested = await Promise.all(
          children.map(async (child) => ({
            ...child,
            children: await fetchChildren(child.id, currentDepth + 1),
            totalChildrenCount: await prisma.reply.count({
              where: { parentId: child.id },
            }),
          })),
        );

        return childrenWithNested;
      }

      const children = await fetchChildren(replyId);

      this.setStatus(200);
      return {
        message: "Reply thread fetched successfully",
        data: {
          ...reply,
          children,
          totalRepliesInThread: await prisma.reply.count({
            where: { postId: reply.postId, parentId: replyId },
          }),
        },
      };
    } catch (error: any) {
      console.error("Error fetching reply thread:", error);
      this.setStatus(500);
      return { message: "Failed to fetch reply thread", error: error.message };
    }
  }

  @Get("/get-child-replies/{replyId}")
  public async GetChildReplies(
    @Path() replyId: string,
    @Query() page?: number,
    @Query() limit?: number,
  ): Promise<any> {
    try {
      const skip = page && limit ? (page - 1) * limit : 0;
      const take = limit || 10;

      const reply = await prisma.reply.findUnique({
        where: { id: replyId },
        select: { id: true },
      });

      if (!reply) {
        this.setStatus(404);
        return { message: "Reply not found" };
      }

      const children = await prisma.reply.findMany({
        where: { parentId: replyId },
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
          likes: {
            include: {
              user: { select: { id: true, first_name: true, last_name: true } },
            },
            take: 5,
          },
          _count: { select: { likes: true, children: true } },
        },
        orderBy: { createdAt: "asc" },
        skip,
        take,
      });

      const totalCount = await prisma.reply.count({
        where: { parentId: replyId },
      });

      this.setStatus(200);
      return {
        message: "Child replies fetched successfully",
        data: children,
        pagination: {
          total: totalCount,
          page: page || 1,
          limit: limit || 10,
          totalPages: limit ? Math.ceil(totalCount / limit) : 1,
        },
      };
    } catch (error: any) {
      console.error("Error fetching child replies:", error);
      this.setStatus(500);
      return { message: "Failed to fetch child replies", error: error.message };
    }
  }

  @Post("/like-post/{postId}")
  @Security("bearerAuth")
  public async LikePost(
    @Path() postId: string,
    @Request() req: any,
  ): Promise<any> {
    const userId = req.user?.id;

    try {
      const findPost = await prisma.post.findUnique({
        where: { id: postId },
        select: { courseId: true },
      });

      if (!findPost) {
        this.setStatus(404);
        return { message: "Post not found" };
      }

      const existingLike = await prisma.likes.findUnique({
        where: { userId_postId: { userId, postId } },
      });

      if (existingLike) {
        this.setStatus(400);
        return { message: "You already liked this post" };
      }

      const like = await prisma.likes.create({
        data: { userId, postId },
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              user_pic: true,
            },
          },
        },
      });

      // Award XP for liking a post (community engagement)
      await GamificationService.AddPointsWithGamification(
        userId,
        ActionType.DISCUSSION_PARTICIPATION,
        { courseId: findPost.courseId },
      );

      const likeCount = await prisma.likes.count({ where: { postId } });
      this.setStatus(201);
      return { message: "Post liked successfully", data: { like, likeCount } };
    } catch (error: any) {
      this.setStatus(500);
      return { message: "Failed to like post", error: error.message };
    }
  }

  @Post("/like-reply/{replyId}")
  @Security("bearerAuth")
  public async LikeReply(
    @Path() replyId: string,
    @Request() req: any,
  ): Promise<any> {
    const userId = req.user?.id;

    try {
      const reply = await prisma.reply.findUnique({
        where: { id: replyId },
        include: { post: { select: { courseId: true } } },
      });

      if (!reply) {
        this.setStatus(404);
        return { message: "Reply not found" };
      }

      const existingLike = await prisma.likes.findUnique({
        where: { userId_replyId: { userId, replyId } },
      });

      if (existingLike) {
        this.setStatus(400);
        return { message: "You already liked this reply" };
      }

      const like = await prisma.likes.create({
        data: { userId, replyId },
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              user_pic: true,
            },
          },
        },
      });

      // Award XP for liking a reply (community engagement)
      await GamificationService.AddPointsWithGamification(
        userId,
        ActionType.DISCUSSION_PARTICIPATION,
        { courseId: reply.post?.courseId },
      );

      const likeCount = await prisma.likes.count({ where: { replyId } });
      this.setStatus(201);
      return { message: "Reply liked successfully", data: { like, likeCount } };
    } catch (error: any) {
      this.setStatus(500);
      return { message: "Failed to like reply", error: error.message };
    }
  }

  @Delete("/unlike-post/{postId}")
  @Security("bearerAuth")
  public async UnlikePost(
    @Path() postId: string,
    @Request() req: any,
  ): Promise<any> {
    const userId = req.user?.id;

    try {
      await prisma.likes.delete({
        where: { userId_postId: { userId, postId } },
      });
      const likeCount = await prisma.likes.count({ where: { postId } });
      this.setStatus(200);
      return { message: "Post unliked successfully", data: { likeCount } };
    } catch (error: any) {
      if (error.code === "P2025") {
        this.setStatus(404);
        return { message: "Like not found" };
      }
      this.setStatus(500);
      return { message: "Failed to unlike post", error: error.message };
    }
  }

  @Delete("/unlike-reply/{replyId}")
  @Security("bearerAuth")
  public async UnlikeReply(
    @Path() replyId: string,
    @Request() req: any,
  ): Promise<any> {
    const userId = req.user?.id;

    try {
      await prisma.likes.delete({
        where: { userId_replyId: { userId, replyId } },
      });
      const likeCount = await prisma.likes.count({ where: { replyId } });
      this.setStatus(200);
      return { message: "Reply unliked successfully", data: { likeCount } };
    } catch (error: any) {
      if (error.code === "P2025") {
        this.setStatus(404);
        return { message: "Like not found" };
      }
      this.setStatus(500);
      return { message: "Failed to unlike reply", error: error.message };
    }
  }

  @Get("/check-like")
  @Security("bearerAuth")
  public async CheckLike(
    @Request() req: any,
    @Query() postId?: string,
    @Query() replyId?: string,
  ): Promise<any> {
    const userId = req.user?.id;

    try {
      if (postId) {
        const like = await prisma.likes.findUnique({
          where: { userId_postId: { userId, postId } },
        });
        return { liked: !!like, type: "post" };
      }

      if (replyId) {
        const like = await prisma.likes.findUnique({
          where: { userId_replyId: { userId, replyId } },
        });
        return { liked: !!like, type: "reply" };
      }

      this.setStatus(400);
      return {
        message: "Must provide either postId or replyId",
      };
    } catch (error: any) {
      this.setStatus(500);
      return { message: "Failed to check like status", error: error.message };
    }
  }

  @Get("/get-all-posts")
  public async GetAllPosts(
    @Query() page?: number,
    @Query() limit?: number,
  ): Promise<any> {
    try {
      const skip = page && limit ? (page - 1) * limit : 0;
      const take = limit || 20;

      const posts = await prisma.post.findMany({
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
          replies: {
            where: { parentId: null },
            take: 3,
            include: {
              user: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  user_pic: true,
                },
              },
              _count: { select: { children: true } },
            },
            orderBy: { createdAt: "asc" },
          },
          likes: {
            include: {
              user: { select: { id: true, first_name: true, last_name: true } },
            },
          },
          _count: { select: { replies: true, likes: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      });

      const totalCount = await prisma.post.count();

      this.setStatus(200);
      return {
        message: "All posts fetched successfully",
        data: posts,
        pagination: {
          total: totalCount,
          page: page || 1,
          limit: limit || 20,
          totalPages: limit ? Math.ceil(totalCount / limit) : 1,
        },
      };
    } catch (error: any) {
      console.error("Error fetching all posts:", error);
      this.setStatus(500);
      return { message: "Failed to fetch posts", error: error.message };
    }
  }

  @Security("bearerAuth")
  @Get("/get-post-by-course/{courseId}")
  public async GetPostByCourseId(
    @Path() courseId: string,
    @Query() page?: number,
    @Query() limit?: number,
  ) {
    try {
      const skip = page && limit ? (page - 1) * limit : 0;
      const take = limit || 20;

      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        this.setStatus(404);
        return { message: "Course not found" };
      }

      const getPost = await prisma.post.findMany({
        where: { courseId },
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              user_pic: true,
            },
          },
          replies: {
            where: { parentId: null },
            take: 2,
            select: {
              id: true,
              content: true,
              user: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  user_pic: true,
                },
              },
              createdAt: true,
              _count: { select: { children: true } },
            },
            orderBy: { createdAt: "desc" },
          },
          _count: { select: { likes: true, replies: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      });

      const totalCount = await prisma.post.count({ where: { courseId } });

      this.setStatus(200);
      return {
        message: "Post fetched successfully",
        data: getPost,
        pagination: {
          total: totalCount,
          page: page || 1,
          limit: limit || 20,
          totalPages: limit ? Math.ceil(totalCount / limit) : 1,
        },
      };
    } catch (error) {
      console.error(error);
      this.setStatus(500);
      return { message: "Failed to fetch posts", error: error.message };
    }
  }

  @Put("/update-reply/{replyId}")
  @Security("bearerAuth")
  public async UpdateReply(
    @Path() replyId: string,
    @Request() req: any,
    @Body() body: { content: string },
  ): Promise<any> {
    const userId = req.user?.id;

    try {
      const existingReply = await prisma.reply.findFirst({
        where: { id: replyId, userId },
      });

      if (!existingReply) {
        this.setStatus(404);
        return { message: "Reply not found or no permission to edit" };
      }

      const updatedReply = await prisma.reply.update({
        where: { id: replyId },
        data: { content: body.content },
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              user_pic: true,
            },
          },
          likes: {
            include: {
              user: { select: { id: true, first_name: true, last_name: true } },
            },
          },
          _count: { select: { likes: true } },
          parent: {
            select: {
              id: true,
              user: { select: { first_name: true, last_name: true } },
            },
          },
        },
      });

      this.setStatus(200);
      return { message: "Reply updated successfully", data: updatedReply };
    } catch (error: any) {
      this.setStatus(500);
      return { message: "Failed to update reply", error: error.message };
    }
  }

  @Delete("/delete-reply/{replyId}")
  @Security("bearerAuth")
  public async DeleteReply(
    @Path() replyId: string,
    @Request() req: any,
  ): Promise<any> {
    const userId = req.user?.id;

    try {
      const existingReply = await prisma.reply.findFirst({
        where: { id: replyId, userId },
        include: {
          children: {
            select: { id: true },
          },
        },
      });

      if (!existingReply) {
        this.setStatus(404);
        return { message: "Reply not found or no permission to delete" };
      }

      // Recursively delete all children
      async function deleteChildren(parentId: string) {
        const children = await prisma.reply.findMany({
          where: { parentId },
          select: { id: true },
        });

        for (const child of children) {
          await deleteChildren(child.id);
          await prisma.reply.delete({ where: { id: child.id } });
        }
      }

      await deleteChildren(replyId);

      // Delete the reply itself
      await prisma.reply.delete({ where: { id: replyId } });

      this.setStatus(200);
      return {
        message: "Reply and all its nested replies deleted successfully",
        deletedCount: existingReply.children.length + 1,
      };
    } catch (error: any) {
      console.error("Error deleting reply:", error);
      this.setStatus(500);
      return { message: "Failed to delete reply", error: error.message };
    }
  }

  @Get("/post-likes/{postId}")
  public async GetPostLikes(
    @Path() postId: string,
    @Query() page?: number,
    @Query() limit?: number,
  ): Promise<any> {
    try {
      const skip = page && limit ? (page - 1) * limit : 0;
      const take = limit || 20;

      const likes = await prisma.likes.findMany({
        where: { postId },
        include: {
          user: {
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
        take,
      });

      const totalCount = await prisma.likes.count({ where: { postId } });

      this.setStatus(200);
      return {
        message: "Post likes fetched successfully",
        data: { likes, likeCount: totalCount },
        pagination: {
          total: totalCount,
          page: page || 1,
          limit: limit || 20,
          totalPages: limit ? Math.ceil(totalCount / limit) : 1,
        },
      };
    } catch (error: any) {
      this.setStatus(500);
      return { message: "Failed to fetch post likes", error: error.message };
    }
  }

  @Get("/reply-likes/{replyId}")
  public async GetReplyLikes(
    @Path() replyId: string,
    @Query() page?: number,
    @Query() limit?: number,
  ): Promise<any> {
    try {
      const skip = page && limit ? (page - 1) * limit : 0;
      const take = limit || 20;

      const likes = await prisma.likes.findMany({
        where: { replyId },
        include: {
          user: {
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
        take,
      });

      const totalCount = await prisma.likes.count({ where: { replyId } });

      this.setStatus(200);
      return {
        message: "Reply likes fetched successfully",
        data: { likes, likeCount: totalCount },
        pagination: {
          total: totalCount,
          page: page || 1,
          limit: limit || 20,
          totalPages: limit ? Math.ceil(totalCount / limit) : 1,
        },
      };
    } catch (error: any) {
      this.setStatus(500);
      return { message: "Failed to fetch reply likes", error: error.message };
    }
  }

  @Security("bearerAuth")
  @Post("/create-group")
  public async CreateGroup(
    @Request() req: any,
    @Body() body: Omit<Group, "id">,
  ): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(404);
      return { message: "User not found" };
    }

    try {
      const group = await prisma.group.create({
        data: {
          group_title: body.group_title,
          group_description: body.group_description,
          group_short_description: body.group_short_description,
          group_image: body.group_image,
          userId: userId,
        },
        include: {
          createdBy: {
            select: {
              first_name: true,
              last_name: true,
              user_pic: true,
            },
          },
        },
      });

      const joinGroup = await prisma.joinedGroup.create({
        data: {
          isJoined: true,
          groupId: group.id,
          studentId: userId,
        },
        include: {
          student: {
            select: {
              first_name: true,
              last_name: true,
            },
          },
        },
      });

      // Award XP for creating and joining a group
      const gamificationResult =
        await GamificationService.AddPointsWithGamification(
          userId,
          ActionType.JOIN_GROUP,
          { groupId: joinGroup.groupId },
        );

      this.setStatus(201);
      return {
        message: "Group created successfully",
        member: `You are now the admin and member of ${group.group_title}`,
        joinGroup,
        group: group,
        gamification: {
          pointsEarned: gamificationResult.data?.pointsAdded,
          leveledUp: gamificationResult.data?.leveledUp,
          newLevel: gamificationResult.data?.newLevel,
          badgesEarned: gamificationResult.data?.badgesEarned,
        },
      };
    } catch (error: any) {
      this.setStatus(500);
      console.error(error.message);
      return { message: "Internal server error" };
    }
  }

  @Security("bearerAuth")
  @Get("/get-groups-created-by-tutor")
  public async GetGroupByCreator(@Request() req: any) {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return {
        message: "User is not authorized",
      };
    }

    const group = await prisma.group.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        event: {
          select: {
            id: true,
            event_name: true,
            event_type: true,
            event_description: true,
            event_link: true,
            event_time: true,
            event_date: true,
          },
        },
        createdBy: {
          select: {
            first_name: true,
            last_name: true,
            user_pic: true,
          },
        },
        _count: {
          select: {
            member: true,
          },
        },
        member: {
          select: {
            student: {
              select: {
                first_name: true,
                last_name: true,
                user_pic: true,
              },
            },
          },
        },
      },
    });

    this.setStatus(200);
    return {
      message: "Group by user fetched successfully",
      data: group,
    };
  }

  @Get("/get-group/{id}")
  public async GetGroupById(@Path() id: string): Promise<any> {
    try {
      const findGroup = await prisma.group.findUnique({
        where: { id },
        include: {
          createdBy: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              user_pic: true,
            },
          },
          event: {
            select: {
              id: true,
              event_name: true,
              event_description: true,
              event_link: true,
              event_type: true,
              event_time: true,
              event_date: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          },
          _count: {
            select: {
              member: true,
              event: true,
            },
          },
          member: {
            select: {
              student: {
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
      });
      this.setStatus(200);
      return { message: "Success finding group", data: findGroup };
    } catch (error) {
      this.setStatus(500);
      console.error(error);
      return { message: "Failed to fetch group", error: error.message };
    }
  }

  @Security("bearerAuth")
  @Get("/get-groups")
  public async GetGroup(@Request() req: any): Promise<any> {
    const userId = req.user?.id;

    try {
      const groups = await prisma.group.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              user_pic: true,
            },
          },
          event: {
            select: {
              id: true,
              event_name: true,
              event_description: true,
              event_link: true,
              event_type: true,
              event_time: true,
              event_date: true,
            },
          },
          member: {
            select: {
              student: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  user_pic: true,
                },
              },
              studentId: true,
            },
          },
          _count: {
            select: {
              member: true,
              event: true,
            },
          },
        },
      });

      const groupsWithStatus = groups.map((group) => {
        const hasJoined = group.member.some(
          (m) => m.studentId === userId || m.student?.id === userId,
        );

        return {
          ...group,
          hasJoined,
        };
      });

      this.setStatus(200);
      return {
        message: "Group fetched successfully",
        data: groupsWithStatus,
        length: groups.length,
      };
    } catch (error) {
      console.error("❌ Error fetching groups:", error);
      this.setStatus(500);
      return {
        message: "Error fetching groups",
        error: error.message,
      };
    }
  }

  @Put("/update-group/{id}")
  public async UpdateGroup(
    @Body()
    body: {
      group_title: string;
      group_short_description: string;
      group_description: string;
      group_image: string;
    },
    @Path() id: string,
  ): Promise<any> {
    try {
      const updateGroup = await prisma.group.update({
        where: { id },
        data: { ...body },
        include: {
          createdBy: {
            select: {
              first_name: true,
              last_name: true,
              user_pic: true,
            },
          },
          event: {
            select: {
              id: true,
              event_name: true,
              event_description: true,
              event_link: true,
              event_type: true,
              event_time: true,
              event_date: true,
            },
          },
          member: {
            select: {
              student: {
                select: {
                  first_name: true,
                  last_name: true,
                  user_pic: true,
                },
              },
            },
          },
          _count: {
            select: {
              member: true,
              event: true,
            },
          },
        },
      });
      this.setStatus(200);
      return {
        message: "Group updated successfully",
        data: updateGroup,
      };
    } catch (error) {
      console.error(error);
      this.setStatus(500);
      return { message: "Failed to update group", error: error.message };
    }
  }

  @Delete("/delete-group/{id}")
  public async DeleteGroup(@Path() id: string): Promise<any> {
    try {
      // Delete in correct order to respect foreign key constraints
      await prisma.$transaction(async (tx) => {
        // 1. Delete all joined events for this group's events
        const events = await tx.event.findMany({
          where: { groupid: id },
          select: { id: true },
        });

        for (const event of events) {
          await tx.joinedEvent.deleteMany({
            where: { eventId: event.id },
          });
        }

        // 2. Delete all events
        await tx.event.deleteMany({
          where: { groupid: id },
        });

        // 3. Delete all achievements related to this group
        await tx.achievement.deleteMany({
          where: { groupId: id },
        });

        // 4. Delete all joined group members
        await tx.joinedGroup.deleteMany({
          where: { groupId: id },
        });

        // 5. Delete all notifications related to this group
        await tx.notification.deleteMany({
          where: { groupId: id },
        });

        // 6. Finally delete the group itself
        await tx.group.delete({
          where: { id },
        });
      });

      this.setStatus(200);
      return {
        message: "Group and all related data deleted successfully",
        groupId: id,
      };
    } catch (error: any) {
      console.error("Error deleting group:", error);
      this.setStatus(500);
      return {
        message: "Failed to delete group",
        error: error.message,
      };
    }
  }

  @Post("/upload-group-image/{groupId}")
  public async UploadGroupImage(
    @Path() groupId: string,
    @Body()
    body: {
      file: string;
      fileName: string;
      mimeType: string;
    },
  ): Promise<any> {
    const group = await prisma.group.findUnique({
      where: {
        id: groupId,
      },
    });
    const buffer = Buffer.from(body.file, "base64");
    try {
      const uploaded = await MediaService.uploadGroupImage(
        group.id,
        buffer,
        body.fileName,
        body.mimeType,
      );
      this.setStatus(201);
      return { message: "Image uploaded successfully", data: uploaded };
    } catch (error) {
      console.error(error);
      this.setStatus(500);
      return { message: "Failed to upload image", error: error.message };
    }
  }

  @Security("bearerAuth")
  @Get("/check-joined/{groupId}")
  public async CheckJoined(@Request() req: any, @Path() groupId: string) {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return {
        message: "User not authenticated",
        data: false,
      };
    }

    const joinedRecord = await prisma.joinedGroup.findUnique({
      where: {
        groupId_studentId: {
          groupId,
          studentId: userId,
        },
      },
      select: {
        isJoined: true,
      },
    });

    this.setStatus(200);
    return {
      message: "Group join status checked",
      data: joinedRecord ? joinedRecord.isJoined : false,
    };
  }

  @Security("bearerAuth")
  @Post("/join-group/{groupId}")
  public async JoinGroup(@Request() req: any, @Path() groupId: string) {
    const userId = req.user?.id;
    const progressId = req.progressId;

    if (!userId) {
      this.setStatus(401);
      return { message: "User not authorized" };
    }

    if (!groupId) {
      this.setStatus(404);
      return { message: "Group not found" };
    }

    const isJoined = await prisma.joinedGroup.findUnique({
      where: {
        groupId_studentId: {
          studentId: userId,
          groupId,
        },
      },
      include: {
        student: {
          select: {
            id: true,
            first_name: true,
          },
        },
        group: {
          select: {
            id: true,
            group_title: true,
          },
        },
      },
    });

    let result: any;
    let studentName: any;
    let groupTitle: any;
    let gamificationResult: any = null;
    let joinedGroupId: string | null = null;

    if (isJoined) {
      // User already has a record
      if (isJoined.isJoined) {
        this.setStatus(200);
        return { message: "Already Joined" };
      }

      // Rejoining - update existing record
      studentName = isJoined.student.first_name;
      groupTitle = isJoined.group.group_title;
      joinedGroupId = isJoined.id; // Get the JoinedGroup ID

      result = await prisma.joinedGroup.update({
        where: {
          groupId_studentId: {
            groupId,
            studentId: userId,
          },
        },
        data: { isJoined: true },
        include: {
          group: {
            select: { group_title: true, id: true },
          },
        },
      });

      await NotificationService.createNotification({
        message: `Hello ${studentName}, you rejoined ${groupTitle}`,
        title: "Group Message",
        type: "group",
        role: Role.STUDENT,
        to: Role.STUDENT,
        userId: userId,
        groupId: groupId,
      });
    } else {
      // First time joining - create new record
      result = await prisma.joinedGroup.create({
        data: {
          studentId: userId,
          groupId,
          isJoined: true,
        },
        include: {
          student: {
            select: { first_name: true },
          },
          group: {
            select: { id: true, group_title: true },
          },
        },
      });

      studentName = result.student?.first_name || "User";
      groupTitle = result.group.group_title;
      joinedGroupId = result.id; // Get the newly created JoinedGroup ID

      await NotificationService.createNotification({
        message: `Hello ${studentName}, you just joined ${groupTitle}`,
        title: "Group Message",
        type: "group",
        role: Role.STUDENT,
        to: Role.STUDENT,
        userId: userId,
        groupId: groupId,
      });

      // Handle progressId properly
      let finalProgressId = progressId;
      if (!finalProgressId) {
        const existingProgress = await prisma.progress.findFirst({
          where: { userId: userId },
        });

        if (existingProgress) {
          finalProgressId = existingProgress.id;
        } else {
          const newProgress = await prisma.progress.create({
            data: {
              userId: userId,
              progressBar: 0,
              startedJourney: true,
            },
          });
          finalProgressId = newProgress.id;
        }
      }

      await GrowthService.AchievementMessage({
        message_title: "Group Achievement",
        message_content: `You just joined ${groupTitle}`,
        point: 10,
        userId: userId,
        progressId: finalProgressId,
        groupId: groupId,
      });
    }

    // Award XP - Pass the JOINEDGROUP ID, not the Group ID
    if (joinedGroupId) {
      gamificationResult = await GamificationService.AddPointsWithGamification(
        userId,
        ActionType.JOIN_GROUP,
        {
          groupId: groupId, // For metadata
          joinedGroupId: joinedGroupId, // Pass the JoinedGroup ID for point history
        },
      );
    }

    this.setStatus(200);
    return {
      message: isJoined
        ? "Rejoined successfully"
        : "User has joined successfully",
      data: result,
      gamification: gamificationResult
        ? {
            pointsEarned: gamificationResult.data?.pointsAdded,
            leveledUp: gamificationResult.data?.leveledUp,
            newLevel: gamificationResult.data?.newLevel,
            badgesEarned: gamificationResult.data?.badgesEarned,
          }
        : null,
    };
  }

  @Security("bearerAuth")
  @Delete("/exit-group/{groupId}")
  public async ExitGroup(@Path() groupId: string, @Request() req: any) {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return {
        message: "User unauthorized",
      };
    }

    const group = await prisma.group.findUnique({
      where: {
        id: groupId,
      },
    });

    if (!group) {
      this.setStatus(404);
      return {
        message: "This group does not exist",
      };
    }

    const isJoined = await prisma.joinedGroup.findUnique({
      where: {
        groupId_studentId: {
          groupId,
          studentId: userId,
        },
      },
      include: {
        group: {
          select: {
            achievement: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!isJoined) {
      this.setStatus(404);
      return {
        message: "User is not a member of this group",
      };
    }

    // Delete the joined group record
    const existgroup = await prisma.joinedGroup.delete({
      where: {
        groupId_studentId: {
          groupId,
          studentId: userId,
        },
      },
      include: {
        group: {
          select: {
            achievement: {
              select: {
                id: true,
              },
            },
          },
          
        },
        student: {
          select: {
            first_name: true,
            last_name: true
          }
        }
      },
    });

    await GamificationService.DeleteUserPoints(userId, {
      joinedGroupId: existgroup.id,
      reason: `${existgroup.student.first_name} ${existgroup.student.last_name} lost a point because he left a group.`
    });

    // Safely delete achievements if they exist
    if (
      existgroup.group.achievement &&
      existgroup.group.achievement.length > 0
    ) {
      const achievementIds = existgroup.group.achievement.map((a) => a.id);

      // Delete all achievements associated with this group membership
      await prisma.achievement.deleteMany({
        where: {
          id: {
            in: achievementIds,
          },
        },
      });
    }

    this.setStatus(200);
    return {
      message: "This user just left the group.",
      data: existgroup,
    };
  }

  @Post("/create-event/{groupId}")
  public async CreateEvent(
    @Body() body: Omit<EventDTO, "id">,
    @Path() groupId: string,
  ): Promise<any> {
    try {
      const createEvent = await prisma.event.create({
        data: {
          event_name: body.event_name,
          event_description: body.event_description,
          event_time: body.event_time,
          event_type: body.event_type,
          event_link: body.event_link,
          event_date: body.event_date,
          groupid: groupId,
        },
      });

      // Get all group members to award XP for event creation
      const groupMembers = await prisma.joinedGroup.findMany({
        where: { groupId, isJoined: true },
        select: { studentId: true },
      });

      // Award XP to group members for event attendance (when they join/attend)
      // Note: You might want to create a separate endpoint for event attendance
      for (const member of groupMembers) {
        await GamificationService.AddPointsWithGamification(
          member.studentId,
          ActionType.ATTEND_EVENT,
          { eventId: createEvent.id, groupId },
        );
      }

      this.setStatus(201);
      return { message: "Event created successfully", data: createEvent };
    } catch (error) {
      console.error(error);
      this.setStatus(500);
      return { message: "Failed to create event", error: error.message };
    }
  }

  @Security("bearerAuth")
  @Post("/attend-event/{eventId}")
  public async AttendEvent(
    @Request() req: any,
    @Path() eventId: string,
  ): Promise<any> {
    const userId = req.user?.id;

    if (!userId) {
      this.setStatus(401);
      return { message: "User not authorized" };
    }

    try {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: { group: true },
      });

      if (!event) {
        this.setStatus(404);
        return { message: "Event not found" };
      }

      // Check if user is a member of the group
      const isMember = await prisma.joinedGroup.findUnique({
        where: {
          groupId_studentId: {
            groupId: event.groupid,
            studentId: userId,
          },
        },
      });

      if (!isMember || !isMember.isJoined) {
        this.setStatus(403);
        return { message: "You must join the group first to attend events" };
      }

      // Check if user already attended
      const existingAttendance = await prisma.joinedEvent.findFirst({
        where: {
          eventId,
          groupId: event.groupid,
        },
      });

      let joinedEvent;

      if (existingAttendance) {
        joinedEvent = await prisma.joinedEvent.update({
          where: { id: existingAttendance.id },
          data: { isjoinedEvent: true },
        });
      } else {
        joinedEvent = await prisma.joinedEvent.create({
          data: {
            eventId,
            groupId: event.groupid,
            isjoinedEvent: true,
          },
        });
      }

      // Award XP for attending event
      const gamificationResult =
        await GamificationService.AddPointsWithGamification(
          userId,
          ActionType.ATTEND_EVENT,
          { eventId, groupId: event.groupid },
        );

      this.setStatus(200);
      return {
        message: "Successfully attended event",
        data: { event, joinedEvent },
        gamification: {
          pointsEarned: gamificationResult.data?.pointsAdded,
          leveledUp: gamificationResult.data?.leveledUp,
          newLevel: gamificationResult.data?.newLevel,
          badgesEarned: gamificationResult.data?.badgesEarned,
        },
      };
    } catch (error: any) {
      console.error("Error attending event:", error);
      this.setStatus(500);
      return { message: "Failed to attend event", error: error.message };
    }
  }

  @Security("bearerAuth")
  @Get("/fetch-event-by-the-student-group")
  public async GetEvent(@Request() req: any): Promise<any> {
    const userId = req.user?.id;

    try {
      const joinedGroups = await prisma.joinedGroup.findMany({
        where: {
          studentId: userId,
        },
        select: {
          groupId: true,
        },
      });

      const groupIds = joinedGroups.map((jg) => jg.groupId);

      if (groupIds.length === 0) {
        this.setStatus(200);
        return {
          message: "No groups found for student",
          data: [],
          count: 0,
        };
      }

      const events = await prisma.event.findMany({
        where: {
          groupid: {
            in: groupIds,
          },
        },
        orderBy: { createdAt: "desc" },
        include: {
          group: {
            select: {
              id: true,
              group_title: true,
              createdAt: true,
            },
          },
        },
      });

      this.setStatus(200);
      return {
        message: "Events fetched successfully",
        data: events,
        count: events.length,
      };
    } catch (error: any) {
      console.error("Error fetching events:", error);
      this.setStatus(500);
      return {
        message: "Failed to fetch events",
        error: error.message,
        data: null,
      };
    }
  }

  @Security("bearerAuth")
  @Get("/get-group-event/{groupId}")
  public async GetGroupEvent(@Path() groupId: string): Promise<any> {
    try {
      if (!groupId) {
        this.setStatus(404);
        return {
          message: "Group not found",
        };
      }

      const event = await prisma.event.findMany({
        where: {
          groupid: groupId,
        },
        orderBy: { createdAt: "desc" },
      });
      this.setStatus(200);
      return {
        message: "Event from group fetched successfully",
        data: event,
        count: event.length,
      };
    } catch (error) {
      console.error(error);
      this.setStatus(500);
      return { message: "Failed to fetch events", error: error.message };
    }
  }

  @Get("/get-event/{id}")
  public async GetEventById(@Path() id: string): Promise<any> {
    try {
      const event = await prisma.event.findUnique({ where: { id } });
      this.setStatus(200);
      return { message: "Event fetched successfully", data: event };
    } catch (error) {
      console.error(error);
      this.setStatus(500);
      return { message: "Failed to fetch event", error: error.message };
    }
  }

  @Put("/update-event/{id}")
  public async UpdateEvent(
    @Path() id: string,
    @Body() body: Omit<EventDTO, "id">,
  ): Promise<any> {
    try {
      const updateEvent = await prisma.event.update({
        where: { id },
        data: { ...body },
      });
      this.setStatus(200);
      return { message: "Event updated successfully", data: updateEvent };
    } catch (error) {
      console.error(error);
      this.setStatus(500);
      return { message: "Failed to update event", error: error.message };
    }
  }

  @Delete("/delete-event/{id}")
  public async DeleteEvent(@Path() id: string): Promise<any> {
    try {
      await prisma.event.delete({ where: { id } });
      this.setStatus(200);
      return { message: "Event deleted successfully" };
    } catch (error) {
      console.error(error);
      this.setStatus(500);
      return { message: "Failed to delete event", error: error.message };
    }
  }
}
