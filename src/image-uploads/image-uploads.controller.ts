import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateImageUploadRequestDto,
  CreateImageUploadResponseDto,
} from './dto/create-image-upload.dto';
import { ImageUploadsService } from './image-uploads.service';
import {
  ApiCreateImageUpload,
  ApiImageUploadsController,
} from './image-uploads.swagger';

@ApiImageUploadsController()
@Controller('image-uploads')
export class ImageUploadsController {
  constructor(private readonly imageUploads: ImageUploadsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiCreateImageUpload()
  create(
    @Body() dto: CreateImageUploadRequestDto,
  ): CreateImageUploadResponseDto {
    return this.imageUploads.createUploadSignature(dto);
  }
}
