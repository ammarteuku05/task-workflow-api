import { TaskEventRepository } from '../../infrastructure/repositories/task-event-repository';
import { TaskEvent } from '../../domain/types';

export interface GetEventsQuery {
  execute(limit?: number): Promise<TaskEvent[]>;
}

export class GetEventsQueryHandler implements GetEventsQuery {
  constructor(private eventRepo: TaskEventRepository) {}

  async execute(limit: number = 50): Promise<TaskEvent[]> {
    return this.eventRepo.findAll(limit);
  }
}
