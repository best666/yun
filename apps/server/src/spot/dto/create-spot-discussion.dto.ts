import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateSpotDiscussionDto {
  @IsInt()
  @Min(1)
  spotId: number;

  @IsString()
  @MinLength(2)
  @MaxLength(500)
  content: string;
}
