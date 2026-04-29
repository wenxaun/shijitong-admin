import { Module } from '@nestjs/common';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { AiService } from '@/ai.service';
import { ConfigModule } from './config.module';

@Module({
  imports: [ConfigModule],
  controllers: [AppController],
  providers: [AppService, AiService],
})
export class AppModule {}
