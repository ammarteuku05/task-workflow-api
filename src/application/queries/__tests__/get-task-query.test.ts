import Database from 'better-sqlite3';
import { GetTaskQueryHandler } from '../get-task-query';
import { TaskRepository } from '../../../infrastructure/repositories/task-repository';
import { TaskEventRepository } from '../../../infrastructure/repositories/task-event-repository';
import { TaskState, TaskPriority, TaskEventType } from '../../../domain/types';
import { v4 as uuidv4 } from 'uuid';

describe('GetTaskQueryHandler', () => {
  let db: Database.Database;
  let query: GetTaskQueryHandler;
  let taskRepo: TaskRepository;
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
    `);
    taskRepo = new TaskRepository(db);
    eventRepo = new TaskEventRepository(db);
    query = new GetTaskQueryHandler(taskRepo, eventRepo);
  });

  afterEach(() => {
    db.close();
  });

  describe('execute', () => {
    it('should return task with timeline', async () => {
      const task = await taskRepo.create({
        id: uuidv4(),
        tenant_id: 'tenant1',
        workspace_id: 'workspace1',
        title: 'Test Task',
        priority: TaskPriority.MEDIUM,
        state: TaskState.NEW,
        assignee_id: null,
        version: 1
      });

      await eventRepo.create({
        task_id: task.id,
        tenant_id: 'tenant1',
        workspace_id: 'workspace1',
        event_type: TaskEventType.TASK_CREATED,
        payload: { title: 'Test Task' }
      });

      const result = await query.execute('tenant1', 'workspace1', task.id);

      expect(result.task.id).toBe(task.id);
      expect(result.timeline.length).toBe(1);
      expect(result.timeline[0].event_type).toBe(TaskEventType.TASK_CREATED);
    });

    it('should return limited timeline (last 20 events)', async () => {
      const task = await taskRepo.create({
        id: uuidv4(),
        tenant_id: 'tenant1',
        workspace_id: 'workspace1',
        title: 'Test Task',
        priority: TaskPriority.MEDIUM,
        state: TaskState.NEW,
        assignee_id: null,
        version: 1
      });

      // Create 25 events
      for (let i = 0; i < 25; i++) {
        await eventRepo.create({
          task_id: task.id,
          tenant_id: 'tenant1',
          workspace_id: 'workspace1',
          event_type: TaskEventType.TASK_CREATED,
          payload: { index: i }
        });
      }

      const result = await query.execute('tenant1', 'workspace1', task.id);

      expect(result.timeline.length).toBe(20);
    });

    it('should throw error if task not found', async () => {
      await expect(
        query.execute('tenant1', 'workspace1', uuidv4())
      ).rejects.toThrow('Task not found');
    });
  });
});
