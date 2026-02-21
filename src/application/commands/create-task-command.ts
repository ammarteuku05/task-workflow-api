import { TaskRepository } from '../../infrastructure/repositories/task-repository';
import { IdempotencyRepository } from '../../infrastructure/repositories/idempotency-repository';
import { TaskEventRepository } from '../../infrastructure/repositories/task-event-repository';
import { Task, TaskPriority, TaskEventType, TaskState } from '../../domain/types';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';

export interface CreateTaskRequest {
  title: string;
  priority?: TaskPriority;
}

export interface CreateTaskCommand {
  execute(
    tenantId: string,
    workspaceId: string,
    request: CreateTaskRequest,
    idempotencyKey?: string
  ): Promise<Task>;
}

export class CreateTaskCommandHandler implements CreateTaskCommand {
  constructor(
    private taskRepo: TaskRepository,
    private idempotencyRepo: IdempotencyRepository,
    private eventRepo: TaskEventRepository,
    private db: Database.Database
  ) { }

  async execute(
    tenantId: string,
    workspaceId: string,
    request: CreateTaskRequest,
    idempotencyKey?: string
  ): Promise<Task> {
    // Validate title
    if (!request.title || request.title.trim().length === 0) {
      throw new Error('Title is required');
    }
    if (request.title.length > 120) {
      throw new Error('Title must be at most 120 characters');
    }

    // Check idempotency
    if (idempotencyKey) {
      const existing = this.idempotencyRepo.findByKey(idempotencyKey);
      if (existing) {
        const task = this.taskRepo.findById(existing.task_id, tenantId, workspaceId);
        if (task) {
          return task;
        }
      }
    }

    const priority = request.priority || TaskPriority.MEDIUM;
    const taskId = uuidv4();
    const now = new Date();

    // Use transaction for atomicity
    const transaction = this.db.transaction(() => {
      const task: Omit<Task, 'created_at' | 'updated_at'> = {
        id: taskId,
        tenant_id: tenantId,
        workspace_id: workspaceId,
        title: request.title.trim(),
        priority,
        state: TaskState.NEW,
        assignee_id: null,
        version: 1
      };

      const createdTask = this.taskRepo.create(task);

      // Create event
      this.eventRepo.create({
        task_id: taskId,
        tenant_id: tenantId,
        workspace_id: workspaceId,
        event_type: TaskEventType.TASK_CREATED,
        payload: {
          title: task.title,
          priority: task.priority
        }
      });

      // Store idempotency key if provided
      if (idempotencyKey) {
        this.idempotencyRepo.create({
          id: idempotencyKey,
          task_id: taskId,
          tenant_id: tenantId,
          workspace_id: workspaceId,
          created_at: now
        });
      }

      return createdTask;
    });

    transaction();
    return this.taskRepo.findById(taskId, tenantId, workspaceId) as Task;
  }
}
