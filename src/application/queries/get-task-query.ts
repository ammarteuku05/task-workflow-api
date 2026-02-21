import { TaskRepository } from '../../infrastructure/repositories/task-repository';
import { TaskEventRepository } from '../../infrastructure/repositories/task-event-repository';
import { Task, TaskEvent } from '../../domain/types';
import { logger } from '../../infrastructure/logging/logger';

export interface TaskWithTimeline {
  task: Task;
  timeline: TaskEvent[];
}

export interface GetTaskQuery {
  execute(tenantId: string, workspaceId: string, taskId: string): Promise<TaskWithTimeline>;
}

export class GetTaskQueryHandler implements GetTaskQuery {
  constructor(
    private taskRepo: TaskRepository,
    private eventRepo: TaskEventRepository
  ) { }

  async execute(tenantId: string, workspaceId: string, taskId: string): Promise<TaskWithTimeline> {
    logger.debug('Executing GetTaskQuery', 'GetTaskQueryHandler', undefined, { tenantId, workspaceId, taskId });
    const task = await this.taskRepo.findById(taskId, tenantId, workspaceId);
    if (!task) {
      const error = new Error('Task not found');
      logger.warn(error.message, 'GetTaskQueryHandler', undefined, { taskId });
      throw error;
    }

    const timeline = await this.eventRepo.findByTaskId(taskId, 20);

    return {
      task,
      timeline
    };
  }
}
