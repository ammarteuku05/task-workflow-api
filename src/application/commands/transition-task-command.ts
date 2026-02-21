import { TaskRepository } from '../../infrastructure/repositories/task-repository';
import { TaskEventRepository } from '../../infrastructure/repositories/task-event-repository';
import { Task, TaskState, TaskEventType, Role } from '../../domain/types';
import { StateMachine } from '../../domain/state-machine';
import Database from 'better-sqlite3';

export interface TransitionTaskRequest {
  to_state: TaskState;
}

export interface TransitionTaskCommand {
  execute(
    tenantId: string,
    workspaceId: string,
    taskId: string,
    request: TransitionTaskRequest,
    role: Role,
    userId: string,
    expectedVersion: number
  ): Promise<Task>;
}

export class TransitionTaskCommandHandler implements TransitionTaskCommand {
  constructor(
    private taskRepo: TaskRepository,
    private eventRepo: TaskEventRepository,
    private db: Database.Database
  ) { }

  async execute(
    tenantId: string,
    workspaceId: string,
    taskId: string,
    request: TransitionTaskRequest,
    role: Role,
    userId: string,
    expectedVersion: number
  ): Promise<Task> {
    const task = this.taskRepo.findById(taskId, tenantId, workspaceId);
    if (!task) {
      throw new Error('Task not found');
    }

    // Check version
    if (task.version !== expectedVersion) {
      throw new Error('Version conflict');
    }

    // Validate transition based on role
    let canTransition = false;
    if (role === Role.AGENT) {
      canTransition = StateMachine.canAgentTransition(
        task.state,
        request.to_state,
        task.assignee_id,
        userId
      );
    } else if (role === Role.MANAGER) {
      canTransition = StateMachine.canManagerTransition(task.state, request.to_state);
    }

    if (!canTransition) {
      throw new Error(`Invalid transition from ${task.state} to ${request.to_state} for role ${role}`);
    }

    // Use transaction
    const transaction = this.db.transaction(() => {
      this.taskRepo.update({
        ...task,
        state: request.to_state
      });

      // Create event
      this.eventRepo.create({
        task_id: taskId,
        tenant_id: tenantId,
        workspace_id: workspaceId,
        event_type: TaskEventType.TASK_STATE_CHANGED,
        payload: {
          from_state: task.state,
          to_state: request.to_state
        }
      });
    });

    transaction();
    return this.taskRepo.findById(taskId, tenantId, workspaceId) as Task;
  }
}
