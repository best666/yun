import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateSpotNoteDto {
  @IsInt()
  @Min(1)
  spotId: number;

  @IsString()
  @MinLength(2)
  @MaxLength(40)
  title: string;

  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  content: string;
}
