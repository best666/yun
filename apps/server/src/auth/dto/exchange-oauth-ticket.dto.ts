import { IsJWT } from 'class-validator';

export class ExchangeOauthTicketDto {
  @IsJWT()
  ticket!: string;
}
