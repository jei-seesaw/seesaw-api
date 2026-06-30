import { Injectable } from '@nestjs/common';
import {
  NicknameAvailabilityResponseDto,
} from './dto/nickname-availability.dto';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UsersRepository) {}

  async checkNicknameAvailability(
    nickname: string,
  ): Promise<NicknameAvailabilityResponseDto> {
    const exists = await this.userRepository.existsByNickname(nickname);

    return { available: !exists };
  }
}
