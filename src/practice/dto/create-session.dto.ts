export class CreateSessionDto {
  mode: 'quick' | 'mock' | 'drill' | 'custom' | 'bookmark';
  /** Optional tag filter — questions must contain ALL of these tags.
   *  Use prefixed conventions: ['stage:prelims'], ['stage:mains', 'year:2024'] */
  tags?: string[];
  examId?: string;
  subjectId?: string;
  topicId?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  questionCount?: number;
  timeLimitSec?: number;
}
