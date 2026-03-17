import { Global, Module } from '@nestjs/common';
import { PostHogService } from './posthog.service';
import { PostHogListener } from './posthog.listener';

@Global()
@Module({
  providers: [PostHogService, PostHogListener],
  exports: [PostHogService],
})
export class PostHogModule {}
