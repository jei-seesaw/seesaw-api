import { ApiProperty } from '@nestjs/swagger';

export class AffiliationResponseDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;
}
