import { TaskRepository } from '../../infrastructure/repositories/task-repository';
import { TaskEventRepository } from '../../infrastructure/repositories/task-event-repository';
import { Task, TaskEventType, Role } from '../../domain/types';
import { StateMachine } from '../../domain/state-machine';
import Database from 'better-sqlite3';
import { logger } from '../../infrastructure/logging/logger';

export interface AssignTaskRequest {
  assignee_id: string;
}

export interface AssignTaskCommand {
  execute(
    tenantId: string,
    workspaceId: string,
    taskId: string,
    request: AssignTaskRequest,
    role: Role,
    expectedVersion: number
  ): Promise<Task>;
}

export class AssignTaskCommandHandler implements AssignTaskCommand {
  constructor(
    private taskRepo: TaskRepository,
    private eventRepo: TaskEventRepository,
    private db: Database.Database
  ) { }

  async execute(
    tenantId: string,
    workspaceId: string,
    taskId: string,
    request: AssignTaskRequest,
    role: Role,
    expectedVersion: number
  ): Promise<Task> {
    logger.debug('Executing AssignTaskCommand', 'AssignTaskCommandHandler', undefined, { tenantId, workspaceId, taskId, request, role, expectedVersion });

    // Only manager can assign
    if (role !== Role.MANAGER) {
      const error = new Error('Only managers can assign tasks');
      logger.warn(error.message, 'AssignTaskCommandHandler');
      throw error;
    }

    const task = this.taskRepo.findById(taskId, tenantId, workspaceId);
    if (!task) {
      const error = new Error('Task not found');
      logger.warn(error.message, 'AssignTaskCommandHandler', undefined, { taskId });
      throw error;
    }

    // Check version
    if (task.version !== expectedVersion) {
      const error = new Error('Version conflict');
      logger.warn(error.message, 'AssignTaskCommandHandler', undefined, { taskId, currentVersion: task.version, expectedVersion });
      throw error;
    }

    // Check if assignment is allowed
    if (!StateMachine.canAssign(task.state)) {
      const error = new Error(`Cannot assign task in ${task.state} state`);
      logger.warn(error.message, 'AssignTaskCommandHandler', undefined, { taskId, state: task.state });
      throw error;
    }

    const transaction = this.db.transaction(() => {
      this.taskRepo.update({
        ...task,
        assignee_id: request.assignee_id
      });

      // Create event
      this.eventRepo.create({
        task_id: taskId,
        tenant_id: tenantId,
        workspace_id: workspaceId,
        event_type: TaskEventType.TASK_ASSIGNED,
        payload: {
          assignee_id: request.assignee_id,
          previous_assignee_id: task.assignee_id
        }
      });
    });

    try {
      transaction();
      logger.info('Task assigned successfully', 'AssignTaskCommandHandler', undefined, { taskId, assigneeId: request.assignee_id });
    } catch (error) {
      logger.error('Failed to assign task in transaction', error, 'AssignTaskCommandHandler', undefined, { taskId });
      throw error;
    }

    return this.taskRepo.findById(taskId, tenantId, workspaceId) as Task;
  }
}
