// test/fix-duplicates.ts
import prisma from "../src/db";

async function fixDuplicates() {
  const userId = "cmp4lrdfx000a2a63klpnlly6";
  const courseId = "cmpn05vgd000d1s8qpsk8l7jm";
  
  console.log("🔧 FIXING DUPLICATE RECORDS\n");
  console.log("═".repeat(50));
  
  try {
    // Get all lessons in the course
    const lessons = await prisma.lesson.findMany({
      where: { module: { courseId } },
      select: { id: true, lesson_title: true }
    });
    
    console.log(`\n📹 Found ${lessons.length} lessons in this course`);
    let duplicatesFixed = 0;
    
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
        console.log(`\n⚠️ Lesson "${lesson.lesson_title}" has ${duplicates.length} completion records`);
        // Keep only the latest, delete the rest
        const [keep, ...toDelete] = duplicates;
        const result = await prisma.progress.deleteMany({
          where: { id: { in: toDelete.map(d => d.id) } }
        });
        console.log(`✅ Kept 1 record, deleted ${result.count} duplicate(s)`);
        duplicatesFixed += result.count;
      }
    }
    
    // Check quizzes for duplicates
    const quizzes = await prisma.quiz.findMany({
      where: { courseId },
      select: { id: true, title: true }
    });
    
    console.log(`\n📝 Found ${quizzes.length} quizzes in this course`);
    
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
        console.log(`\n⚠️ Quiz "${quiz.title}" has ${duplicates.length} attempts`);
        // Keep only the latest, delete the rest
        const [keep, ...toDelete] = duplicates;
        const result = await prisma.quizAttempt.deleteMany({
          where: { id: { in: toDelete.map(d => d.id) } }
        });
        console.log(`✅ Kept 1 attempt, deleted ${result.count} duplicate(s)`);
        duplicatesFixed += result.count;
      }
    }
    
    if (duplicatesFixed === 0) {
      console.log("\n✨ No duplicates found! Everything is clean.");
    } else {
      console.log(`\n✨ Successfully fixed ${duplicatesFixed} duplicate record(s)!`);
      console.log("\n💡 Now run the completion checker again:");
      console.log("   npx ts-node test/check-course-completion.ts");
    }
    
  } catch (error) {
    console.error("❌ Error fixing duplicates:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDuplicates();