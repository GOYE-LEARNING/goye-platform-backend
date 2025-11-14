export interface UpdateCourseWithRelationsDTO {
  course_title?: string;
  course_short_description?: string;
  course_description?: string;
  course_level?: string;
  course_image?: string;

  modules?: {
    id?: string;
    module_title?: string;
    module_description?: string;
    module_duration?: string;
    lessons?: {
      id?: string;
      lesson_title?: string;
      lesson_video?: string;
    }[];
  }[];

  materials?: {
    id?: string;
    material_title?: string;
    material_description?: string;
    material_pages?: number;
    material_document?: string;
  }[];

  objectives?: {
    id?: string;
    objective_title1?: string;
    objective_title2?: string;
    objective_title3?: string;
    objective_title4?: string;
    objective_title5?: string;
  }[];

  quiz?: {
    id?: string;
    quiz_title?: string;
    quiz_description?: string;
    quiz_duration?: number;
    quiz_score?: number;
    questions?: {
      id?: string;
      question_name?: string;
    }[];
  }[];
}

// DTO Interfaces
export interface CreateCourseDTO {
  course_title: string;
  course_short_description: string;
  course_description: string;
  course_level: string;
  course_image: string;
  module?: CreateModuleDTO[];
  material?: CreateMaterialDTO[];
  objectives?: CreateObjectivesDTO[];
  quiz?: CreateQuizDTO[];
}

export interface CreateModuleDTO {
  module_title: string;
  module_description: string;
  module_duration: string;
  order?: number;
  lessons?: CreateLessonDTO[];
}

export interface CreateLessonDTO {
  lesson_title: string;
  lesson_video: string;
  order?: number;
  duration?: number;
}

export interface CreateMaterialDTO {
  material_title: string;
  material_description: string;
  material_pages: number;
  material_document: string;
}

export interface CreateObjectivesDTO {
  objective_title1: string;
  objective_title2: string;
  objective_title3: string;
  objective_title4: string;
  objective_title5: string;
}

export interface CreateQuizDTO {
  title: string;
  description?: string;
  duration?: number;
  passingScore?: number;
  maxAttempts?: number;
  questions: CreateQuestionDTO[];
}

export interface CreateQuestionDTO {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  points?: number;
  order?: number;
}

export interface CourseResponse {
  message: string;
  data: any;
}

// Update DTOs
export interface UpdateCourseDTO {
  course_title?: string;
  course_short_description?: string;
  course_description?: string;
  course_level?: string;
  course_image?: string;
  module?: UpdateModuleDTO[];
  material?: UpdateMaterialDTO[];
  objectives?: UpdateObjectivesDTO[];
  quiz?: UpdateQuizDTO[];
}

export interface UpdateModuleDTO {
  id?: string;
  module_title?: string;
  module_description?: string;
  module_duration?: string;
  order?: number;
  lessons?: UpdateLessonDTO[];
}

export interface UpdateLessonDTO {
  id?: string;
  lesson_title?: string;
  lesson_video?: string;
  order?: number;
  duration?: number;
}

export interface UpdateMaterialDTO {
  id?: string;
  material_title?: string;
  material_description?: string;
  material_pages?: number;
  material_document?: string;
}

export interface UpdateObjectivesDTO {
  id?: string;
  objective_title1?: string;
  objective_title2?: string;
  objective_title3?: string;
  objective_title4?: string;
  objective_title5?: string;
}

export interface UpdateQuizDTO {
  id?: string;
  title?: string;
  description?: string;
  duration?: number;
  passingScore?: number;
  maxAttempts?: number;
  questions?: UpdateQuestionDTO[];
}

export interface UpdateQuestionDTO {
  id?: string;
  question?: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  points?: number;
  order?: number;
}