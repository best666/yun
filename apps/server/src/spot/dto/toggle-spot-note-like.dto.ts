import { IsInt, Min } from 'class-validator';

export class ToggleSpotNoteLikeDto {
  @IsInt()
  @Min(1)
  noteId: number;
}
