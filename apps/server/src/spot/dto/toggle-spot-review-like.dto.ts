import { IsInt, Min } from 'class-validator';

export class ToggleSpotReviewLikeDto {
  @IsInt()
  @Min(1)
  reviewId: number;
}
