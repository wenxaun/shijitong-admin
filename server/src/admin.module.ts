import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ConfigService } from './config.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, ConfigService],
})
export class AdminModule {}
