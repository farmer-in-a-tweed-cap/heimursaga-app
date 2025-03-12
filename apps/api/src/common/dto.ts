import { IsNotEmpty, IsNumber } from 'class-validator';

import { ToNumber } from './decorators';

export class ParamNumberIdDto {
  @ToNumber()
  @IsNumber()
  @IsNotEmpty()
  id: number;
}
