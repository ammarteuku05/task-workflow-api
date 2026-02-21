import Database from 'better-sqlite3';
import { TaskEventRepository } from '../task-event-repository';
import { TaskEventType } from '../../../domain/types';
import { v4 as uuidv4 } from 'uuid';

describe('TaskEventRepository', () => {
  let db: Database.Database;
  let repository: TaskEventRepository;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`
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
    repository = new TaskEventRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('create', () => {
    it('should create an event successfully', async () => {
      const event = {
        task_id: uuidv4(),
        tenant_id: 'tenant1',
        workspace_id: 'workspace1',
        event_type: TaskEventType.TASK_CREATED,
        payload: { title: 'Test Task' }
      };

      const result = await repository.create(event);

      expect(result.id).toBeDefined();
      expect(result.event_type).toBe(TaskEventType.TASK_CREATED);
      expect(result.payload).toEqual({ title: 'Test Task' });
      expect(result.created_at).toBeInstanceOf(Date);
    });
  });

  describe('findByTaskId', () => {
    it('should find events by task id', async () => {
      const taskId = uuidv4();

      await repository.create({
        task_id: taskId,
        tenant_id: 'tenant1',
        workspace_id: 'workspace1',
        event_type: TaskEventType.TASK_CREATED,
        payload: { title: 'Test Task' }
      });

      // Add small delay to ensure different created_at
      await new Promise(resolve => setTimeout(resolve, 10));

      await repository.create({
        task_id: taskId,
        tenant_id: 'tenant1',
        workspace_id: 'workspace1',
        event_type: TaskEventType.TASK_ASSIGNED,
        payload: { assignee_id: 'user1' }
      });

      const events = await repository.findByTaskId(taskId);

      expect(events.length).toBe(2);
      expect(events[0].event_type).toBe(TaskEventType.TASK_ASSIGNED); // Most recent first
      expect(events[1].event_type).toBe(TaskEventType.TASK_CREATED);
    });

    it('should respect limit', async () => {
      const taskId = uuidv4();

      for (let i = 0; i < 5; i++) {
        await repository.create({
          task_id: taskId,
          tenant_id: 'tenant1',
          workspace_id: 'workspace1',
          event_type: TaskEventType.TASK_CREATED,
          payload: { index: i }
        });
      }

      const events = await repository.findByTaskId(taskId, 3);

      expect(events.length).toBe(3);
    });
  });

  describe('findAll', () => {
    it('should find all events', async () => {
      for (let i = 0; i < 3; i++) {
        await repository.create({
          task_id: uuidv4(),
          tenant_id: 'tenant1',
          workspace_id: 'workspace1',
          event_type: TaskEventType.TASK_CREATED,
          payload: { index: i }
        });
      }

      const events = await repository.findAll();

      expect(events.length).toBe(3);
    });

    it('should respect limit', async () => {
      for (let i = 0; i < 10; i++) {
        await repository.create({
          task_id: uuidv4(),
          tenant_id: 'tenant1',
          workspace_id: 'workspace1',
          event_type: TaskEventType.TASK_CREATED,
          payload: { index: i }
        });
      }

      const events = await repository.findAll(5);

      expect(events.length).toBe(5);
    });
  });
});
