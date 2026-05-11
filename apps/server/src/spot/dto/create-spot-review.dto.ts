import { IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateSpotReviewDto {
  @IsInt()
  spotId: number;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @MinLength(2)
  @MaxLength(500)
  content: string;
}
