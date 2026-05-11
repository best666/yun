import { IsMobilePhone, Length, Matches } from 'class-validator';

export class SmsLoginDto {
  @IsMobilePhone('zh-CN')
  phone!: string;

  @Length(4, 6)
  @Matches(/^\d+$/)
  code!: string;
}
