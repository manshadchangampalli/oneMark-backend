export class CreateSessionDto {
  mode: 'quick' | 'mock' | 'drill' | 'custom';
  examId?: string;
  subjectId?: string;
  topicId?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  questionCount?: number;
  timeLimitSec?: number;
}
