import Database from 'better-sqlite3';
import { CreateTaskCommandHandler } from '../create-task-command';
import { TaskRepository } from '../../../infrastructure/repositories/task-repository';
import { IdempotencyRepository } from '../../../infrastructure/repositories/idempotency-repository';
import { TaskEventRepository } from '../../../infrastructure/repositories/task-event-repository';
import { TaskPriority, TaskState, TaskEventType } from '../../../domain/types';
import { v4 as uuidv4 } from 'uuid';

describe('CreateTaskCommandHandler', () => {
  let db: Database.Database;
  let command: CreateTaskCommandHandler;
  let taskRepo: TaskRepository;
  let idempotencyRepo: IdempotencyRepository;
  let eventRepo: TaskEventRepository;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE tasks (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        title TEXT NOT NULL,
        priority TEXT NOT NULL,
        state TEXT NOT NULL,
        assignee_id TEXT,
        version INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE task_events (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE idempotency_keys (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    taskRepo = new TaskRepository(db);
    idempotencyRepo = new IdempotencyRepository(db);
    eventRepo = new TaskEventRepository(db);
    command = new CreateTaskCommandHandler(taskRepo, idempotencyRepo, eventRepo, db);
  });

  afterEach(() => {
    db.close();
  });

  describe('execute', () => {
    it('should create a task successfully', async () => {
      const result = await command.execute(
        'tenant1',
        'workspace1',
        { title: 'Test Task', priority: TaskPriority.HIGH }
      );

      expect(result.title).toBe('Test Task');
      expect(result.priority).toBe(TaskPriority.HIGH);
      expect(result.state).toBe(TaskState.NEW);
      expect(result.version).toBe(1);
    });

    it('should default priority to MEDIUM if not provided', async () => {
      const result = await command.execute(
        'tenant1',
        'workspace1',
        { title: 'Test Task' }
      );

      expect(result.priority).toBe(TaskPriority.MEDIUM);
    });

    it('should throw error if title is empty', async () => {
      await expect(
        command.execute('tenant1', 'workspace1', { title: '' })
      ).rejects.toThrow('Title is required');
    });

    it('should throw error if title exceeds 120 characters', async () => {
      const longTitle = 'a'.repeat(121);
      await expect(
        command.execute('tenant1', 'workspace1', { title: longTitle })
      ).rejects.toThrow('Title must be at most 120 characters');
    });

    it('should return existing task if idempotency key exists', async () => {
      const idempotencyKey = 'key123';
      const taskId = uuidv4();

      // Create idempotency key
      await idempotencyRepo.create({
        id: idempotencyKey,
        task_id: taskId,
        tenant_id: 'tenant1',
        workspace_id: 'workspace1',
        created_at: new Date()
      });

      // Create the task
      await taskRepo.create({
        id: taskId,
        tenant_id: 'tenant1',
        workspace_id: 'workspace1',
        title: 'Existing Task',
        priority: TaskPriority.MEDIUM,
        state: TaskState.NEW,
        assignee_id: null,
        version: 1
      });

      // Try to create again with same idempotency key
      const result = await command.execute(
        'tenant1',
        'workspace1',
        { title: 'New Task' },
        idempotencyKey
      );

      expect(result.id).toBe(taskId);
      expect(result.title).toBe('Existing Task');
    });

    it('should create event when task is created', async () => {
      const result = await command.execute(
        'tenant1',
        'workspace1',
        { title: 'Test Task' }
      );

      const events = await eventRepo.findByTaskId(result.id);
      expect(events.length).toBe(1);
      expect(events[0].event_type).toBe(TaskEventType.TASK_CREATED);
      expect(events[0].payload.title).toBe('Test Task');
    });

    it('should store idempotency key when provided', async () => {
      const idempotencyKey = 'key123';
      await command.execute(
        'tenant1',
        'workspace1',
        { title: 'Test Task' },
        idempotencyKey
      );

      const key = await idempotencyRepo.findByKey(idempotencyKey);
      expect(key).not.toBeNull();
      expect(key?.id).toBe(idempotencyKey);
    });
  });
});
