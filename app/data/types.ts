// Shared types for the interview syllabus data.
// Each question now carries a detailed `answer` (markdown-ish: prose + ```fenced``` code/diagram blocks).

export interface QA {
  q: string;
  answer: string;
}

export interface Topic {
  title: string;
  subtopics: string[];
  questions: QA[];
  tip: string;
  rajnishAngle: string;
}

export interface Week {
  week: number;
  theme: string;
  color: string;
  topics: Topic[];
}
