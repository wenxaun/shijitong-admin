import { Module } from '@nestjs/common';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { AiService } from '@/ai.service';
import { ConfigService } from './config.service';
import { ConfigModule } from './config.module';
import { AdminModule } from './admin.module';

@Module({
  imports: [ConfigModule, AdminModule],
  controllers: [AppController],
  providers: [AppService, AiService, ConfigService],
})
export class AppModule {}
