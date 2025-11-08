// utils/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Bucket names
export const BUCKETS = {
  USER_AVATARS: 'user-avatars',
  COURSE_IMAGES: 'course-images', 
  LESSON_VIDEOS: 'lesson-videos',
  COURSE_MATERIALS: 'course-materials'
} as const;