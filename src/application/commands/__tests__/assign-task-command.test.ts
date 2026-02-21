import Database from 'better-sqlite3';
import { AssignTaskCommandHandler } from '../assign-task-command';
import { TaskRepository } from '../../../infrastructure/repositories/task-repository';
import { TaskEventRepository } from '../../../infrastructure/repositories/task-event-repository';
import { TaskState, TaskPriority, Role, TaskEventType } from '../../../domain/types';
import { v4 as uuidv4 } from 'uuid';

describe('AssignTaskCommandHandler', () => {
  let db: Database.Database;
  let command: AssignTaskCommandHandler;
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
    command = new AssignTaskCommandHandler(taskRepo, eventRepo, db);
  });

  afterEach(() => {
    db.close();
  });

  describe('execute', () => {
    it('should assign task successfully', async () => {
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

      const result = await command.execute(
        'tenant1',
        'workspace1',
        task.id,
        { assignee_id: 'user1' },
        Role.MANAGER,
        1
      );

      expect(result.assignee_id).toBe('user1');
      expect(result.version).toBe(2);
    });

    it('should throw error if role is not manager', async () => {
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

      await expect(
        command.execute(
          'tenant1',
          'workspace1',
          task.id,
          { assignee_id: 'user1' },
          Role.AGENT,
          1
        )
      ).rejects.toThrow('Only managers can assign tasks');
    });

    it('should throw error if task not found', async () => {
      await expect(
        command.execute(
          'tenant1',
          'workspace1',
          uuidv4(),
          { assignee_id: 'user1' },
          Role.MANAGER,
          1
        )
      ).rejects.toThrow('Task not found');
    });

    it('should throw error on version conflict', async () => {
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

      // Update task to change version
      await taskRepo.update({ ...task, state: TaskState.IN_PROGRESS });

      await expect(
        command.execute(
          'tenant1',
          'workspace1',
          task.id,
          { assignee_id: 'user1' },
          Role.MANAGER,
          1 // Old version
        )
      ).rejects.toThrow('Version conflict');
    });

    it('should throw error if task state does not allow assignment', async () => {
      const task = await taskRepo.create({
        id: uuidv4(),
        tenant_id: 'tenant1',
        workspace_id: 'workspace1',
        title: 'Test Task',
        priority: TaskPriority.MEDIUM,
        state: TaskState.DONE,
        assignee_id: null,
        version: 1
      });

      await expect(
        command.execute(
          'tenant1',
          'workspace1',
          task.id,
          { assignee_id: 'user1' },
          Role.MANAGER,
          1
        )
      ).rejects.toThrow('Cannot assign task');
    });

    it('should create event when task is assigned', async () => {
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

      await command.execute(
        'tenant1',
        'workspace1',
        task.id,
        { assignee_id: 'user1' },
        Role.MANAGER,
        1
      );

      const events = await eventRepo.findByTaskId(task.id);
      const assignEvent = events.find(e => e.event_type === TaskEventType.TASK_ASSIGNED);
      expect(assignEvent).toBeDefined();
      expect(assignEvent?.payload.assignee_id).toBe('user1');
    });
  });
});
