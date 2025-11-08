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
