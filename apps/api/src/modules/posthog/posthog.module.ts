import { Global, Module } from '@nestjs/common';

import { PostHogListener } from './posthog.listener';
import { PostHogService } from './posthog.service';

@Global()
@Module({
  providers: [PostHogService, PostHogListener],
  exports: [PostHogService],
})
export class PostHogModule {}
