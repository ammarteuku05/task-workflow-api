import { TaskEventRepository } from '../../infrastructure/repositories/task-event-repository';
import { TaskEvent } from '../../domain/types';

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
