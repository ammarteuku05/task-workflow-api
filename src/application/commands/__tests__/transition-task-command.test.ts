import Database from 'better-sqlite3';
import { TransitionTaskCommandHandler } from '../transition-task-command';
import { TaskRepository } from '../../../infrastructure/repositories/task-repository';
import { TaskEventRepository } from '../../../infrastructure/repositories/task-event-repository';
import { TaskState, TaskPriority, Role, TaskEventType } from '../../../domain/types';
import { v4 as uuidv4 } from 'uuid';

describe('TransitionTaskCommandHandler', () => {
  let db: Database.Database;
  let command: TransitionTaskCommandHandler;
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
    command = new TransitionTaskCommandHandler(taskRepo, eventRepo, db);
  });

  afterEach(() => {
    db.close();
  });

  describe('execute', () => {
    it('should transition task state successfully (agent)', async () => {
      const task = await taskRepo.create({
        id: uuidv4(),
        tenant_id: 'tenant1',
        workspace_id: 'workspace1',
        title: 'Test Task',
        priority: TaskPriority.MEDIUM,
        state: TaskState.NEW,
        assignee_id: 'user1',
        version: 1
      });

      const result = await command.execute(
        'tenant1',
        'workspace1',
        task.id,
        { to_state: TaskState.IN_PROGRESS },
        Role.AGENT,
        'user1',
        1
      );

      expect(result.state).toBe(TaskState.IN_PROGRESS);
      expect(result.version).toBe(2);
    });

    it('should throw error if agent tries to transition unassigned task', async () => {
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
          { to_state: TaskState.IN_PROGRESS },
          Role.AGENT,
          'user1',
          1
        )
      ).rejects.toThrow('Invalid transition');
    });

    it('should throw error if agent tries to transition task assigned to someone else', async () => {
      const task = await taskRepo.create({
        id: uuidv4(),
        tenant_id: 'tenant1',
        workspace_id: 'workspace1',
        title: 'Test Task',
        priority: TaskPriority.MEDIUM,
        state: TaskState.NEW,
        assignee_id: 'user2',
        version: 1
      });

      await expect(
        command.execute(
          'tenant1',
          'workspace1',
          task.id,
          { to_state: TaskState.IN_PROGRESS },
          Role.AGENT,
          'user1', // Different user
          1
        )
      ).rejects.toThrow('Invalid transition');
    });

    it('should allow manager to cancel task', async () => {
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
        { to_state: TaskState.CANCELLED },
        Role.MANAGER,
        'manager1',
        1
      );

      expect(result.state).toBe(TaskState.CANCELLED);
    });

    it('should throw error on invalid transition', async () => {
      const task = await taskRepo.create({
        id: uuidv4(),
        tenant_id: 'tenant1',
        workspace_id: 'workspace1',
        title: 'Test Task',
        priority: TaskPriority.MEDIUM,
        state: TaskState.NEW,
        assignee_id: 'user1',
        version: 1
      });

      await expect(
        command.execute(
          'tenant1',
          'workspace1',
          task.id,
          { to_state: TaskState.DONE }, // Invalid: NEW -> DONE
          Role.AGENT,
          'user1',
          1
        )
      ).rejects.toThrow('Invalid transition');
    });

    it('should throw error on version conflict', async () => {
      const task = await taskRepo.create({
        id: uuidv4(),
        tenant_id: 'tenant1',
        workspace_id: 'workspace1',
        title: 'Test Task',
        priority: TaskPriority.MEDIUM,
        state: TaskState.NEW,
        assignee_id: 'user1',
        version: 1
      });

      // Update task to change version
      await taskRepo.update({ ...task, state: TaskState.IN_PROGRESS });

      await expect(
        command.execute(
          'tenant1',
          'workspace1',
          task.id,
          { to_state: TaskState.DONE },
          Role.AGENT,
          'user1',
          1 // Old version
        )
      ).rejects.toThrow('Version conflict');
    });

    it('should throw error if task not found', async () => {
      await expect(
        command.execute(
          'tenant1',
          'workspace1',
          uuidv4(),
          { to_state: TaskState.IN_PROGRESS },
          Role.AGENT,
          'user1',
          1
        )
      ).rejects.toThrow('Task not found');
    });

    it('should create event when task state changes', async () => {
      const task = await taskRepo.create({
        id: uuidv4(),
        tenant_id: 'tenant1',
        workspace_id: 'workspace1',
        title: 'Test Task',
        priority: TaskPriority.MEDIUM,
        state: TaskState.NEW,
        assignee_id: 'user1',
        version: 1
      });

      await command.execute(
        'tenant1',
        'workspace1',
        task.id,
        { to_state: TaskState.IN_PROGRESS },
        Role.AGENT,
        'user1',
        1
      );

      const events = await eventRepo.findByTaskId(task.id);
      const transitionEvent = events.find(e => e.event_type === TaskEventType.TASK_STATE_CHANGED);
      expect(transitionEvent).toBeDefined();
      expect(transitionEvent?.payload.from_state).toBe(TaskState.NEW);
      expect(transitionEvent?.payload.to_state).toBe(TaskState.IN_PROGRESS);
    });
  });
});
