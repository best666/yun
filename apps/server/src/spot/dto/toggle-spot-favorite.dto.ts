import { IsInt, Min } from 'class-validator';

export class ToggleSpotFavoriteDto {
  @IsInt()
  @Min(1)
  spotId: number;
}
