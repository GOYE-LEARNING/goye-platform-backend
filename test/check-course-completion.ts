// test/check-course-completion.ts
import prisma from "../src/db";

async function checkCourseCompletion() {
  const userId = "cmp4lrdfx000a2a63klpnlly6";
  const courseId = "cmpn1iqft00002acmbhbo1sv0";
  
  console.log("🎯 COURSE COMPLETION CHECKER\n");
  console.log("═".repeat(50));
  console.log(`📚 Course ID: ${courseId}`);
  console.log(`👤 User ID: ${userId}`);
  console.log("═".repeat(50) + "\n");

  try {
    // Get course details
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { 
        course_title: true,
        course_level: true,
        createdBy: true
      }
    });

    if (!course) {
      console.log("❌ Course not found!");
      return;
    }

    console.log(`📖 Course: ${course.course_title}`);
    console.log(`⭐ Level: ${course.course_level}`);
    console.log(`👨‍🏫 Instructor: ${course.createdBy}`);
    console.log("\n" + "─".repeat(50) + "\n");

    // Get enrollment status
    const enrollment = await prisma.enrollment.findFirst({
      where: { userId, courseId },
      select: { 
        status: true, 
        completedAt: true,
        startedAt: true,
        score: true
      }
    });

    if (!enrollment) {
      console.log("❌ You are not enrolled in this course!");
      return;
    }

    // Display enrollment status with emoji
    console.log("📊 ENROLLMENT STATUS");
    console.log("─".repeat(30));
    const statusIcon = enrollment.status === "COMPLETED" ? "✅" : "🟡";
    console.log(`${statusIcon} Status: ${enrollment.status}`);
    console.log(`📅 Started: ${enrollment.startedAt?.toLocaleDateString() || "N/A"}`);
    if (enrollment.completedAt) {
      console.log(`🏆 Completed: ${enrollment.completedAt.toLocaleDateString()}`);
    }
    console.log(`📈 Score: ${enrollment.score || 0} points`);
    console.log("");

    // Get all modules and lessons
    const modules = await prisma.module.findMany({
      where: { courseId },
      include: {
        lesson: {
          orderBy: { order: "asc" },
          select: { id: true, lesson_title: true, duration: true }
        }
      },
      orderBy: { order: "asc" }
    });

    const allLessons = modules.flatMap(m => m.lesson);
    const totalLessons = allLessons.length;

    // Get completed lessons
    const completedLessons = await prisma.progress.findMany({
      where: {
        userId,
        lessonId: { in: allLessons.map(l => l.id) },
        progressBar: { gte: 100 }
      },
      select: { lessonId: true, progressBar: true, updatedAt: true }
    });

    const completedLessonIds = new Set(completedLessons.map(l => l.lessonId));
    const completedCount = completedLessons.length;

    // Calculate lesson progress percentage
    const lessonProgressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    console.log("📹 LESSON PROGRESS");
    console.log("─".repeat(30));
    console.log(`📊 Progress: ${completedCount}/${totalLessons} lessons (${lessonProgressPercent}%)`);
    
    // Create progress bar
    const barLength = 20;
    const filledLength = Math.round((lessonProgressPercent / 100) * barLength);
    const emptyLength = barLength - filledLength;
    const progressBar = "█".repeat(filledLength) + "░".repeat(emptyLength);
    console.log(`[${progressBar}] ${lessonProgressPercent}%`);
    console.log("");

    // Show lesson details
    if (totalLessons > 0) {
      console.log("📋 LESSON DETAILS:");
      for (const module of modules) {
        console.log(`\n  📁 ${module.module_title}`);
        for (const lesson of module.lesson) {
          const isCompleted = completedLessonIds.has(lesson.id);
          const icon = isCompleted ? "✅" : "⭕";
          const duration = lesson.duration ? `${Math.floor(lesson.duration / 60)}:${(lesson.duration % 60).toString().padStart(2, '0')}` : "N/A";
          console.log(`     ${icon} ${lesson.lesson_title} (${duration})`);
        }
      }
      console.log("");
    }

    // Get all quizzes
    const quizzes = await prisma.quiz.findMany({
      where: { courseId },
      include: {
        questions: true,
        QuizAttempt: {
          where: { userId, completed: true },
          select: { score: true, completedAt: true }
        }
      }
    });

    const totalQuizzes = quizzes.length;
    const completedQuizzes = quizzes.filter(q => q.QuizAttempt.length > 0);
    const completedQuizzesCount = completedQuizzes.length;

    // Calculate quiz progress percentage
    const quizProgressPercent = totalQuizzes > 0 ? Math.round((completedQuizzesCount / totalQuizzes) * 100) : 100;

    console.log("📝 QUIZ PROGRESS");
    console.log("─".repeat(30));
    if (totalQuizzes > 0) {
      console.log(`📊 Progress: ${completedQuizzesCount}/${totalQuizzes} quizzes (${quizProgressPercent}%)`);
      
      // Create progress bar
      const quizFilledLength = Math.round((quizProgressPercent / 100) * barLength);
      const quizEmptyLength = barLength - quizFilledLength;
      const quizProgressBar = "█".repeat(quizFilledLength) + "░".repeat(quizEmptyLength);
      console.log(`[${quizProgressBar}] ${quizProgressPercent}%`);
      console.log("");
      
      // Show quiz details
      console.log("📋 QUIZ DETAILS:");
      for (const quiz of quizzes as any) {
        const passed = quiz.QuizAttempt.length > 0;
        const score = quiz.QuizAttempt[0]?.score || 0;
        const icon = passed ? (score >= quiz.passingScore ? "✅" : "⚠️") : "⭕";
        const scoreText = passed ? `${Math.round(score)}%` : "Not taken";
        const passingText = `(Pass: ${quiz.passingScore}%)`;
        console.log(`   ${icon} ${quiz.title} - ${scoreText} ${passingText}`);
      }
      console.log("");
    } else {
      console.log("   No quizzes in this course");
      console.log("");
    }

    // Determine if course is fully completed
    const allLessonsCompleted = completedCount === totalLessons;
    const allQuizzesCompleted = totalQuizzes === 0 || completedQuizzesCount === totalQuizzes;
    const isFullyCompleted = allLessonsCompleted && allQuizzesCompleted;
    const isMarkedCompleted = enrollment.status === "COMPLETED";

    console.log("🎯 COMPLETION STATUS");
    console.log("─".repeat(30));
    console.log(`${allLessonsCompleted ? "✅" : "❌"} All lessons completed: ${completedCount}/${totalLessons}`);
    console.log(`${allQuizzesCompleted ? "✅" : "❌"} All quizzes completed: ${completedQuizzesCount}/${totalQuizzes}`);
    console.log(`${isFullyCompleted ? "✅" : "❌"} Course requirements met: ${isFullyCompleted ? "YES" : "NO"}`);
    console.log(`${isMarkedCompleted ? "✅" : "❌"} Course marked as COMPLETED: ${isMarkedCompleted ? "YES" : "NO"}`);
    console.log("");

    // Show overall completion
    const totalItems = totalLessons + totalQuizzes;
    const completedItems = completedCount + completedQuizzesCount;
    const overallPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    
    console.log("📊 OVERALL PROGRESS");
    console.log("─".repeat(30));
    const overallFilledLength = Math.round((overallPercent / 100) * barLength);
    const overallEmptyLength = barLength - overallFilledLength;
    const overallProgressBar = "█".repeat(overallFilledLength) + "░".repeat(overallEmptyLength);
    console.log(`[${overallProgressBar}] ${overallPercent}%`);
    console.log(`📊 ${completedItems}/${totalItems} items completed`);
    console.log("");

    // Final verdict
    console.log("🏆 FINAL VERDICT");
    console.log("═".repeat(50));
    
    if (isMarkedCompleted) {
      console.log("🎉 CONGRATULATIONS! You have COMPLETED this course! 🎉");
      console.log(`📅 Completed on: ${enrollment.completedAt?.toLocaleDateString()}`);
      console.log(`📈 Final Score: ${enrollment.score} points`);
    } else if (isFullyCompleted) {
      console.log("⚠️ You have completed all requirements but the course is not marked as COMPLETED!");
      console.log("   Run the cleanup script to fix this: npm run fix-completion");
    } else {
      console.log("📌 You haven't completed this course yet.");
      console.log("\n📋 What's left:");
      if (!allLessonsCompleted) {
        const remaining = totalLessons - completedCount;
        console.log(`   📹 ${remaining} lesson(s) remaining`);
      }
      if (!allQuizzesCompleted && totalQuizzes > 0) {
        const remaining = totalQuizzes - completedQuizzesCount;
        console.log(`   📝 ${remaining} quiz(zes) remaining`);
      }
    }
    
    console.log("\n" + "═".repeat(50));
    
  } catch (error) {
    console.error("❌ Error checking course completion:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkCourseCompletion();