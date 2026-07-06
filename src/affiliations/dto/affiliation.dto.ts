import { ApiProperty } from '@nestjs/swagger';

export class AffiliationResponseDto {
  @ApiProperty({
    description: '소속 코드',
    example: 'education',
  })
  code!: string;

  @ApiProperty({
    description: '소속 이름',
    example: '재능교육',
  })
  name!: string;
}
