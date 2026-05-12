import { IsArray, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

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

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  locationName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  locationAddress?: string;
}
