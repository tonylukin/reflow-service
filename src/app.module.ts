import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ReflowService } from './reflow/reflow.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [ReflowService],
})
export class AppModule {}
