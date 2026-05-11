import { IsInt, Min } from 'class-validator';

export class ToggleSpotDiscussionLikeDto {
  @IsInt()
  @Min(1)
  discussionId: number;
}
