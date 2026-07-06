import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ImageUploadsController } from './image-uploads.controller';
import { ImageUploadsService } from './image-uploads.service';

@Module({
  imports: [AuthModule],
  controllers: [ImageUploadsController],
  providers: [ImageUploadsService],
})
export class ImageUploadsModule {}
