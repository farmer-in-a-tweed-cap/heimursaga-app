import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { Logger } from '@/modules/logger';
import { PrismaService } from '@/modules/prisma';

import { EVENTS } from './event.enum';
import { IEventMessage } from './event.interface';

export interface IEvent<T = any> {
  event: string | keyof typeof EVENTS;
  data: T;
}

@Injectable()
export class EventService implements OnModuleInit {
  constructor(
    private logger: Logger,
    private eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    this.eventEmitter.setMaxListeners(50);
  }

  async trigger<T = any>(message: IEventMessage<T>) {
    try {
      const { event, data } = message;

      // trigger
      this.eventEmitter.emit(event, data);

      // log
      // console.log(JSON.stringify({ event, data }, null, 2));
    } catch (e) {
      this.logger.error(e);
    }
  }
}
