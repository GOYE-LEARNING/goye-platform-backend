// test/cleanup-duplicates.ts
import prisma from "../src/db.ts";

async function cleanupDuplicates() {
  const userId = "cmp4lrdfx000a2a63klpnlly6";
  const courseId = "cmp4lpset00032a636evecxhb";
  
  console.log("🧹 Cleaning up duplicate records...\n");
  
  try {
    // 1. Check and clean duplicate lesson progress
    console.log("1️⃣ Checking lesson progress duplicates:");
    const lessons = await prisma.lesson.findMany({
      where: { module: { courseId } },
      select: { id: true, lesson_title: true }
    });
    
    for (const lesson of lessons) {
      const duplicates = await prisma.progress.findMany({
        where: {
          userId,
          lessonId: lesson.id,
          progressBar: { gte: 100 }
        },
        orderBy: { updatedAt: 'desc' }
      });
      
      if (duplicates.length > 1) {
        console.log(`   Found ${duplicates.length} records for lesson: ${lesson.lesson_title}`);
        // Keep only the latest, delete the rest
        const [keep, ...toDelete] = duplicates;
        await prisma.progress.deleteMany({
          where: { id: { in: toDelete.map(d => d.id) } }
        });
        console.log(`   ✅ Kept latest, deleted ${toDelete.length} duplicate(s)`);
      } else if (duplicates.length === 1) {
        console.log(`   ✅ Lesson "${lesson.lesson_title}" has 1 record (good)`);
      } else {
        console.log(`   ⚠️ No progress record for lesson: ${lesson.lesson_title}`);
      }
    }
    
    // 2. Check and clean duplicate quiz attempts
    console.log("\n2️⃣ Checking quiz attempt duplicates:");
    const quizzes = await prisma.quiz.findMany({
      where: { courseId },
      select: { id: true, title: true }
    });
    
    for (const quiz of quizzes) {
      const duplicates = await prisma.quizAttempt.findMany({
        where: {
          userId,
          courseId,
          quizId: quiz.id,
          completed: true
        },
        orderBy: { completedAt: 'desc' }
      });
      
      if (duplicates.length > 1) {
        console.log(`   Found ${duplicates.length} attempts for quiz: ${quiz.title}`);
        // Keep only the latest, delete the rest
        const [keep, ...toDelete] = duplicates;
        await prisma.quizAttempt.deleteMany({
          where: { id: { in: toDelete.map(d => d.id) } }
        });
        console.log(`   ✅ Kept latest, deleted ${toDelete.length} duplicate(s)`);
      } else if (duplicates.length === 1) {
        console.log(`   ✅ Quiz "${quiz.title}" has 1 attempt (good)`);
      } else {
        console.log(`   ⚠️ No attempts for quiz: ${quiz.title}`);
      }
    }
    
    // 3. Verify the counts after cleanup
    console.log("\n3️⃣ Verifying after cleanup:");
    
    const totalLessonsCount = await prisma.lesson.count({
      where: { module: { courseId } }
    });
    
    const completedLessonsCount = await prisma.progress.count({
      where: {
        userId,
        lessonId: { in: (await prisma.lesson.findMany({
          where: { module: { courseId } },
          select: { id: true }
        })).map(l => l.id) },
        progressBar: { gte: 100 }
      }
    });
    
    const totalQuizzesCount = await prisma.quiz.count({
      where: { courseId }
    });
    
    const completedQuizzesCount = await prisma.quizAttempt.count({
      where: {
        userId,
        courseId,
        completed: true
      }
    });
    
    console.log(`   📚 Lessons: ${completedLessonsCount}/${totalLessonsCount} completed`);
    console.log(`   📝 Quizzes: ${completedQuizzesCount}/${totalQuizzesCount} completed`);
    
    // 4. Mark course as completed if all requirements are met
    if (completedLessonsCount === totalLessonsCount && completedQuizzesCount === totalQuizzesCount) {
      console.log("\n4️⃣ Marking course as COMPLETED...");
      
      const enrollment = await prisma.enrollment.findFirst({
        where: { userId, courseId }
      });
      
      if (enrollment && enrollment.status !== "COMPLETED") {
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            status: "COMPLETED",
            completedAt: new Date()
          }
        });
        console.log("   ✅ Course marked as COMPLETED!");
      } else {
        console.log("   ✅ Course already marked as COMPLETED");
      }
    } else {
      console.log("\n⚠️ Still missing requirements:");
      if (completedLessonsCount !== totalLessonsCount) {
        console.log(`   Need ${totalLessonsCount - completedLessonsCount} more lesson(s)`);
      }
      if (completedQuizzesCount !== totalQuizzesCount) {
        console.log(`   Need ${totalQuizzesCount - completedQuizzesCount} more quiz(zes)`);
      }
    }
    
    console.log("\n✨ Cleanup completed!");
    
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDuplicates();