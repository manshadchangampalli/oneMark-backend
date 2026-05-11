export class DailyAttemptDto {
  examId?: string;         // defaults to primary exam
  selectedOptionId?: string; // omit or null to skip
  timeSeconds: number;
}
