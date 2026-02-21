import { TaskRepository, TaskFilters, PaginatedTasks } from '../../infrastructure/repositories/task-repository';
import { logger } from '../../infrastructure/logging/logger';

export interface ListTasksQuery {
  execute(
    tenantId: string,
    workspaceId: string,
    filters: TaskFilters
  ): Promise<PaginatedTasks>;
}

export class ListTasksQueryHandler implements ListTasksQuery {
  constructor(private taskRepo: TaskRepository) { }

  async execute(
    tenantId: string,
    workspaceId: string,
    filters: TaskFilters
  ): Promise<PaginatedTasks> {
    logger.debug('Executing ListTasksQuery', 'ListTasksQueryHandler', undefined, { tenantId, workspaceId, filters });
    return this.taskRepo.findByFilters(tenantId, workspaceId, filters);
  }
}
