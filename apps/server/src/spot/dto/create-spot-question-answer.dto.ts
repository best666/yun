import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateSpotQuestionAnswerDto {
  @IsInt()
  @Min(1)
  questionId: number;

  @IsString()
  @MinLength(2)
  @MaxLength(500)
  content: string;
}
