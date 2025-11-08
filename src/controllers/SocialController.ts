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
import { EventDTO, PostDTO, ReplyDTO } from "../interface/interfaces.js";
import prisma from "../db.js";

@Route("socials")
@Tags("Social controllers")
export class SocialController extends Controller {
  @Post("/create-post")
  @Security("bearerAuth")
  public async CreatePost(
    @Request() req: any,
    @Body() body: Omit<PostDTO, "id" | "userId">
  ): Promise<any> {
    const userId = req.user?.id;

    const createPost = await prisma.post.create({
      data: {
        title: body.title,
        content: body.content,
        userId: userId,
      },
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

    this.setStatus(201);
    return {
      message: "Post created successfully",
      data: createPost,
    };
  }

  @Post("/create-reply")
  @Security("bearerAuth")
  public async CreateReply(
    @Request() req: any,
    @Body() body: Omit<ReplyDTO, "id" | "userId">
  ): Promise<any> {
    const userId = req.user?.id;

    try {
      const post = await prisma.post.findUnique({
        where: { id: body.postId },
      });

      if (!post) {
        this.setStatus(404);
        return {
          message: "Post not found",
        };
      }

      const createReply = await prisma.reply.create({
        data: {
          content: body.content,
          userId: userId,
          postId: body.postId,
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
          post: {
            select: {
              id: true,
              title: true,
              user: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
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
          _count: {
            select: {
              likes: true,
            },
          },
        },
      });

      this.setStatus(201);
      return {
        message: "Reply created successfully",
        data: createReply,
      };
    } catch (error: any) {
      this.setStatus(500);
      return {
        message: "Failed to create reply",
        error: error.message,
      };
    }
  }

  // Get all replies for a post
  @Get("/get-post-replies/{postId}")
  public async GetPostReplies(@Path() postId: string): Promise<any> {
    const replies = await prisma.reply.findMany({
      where: { postId: postId },
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
            likes: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    this.setStatus(200);
    return {
      message: "Replies fetched successfully",
      data: replies,
      count: replies.length,
    };
  }

  // Get post with all replies
  @Get("/get-post-with-replies/{postId}")
  public async GetPostWithReplies(@Path() postId: string): Promise<any> {
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
        replies: {
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
                likes: true,
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

    if (!post) {
      this.setStatus(404);
      return {
        message: "Post not found",
      };
    }

    this.setStatus(200);
    return {
      message: "Post with replies fetched successfully",
      data: post,
    };
  }

  @Post("/like-post/{postId}")
  @Security("bearerAuth")
  public async LikePost(
    @Path() postId: string,
    @Request() req: any
  ): Promise<any> {
    const userId = req.user?.id;

    try {
      const findPost = await prisma.post.findUnique({
        where: {
          id: postId,
        },
      });

      if (!findPost) {
        this.setStatus(404);
        return {
          message: "Post not found",
        };
      }

      const existingLike = await prisma.likes.findUnique({
        where: {
          userId_postId: {
            userId: userId,
            postId: postId,
          },
        },
      });

      if (existingLike) {
        this.setStatus(400);
        return { message: "You already liked this post" };
      }

      const like = await prisma.likes.create({
        data: {
          userId,
          postId,
        },
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

      const likeCount = await prisma.likes.count({
        where: { postId: postId },
      });

      this.setStatus(201);
      return {
        message: "Post liked successfully",
        data: {
          like,
          likeCount,
        },
      };
    } catch (error: any) {
      this.setStatus(500);
      return {
        message: "Failed to like post",
        error: error.message,
      };
    }
  }

  @Post("/like-reply/{replyId}")
  @Security("bearerAuth")
  public async LikeReply(
    @Path() replyId: string,
    @Request() req: any
  ): Promise<any> {
    const userId = req.user?.id;

    try {
      const reply = await prisma.reply.findUnique({
        where: { id: replyId },
      });

      if (!reply) {
        this.setStatus(404);
        return { message: "Reply not found" };
      }

      const existingLike = await prisma.likes.findUnique({
        where: {
          userId_replyId: {
            userId: userId,
            replyId: replyId,
          },
        },
      });

      if (existingLike) {
        this.setStatus(400);
        return { message: "You already liked this reply" };
      }

      const like = await prisma.likes.create({
        data: {
          userId: userId,
          replyId: replyId,
        },
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

      const likeCount = await prisma.likes.count({
        where: { replyId: replyId },
      });

      this.setStatus(201);
      return {
        message: "Reply liked successfully",
        data: {
          like,
          likeCount,
        },
      };
    } catch (error: any) {
      this.setStatus(500);
      return {
        message: "Failed to like reply",
        error: error.message,
      };
    }
  }

  @Delete("/unlike-post/{postId}")
  @Security("bearerAuth")
  public async UnlikePost(
    @Path() postId: string,
    @Request() req: any
  ): Promise<any> {
    const userId = req.user?.id;

    try {
      await prisma.likes.delete({
        where: {
          userId_postId: {
            userId: userId,
            postId: postId,
          },
        },
      });

      const likeCount = await prisma.likes.count({
        where: { postId: postId },
      });

      this.setStatus(200);
      return {
        message: "Post unliked successfully",
        data: { likeCount },
      };
    } catch (error: any) {
      if (error.code === "P2025") {
        this.setStatus(404);
        return { message: "Like not found" };
      }
      this.setStatus(500);
      return {
        message: "Failed to unlike post",
        error: error.message,
      };
    }
  }

  @Delete("/unlike-reply/{replyId}")
  @Security("bearerAuth")
  public async UnlikeReply(
    @Path() replyId: string,
    @Request() req: any
  ): Promise<any> {
    const userId = req.user?.id;

    try {
      await prisma.likes.delete({
        where: {
          userId_replyId: {
            userId: userId,
            replyId: replyId,
          },
        },
      });

      const likeCount = await prisma.likes.count({
        where: { replyId: replyId },
      });

      this.setStatus(200);
      return {
        message: "Reply unliked successfully",
        data: { likeCount },
      };
    } catch (error: any) {
      if (error.code === "P2025") {
        this.setStatus(404);
        return { message: "Like not found" };
      }
      this.setStatus(500);
      return {
        message: "Failed to unlike reply",
        error: error.message,
      };
    }
  }

  @Get("/check-like")
  @Security("bearerAuth")
  public async CheckLike(
    @Request() req: any,
    @Query() postId?: string,
    @Query() replyId?: string
  ): Promise<any> {
    const userId = req.user?.id;

    try {
      if (postId) {
        const like = await prisma.likes.findUnique({
          where: {
            userId_postId: {
              userId: userId,
              postId: postId,
            },
          },
        });
        return {
          liked: !!like,
          type: "post",
        };
      }

      if (replyId) {
        const like = await prisma.likes.findUnique({
          where: {
            userId_replyId: {
              userId: userId,
              replyId: replyId,
            },
          },
        });
        return {
          liked: !!like,
          type: "reply",
        };
      }

      this.setStatus(400);
      return { message: "Must provide either postId or replyId" };
    } catch (error: any) {
      this.setStatus(500);
      return {
        message: "Failed to check like status",
        error: error.message,
      };
    }
  }

  @Get("/get-all-posts")
  public async GetAllPosts(): Promise<any> {
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
          take: 3,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    this.setStatus(200);
    return {
      message: "All posts fetched successfully",
      data: posts,
      count: posts.length,
    };
  }

  @Put("/update-reply/{replyId}")
  @Security("bearerAuth")
  public async UpdateReply(
    @Path() replyId: string,
    @Request() req: any,
    @Body() body: { content: string }
  ): Promise<any> {
    const userId = req.user?.id;

    try {
      const existingReply = await prisma.reply.findFirst({
        where: {
          id: replyId,
          userId: userId,
        },
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
              likes: true,
            },
          },
        },
      });

      this.setStatus(200);
      return {
        message: "Reply updated successfully",
        data: updatedReply,
      };
    } catch (error: any) {
      this.setStatus(500);
      return {
        message: "Failed to update reply",
        error: error.message,
      };
    }
  }

  @Delete("/delete-reply/{replyId}")
  @Security("bearerAuth")
  public async DeleteReply(
    @Path() replyId: string,
    @Request() req: any
  ): Promise<any> {
    const userId = req.user?.id;

    try {
      const existingReply = await prisma.reply.findFirst({
        where: {
          id: replyId,
          userId: userId,
        },
      });

      if (!existingReply) {
        this.setStatus(404);
        return { message: "Reply not found or no permission to delete" };
      }

      await prisma.reply.delete({
        where: { id: replyId },
      });

      this.setStatus(200);
      return { message: "Reply deleted successfully" };
    } catch (error: any) {
      this.setStatus(500);
      return {
        message: "Failed to delete reply",
        error: error.message,
      };
    }
  }

  @Get("/post-likes/{postId}")
  public async GetPostLikes(@Path() postId: string): Promise<any> {
    try {
      const likes = await prisma.likes.findMany({
        where: { postId: postId },
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
      });

      this.setStatus(200);
      return {
        message: "Post likes fetched successfully",
        data: {
          likes,
          likeCount: likes.length,
        },
      };
    } catch (error: any) {
      this.setStatus(500);
      return {
        message: "Failed to fetch post likes",
        error: error.message,
      };
    }
  }

  @Get("/reply-likes/{replyId}")
  public async GetReplyLikes(@Path() replyId: string): Promise<any> {
    try {
      const likes = await prisma.likes.findMany({
        where: { replyId: replyId },
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
      });

      this.setStatus(200);
      return {
        message: "Reply likes fetched successfully",
        data: {
          likes,
          likeCount: likes.length,
        },
      };
    } catch (error: any) {
      this.setStatus(500);
      return {
        message: "Failed to fetch reply likes",
        error: error.message,
      };
    }
  }

  @Post("/create-event")
  public async CreateEvent(@Body() body: Omit<EventDTO, "id">): Promise<any> {
    const event = prisma.event.create({
      data: {
        ...(body as any),
      },
    });

    this.setStatus(201);
    return {
      message: "Create Event",
      event,
    };
  }

  @Get("/get-event")
  public async GetEvent(): Promise<any> {
    const getEvent = await prisma.event.findMany();
    this.setStatus(200);
    return {
      message: "Event fetch successfully",
      getEvent,
    };
  }

  @Get("get-event/{id}")
  public async GetEventById(@Path() id: string) {
    const getEventById = await prisma.event.findUnique({
      where: { id: id },
    });

    if (!getEventById) {
      this.setStatus(404);
      return {
        message: "Event Not found",
      };
    }

    this.setStatus(200);
    return {
      message: `Event successfull By Id: ${getEventById.id}`,
      getEventById,
    };
  }

  @Put("/update-event/{id}")
  public async UpdateEvent(
    @Path() id: string,
    @Body()
    body: {
      id: string;
      event_name?: string;
      event_description?: string;
      event_time?: string;
      event_date?: string;
      event_type?: string;
      event_link?: string;
    }
  ) {
    const updateEvent = await prisma.event.update({
      where: { id },
      data: {
        event_name: body.event_name,
        event_description: body.event_description,
        event_time: body.event_time,
        event_data: body.event_date,
        event_type: body.event_type,
        event_link: body.event_link,
      },
    });

    this.setStatus(201);
    return {
      message: "Update successfull",
      updateEvent,
    };
  }

  @Delete("/delete-event/{id}")
  public async DeleteEvent(@Path() id: string) {
    const deleteEvent = await prisma.event.delete({
      where: {
        id,
      },
    });

    this.setStatus(200);
    return {
      message: "Delete event successfull",
      deleteEvent,
    };
  }
}
