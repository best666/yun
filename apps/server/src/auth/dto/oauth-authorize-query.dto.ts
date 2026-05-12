import { IsString, MinLength } from 'class-validator';

export class OauthAuthorizeQueryDto {
  @IsString()
  @MinLength(1)
  origin!: string;
}
