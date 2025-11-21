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
import { MediaService } from "../services/mediaServices.js";

@Route("socials")
@Tags("Social controllers")
export class SocialController extends Controller {
  @Post("/create-post/{courseId}")
  @Security("bearerAuth")
  public async CreatePost(
    @Request() req: any,
    @Path() courseId: string,
    @Body() body: Omit<PostDTO, "id" | "userId">
  ): Promise<any> {
    const userId = req.user?.id;

    const createPost = await prisma.post.create({
      data: {
        title: body.title,
        content: body.content,
        userId: userId,
        courseId,
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

    this.setStatus(201);
    return {
      message: "Post created successfully",
      data: createPost,
    };
  }

  @Post("/create-reply/{postId}")
  @Security("bearerAuth")
  public async CreateReply(
    @Request() req: any,
    @Path() postId: string,
    @Body() body: Omit<ReplyDTO, "id" | "userId">
  ): Promise<any> {
    const userId = req.user?.id;

    try {
      const post = await prisma.post.findUnique({
        where: { id: postId },
      });

      if (!post) {
        this.setStatus(404);
        return { message: "Post not found" };
      }

      const createReply = await prisma.reply.create({
        data: {
          content: body.content,
          userId,
          postId: postId, // optional if replying to another reply
          parentId: body.parentId || null, // optional: set if it's a reply to a reply
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
          children: {
            // fetch nested replies if needed immediately
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
              _count: { select: { likes: true } },
            },
          },
        },
      });

      this.setStatus(201);
      return { message: "Reply created successfully", data: createReply };
    } catch (error: any) {
      this.setStatus(500);
      return { message: "Failed to create reply", error: error.message };
    }
  }

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
            user: { select: { id: true, first_name: true, last_name: true } },
          },
        },
        _count: { select: { likes: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    this.setStatus(200);
    return {
      message: "Replies fetched successfully",
      data: replies,
      count: replies.length,
    };
  }

  @Get("/get-post-with-replies/{postId}")
public async GetPostWithReplies(@Path() postId: string): Promise<any> {
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

  // Recursive function to fetch replies and their children
  async function fetchRepliesWithChildren(postId: string, parentId: string | null = null) {
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
            user: { select: { id: true, first_name: true, last_name: true } },
          },
        },
        _count: { select: { likes: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Recursively fetch children for each reply
    const repliesWithChildren = await Promise.all(
      replies.map(async (reply) => {
        const children = await fetchRepliesWithChildren(postId, reply.id);
        return { ...reply, children };
      })
    );

    return repliesWithChildren;
  }

  // Fetch all top-level replies and their nested children
  const repliesWithChildren = await fetchRepliesWithChildren(postId);

  this.setStatus(200);
  return {
    message: "Post with all replies fetched successfully",
    data: { ...post, replies: repliesWithChildren },
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
      const findPost = await prisma.post.findUnique({ where: { id: postId } });
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
    @Request() req: any
  ): Promise<any> {
    const userId = req.user?.id;

    try {
      const reply = await prisma.reply.findUnique({ where: { id: replyId } });
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
    @Request() req: any
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
    @Request() req: any
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
    @Query() repliedMessageId?: string
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
        message: "Must provide either postId or replyId or repliedMessageId",
      };
    } catch (error: any) {
      this.setStatus(500);
      return { message: "Failed to check like status", error: error.message };
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
    });

    this.setStatus(200);
    return {
      message: "All posts fetched successfully",
      data: posts,
      count: posts.length,
    };
  }

  @Security("bearerAuth")
  @Get("/get-post-by-course/{courseId}")
  public async GetPostByCourseId(@Path() courseId: string) {
    try {
      const course = await prisma.course.findMany({ where: { id: courseId } });
      if (!course) {
        this.setStatus(404);
        return { message: "Course not found" };
      }

      const getPost = await prisma.post.findMany({
        where: { courseId },
        include: {
          user: {
            select: { first_name: true, last_name: true, user_pic: true },
          },
          replies: {
            select: {
              content: true,
              user: {
                select: { first_name: true, last_name: true, user_pic: true },
              },
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
          _count: { select: { likes: true, replies: true } },
        },
      });

      this.setStatus(200);
      return { message: "Post fetched successfully", data: getPost };
    } catch (error) {
      console.error(error);
    }
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
    @Request() req: any
  ): Promise<any> {
    const userId = req.user?.id;

    try {
      const existingReply = await prisma.reply.findFirst({
        where: { id: replyId, userId },
      });
      if (!existingReply) {
        this.setStatus(404);
        return { message: "Reply not found or no permission to delete" };
      }

      await prisma.reply.delete({ where: { id: replyId } });
      this.setStatus(200);
      return { message: "Reply deleted successfully" };
    } catch (error: any) {
      this.setStatus(500);
      return { message: "Failed to delete reply", error: error.message };
    }
  }

  @Get("/post-likes/{postId}")
  public async GetPostLikes(@Path() postId: string): Promise<any> {
    try {
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
      });
      this.setStatus(200);
      return {
        message: "Post likes fetched successfully",
        data: { likes, likeCount: likes.length },
      };
    } catch (error: any) {
      this.setStatus(500);
      return { message: "Failed to fetch post likes", error: error.message };
    }
  }

  @Get("/reply-likes/{replyId}")
  public async GetReplyLikes(@Path() replyId: string): Promise<any> {
    try {
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
      });
      this.setStatus(200);
      return {
        message: "Reply likes fetched successfully",
        data: { likes, likeCount: likes.length },
      };
    } catch (error: any) {
      this.setStatus(500);
      return { message: "Failed to fetch reply likes", error: error.message };
    }
  }

  @Post("/create-group")
  public async CreateGroup(
    @Body()
    body: Omit<
      {
        group_title: string;
        group_short_description: string;
        group_description: string;
        group_image: string;
      },
      "id"
    >
  ): Promise<any> {
    try {
      const group = await prisma.group.create({ data: { ...body } });
      this.setStatus(201);
      return {
        message: "Group created successfully",
        group: group.group_title,
      };
    } catch (error) {
      this.setStatus(500);
      console.error(error.message);
    }
  }

  @Get("/get-group/{id}")
  public async GetGroupById(@Path() id: string): Promise<any> {
    try {
      const findGroup = await prisma.group.findUnique({ where: { id } });
      this.setStatus(200);
      return { message: "Success finding group", data: findGroup };
    } catch (error) {
      this.setStatus(500);
      console.error(error);
    }
  }

  @Get("/get-groups")
  public async GetGroup(): Promise<any> {
    try {
      const groups = await prisma.group.findMany({
        orderBy: { createdAt: "desc" },
      });
      this.setStatus(200);
      return {
        message: "Group fetched successfully",
        data: groups,
        length: groups.length,
      };
    } catch (error) {
      console.error(error);
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
    @Path() id: string
  ): Promise<any> {
    try {
      const updateGroup = await prisma.group.update({
        where: { id },
        data: { ...body },
      });
      this.setStatus(200);
      return {
        message: "Group updated successfully",
        data: updateGroup.group_title,
      };
    } catch (error) {
      console.error(error);
    }
  }

  @Delete("/delete-group/{id}")
  public async DeleteGroup(@Path() id: string): Promise<any> {
    try {
      await prisma.group.delete({ where: { id } });
      this.setStatus(200);
      return { message: "Group deleted successfully" };
    } catch (error) {
      console.error(error);
    }
  }

  @Post("/upload-group-image")
  public async UploadGroupImage(
    @Body()
    body: {
      group_id: string;
      file: string;
      fileName: string;
      mimeType: string;
    }
  ): Promise<any> {
    const buffer = Buffer.from(body.file, "base64");
    try {
      const uploaded = await MediaService.uploadGroupImage(
        body.group_id,
        buffer,
        body.fileName,
        body.mimeType
      );
      this.setStatus(201);
      return { message: "Image uploaded successfully", data: uploaded };
    } catch (error) {
      console.error(error);
    }
  }

  @Post("/create-event/{groupId}")
  public async CreateEvent(
    @Body() body: Omit<EventDTO, "id">,
    @Path() groupId: string
  ): Promise<any> {
    try {
      const createEvent = await prisma.event.create({
        data: {
          event_name: body.event_name,
          event_description: body.event_description,
          event_time: body.event_time,
          event_type: body.event_time,
          event_link: body.event_link,
          groupid: groupId,
        },
      });
      this.setStatus(201);
      return { message: "Event created successfully", data: createEvent };
    } catch (error) {
      console.error(error);
    }
  }

  @Get("/get-event")
  public async GetEvent(): Promise<any> {
    try {
      const event = await prisma.event.findMany({
        orderBy: { createdAt: "desc" },
      });
      this.setStatus(200);
      return {
        message: "event fetched successfully",
        data: event,
        count: event.length,
      };
    } catch (error) {
      console.error(error);
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
    }
  }

  @Put("/update-event/{id}")
  public async UpdateEvent(
    @Path() id: string,
    @Body() body: Omit<EventDTO, "id">
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
    }
  }
}
