import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateSpotReviewReplyDto {
  @IsInt()
  @Min(1)
  reviewId: number;

  @IsString()
  @MinLength(2)
  @MaxLength(500)
  content: string;
}
