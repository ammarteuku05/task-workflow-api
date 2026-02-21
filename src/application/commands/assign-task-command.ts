import { TaskRepository } from '../../infrastructure/repositories/task-repository';
import { TaskEventRepository } from '../../infrastructure/repositories/task-event-repository';
import { Task, TaskEventType, Role } from '../../domain/types';
import { StateMachine } from '../../domain/state-machine';
import Database from 'better-sqlite3';

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
    // Only manager can assign
    if (role !== Role.MANAGER) {
      throw new Error('Only managers can assign tasks');
    }

    const task = this.taskRepo.findById(taskId, tenantId, workspaceId);
    if (!task) {
      throw new Error('Task not found');
    }

    // Check version
    if (task.version !== expectedVersion) {
      throw new Error('Version conflict');
    }

    // Check if assignment is allowed
    if (!StateMachine.canAssign(task.state)) {
      throw new Error(`Cannot assign task in ${task.state} state`);
    }

    // Use transaction
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

    transaction();
    return this.taskRepo.findById(taskId, tenantId, workspaceId) as Task;
  }
}
