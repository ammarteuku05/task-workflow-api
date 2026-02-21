import { TaskRepository, TaskFilters, PaginatedTasks } from '../../infrastructure/repositories/task-repository';

export interface ListTasksQuery {
  execute(
    tenantId: string,
    workspaceId: string,
    filters: TaskFilters
  ): Promise<PaginatedTasks>;
}

export class ListTasksQueryHandler implements ListTasksQuery {
  constructor(private taskRepo: TaskRepository) {}

  async execute(
    tenantId: string,
    workspaceId: string,
    filters: TaskFilters
  ): Promise<PaginatedTasks> {
    return this.taskRepo.findByFilters(tenantId, workspaceId, filters);
  }
}
