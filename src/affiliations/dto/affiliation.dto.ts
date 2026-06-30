import { ApiProperty } from '@nestjs/swagger';

export class AffiliationResponseDto {
  @ApiProperty({
    description: '소속 코드',
    example: 'teacher',
  })
  code!: string;

  @ApiProperty({
    description: '소속 이름',
    example: '선생님',
  })
  name!: string;
}
