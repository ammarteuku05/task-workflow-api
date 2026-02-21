import { TaskEventRepository } from '../../infrastructure/repositories/task-event-repository';
import { TaskEvent } from '../../domain/types';
import { logger } from '../../infrastructure/logging/logger';

export interface PaginatedEvents {
  events: TaskEvent[];
  total: number;
  limit: number;
  offset: number;
}

export interface GetEventsQuery {
  execute(limit?: number, offset?: number): Promise<PaginatedEvents>;
}

export class GetEventsQueryHandler implements GetEventsQuery {
  constructor(private eventRepo: TaskEventRepository) { }

  async execute(limit: number = 50, offset: number = 0): Promise<PaginatedEvents> {
    logger.debug('Executing GetEventsQuery', 'GetEventsQueryHandler', undefined, { limit, offset });
    const events = await this.eventRepo.findAll(limit, offset);
    const total = await this.eventRepo.countAll();

    return {
      events,
      total,
      limit,
      offset
    };
  }
}
