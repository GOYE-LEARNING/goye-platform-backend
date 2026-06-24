export interface User {
  id?: string;
  first_name: string;
  last_name: string;
  email_address: string;
  password: string;
  country: string;
  state: string;
  phone_number: string;
  language?: string;
  languageCode: string;
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
  lesson?: Lesson[];
}

export interface Lesson {
  lesson_title?: string;
  lesson_video?: string;
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
  id?: string;
  title: string;
  content: string;
}

export interface ReplyDTO {
  parentId?: string;
  content: string;
}

export interface Group {
  id: string;
  group_title: string;
  group_short_description: string;
  group_description: string;
  group_image?: string;
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

export interface OrganizationDTO {
  id: string;
  organization_name: string;
  organization_type: string;
  organization_email?: string;
  organization_phone_number: string;
  organization_country: string;
  organization_state: string;
  organization_description: string;
  organization_role: string;
  organization_year: string;
  language: string;
  languageCode: string;
  //User information
  user_first_name: string;
  user_last_name: string;
  user_email_address: string;
  user_country: string;
  user_state: string;
  user_role: string;
  user_phone_number: string;
  user_form_type: string;
  church?: Church;
  school?: School;
  club?: Club;
}
enum OrgType {
  CHURCH,
  SCHOOL,
  CLUB,
  OTHER,
}

export interface Church {
  church_ministry_name?: string;
  church_lead_pastor?: string;
  church_leadership_role?: string;
  church_email?: string;
  church_address?: string;
  church_weekly_service?: string;
  church_website?: string;
  church_logo?: string;
}

export interface School {
  school_name?: string;
  school_type?: string;
  school_address?: string;
  school_admin_name?: string;
  school_role?: string;
  school_website?: string;
  school_accreditation_number?: string;
  school_document?: string;
  school_email?: string;
}

export interface Club {
  club_name?: string;
  club_type?: string;
  club_leader_name?: string;
  club_meeting_frequency?: string;
  club_social_link?: string;
  club_parent_org?: string;
  club_description?: string;
  club_document?: string;
  club_role?: string;
}

export interface Recipitent {
  account_back: string;
  account_number: string;
  amount: string;
  currency: string;
  reference: string;
  narration: string;
}

export interface IFlutterwaveTransferPayload {
  account_bank: string;
  account_number: string;
  amount: number;
  currency: "NGN" | "USD" | "GHS" | "KES";
  narration: string;
  reference: string;
  callback_url?: string;
  debit_currency?: string;
}
