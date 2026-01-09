export type Course = {
  courseId: string;
  courseName: string;
  facultyId: string;
  facultyName?: string;
  courseType: number;
  feedbackFilled?: number;   // ⭐ REQUIRED
  status: number;
};

export type OptionDTO = {
  optionId: number;
  pointScore?: number;
  description: string;
  active?: number;
  optionChoosen?: number;
};

export type QuestionDTO = {
  questionId: number;
  questionDesc: string;
  optionDTOList: OptionDTO[];
  mandatory?: number;
};

export type SectionDTO = {
  sectionId: number;
  sectionName: string;
  questionList: QuestionDTO[];
};

export type SetDTO = {
  instId?: number;
  setId?: number;
  setTitile?: string;
  setDescription?: string;
  active?: number;
  sectionDTOList: SectionDTO[];
};

export type FeedbackResponse = {
  setDTO: SetDTO;
};
