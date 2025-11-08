export interface User {
  id?: string;
  first_name: string;
  last_name: string;
  email_address: string;
  password: string;
  country: string;
  state: string;
  phone_number: string;
  role: string;
  level: string;
  createAt?: any;
  updatedAt?: any;
}

export interface Course {
  id: string;
  course_title: string;
  course_short_description: string;
  course_description: string;
  course_level: string;
  course_image: string;
  module?: Module[];
  material?: Material[];
  quiz?: CreateQuizDTO[];
  objectives?: Objectives[];
}

export interface Module {
  id?: string;
  module_title?: string;
  module_description?: string;
  module_duration?: string;
  courseId?: string;
  lesson?: Lesson[];
}

export interface Lesson {
  id?: string;
  lesson_title?: string;
  lesson_video?: string;
  moduleId?: string;
}

export interface Material {
  id: string;
  material_title: string;
  material_description: string;
  material_pages: number;
  material_document: string;
  courseId: string;
}

export interface CreateQuizDTO {
  title: string;
  description?: string;
  courseId: string;
  duration?: number;
  passingScore?: number;
  maxAttempts?: number;
  questions: CreateQuestionDTO[];
}

export interface CreateQuestionDTO {
  question: string;
  options: string[]; // For multiple_choice: ["Option A", "Option B", "Option C"]
  correctAnswer: string;
  explanation?: string;
  points?: number;
  order: number;
}

export interface SubmitQuizDTO {
  quizId: string;
  answers: {
    [questionId: string]: string; // { "ques123": "A", "ques456": "Paris" }
  };
}

export interface Question {
  id: string;
  question_name: string;
  QuizId: string;
  Quiz?: CreateQuizDTO;
}

export interface Objectives {
  id: string;
  objective_title1: string;
  objective_title2: string;
  objective_title3: string;
  objective_title4: string;
  objective_title5: string;
  courseId: string;
}

export interface SignupResponse {
  message: string;
  data: any;
  token?: any;
}

export interface CourseResponse {
  message: string;
  data: any;
}

export interface PostDTO {
  postId: string;
  title: string;
  content: string;
}

export interface ReplyDTO {
  Id: string;
  content: string;
  postId: string;
}

export interface EventDTO {
  id: string;
  event_name?: string;
  event_description?: string;
  event_time?: string;
  event_date?: string;
  event_type?: string;
  event_link?: string;
}
