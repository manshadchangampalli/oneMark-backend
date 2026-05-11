export class SubmitAttemptDto {
  questionId: string;
  selectedOptionId?: string; // omit or null to skip
  timeSeconds: number;
}
