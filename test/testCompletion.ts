// Test script
async function testCompletion() {
  const userId = "your-user-id";
  const courseId = "your-course-id";
  const token = ""
  // Check current state
  const state = await fetch(`/api/course/debug-course-state/${courseId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const debug = await state.json();
  console.log("Course State:", debug);
  
  if (debug.data.shouldBeCompleted.bothDone) {
    console.log("✅ Course should be completed!");
    console.log(`Enrollment status: ${debug.data.enrollmentStatus}`);
  } else {
    console.log("❌ Missing requirements:");
    if (!debug.data.shouldBeCompleted.allLessonsDone) {
      console.log("   - Missing lessons:", debug.data.courseCompletion.missingLessons);
    }
    if (!debug.data.shouldBeCompleted.allQuizzesDone) {
      console.log("   - Missing quizzes:", debug.data.quizCompletion.missingQuizzes);
    }
  }
}