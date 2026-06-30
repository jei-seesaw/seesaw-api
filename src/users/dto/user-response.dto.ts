import type { User } from '../user.entity';

export interface UserResponseDto {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export function toUserResponse(user: User): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
  };
}
