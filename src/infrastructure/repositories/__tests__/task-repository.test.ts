import Database from 'better-sqlite3';
import { TaskRepository } from '../task-repository';
import { TaskState, TaskPriority } from '../../../domain/types';
import { v4 as uuidv4 } from 'uuid';

describe('TaskRepository', () => {
  let db: Database.Database;
  let repository: TaskRepository;

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
      CREATE INDEX idx_tasks_tenant_workspace ON tasks(tenant_id, workspace_id);
    `);
    repository = new TaskRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('create', () => {
    it('should create a task successfully', async () => {
      const task = {
        id: uuidv4(),
        tenant_id: 'tenant1',
        workspace_id: 'workspace1',
        title: 'Test Task',
        priority: TaskPriority.MEDIUM,
        state: TaskState.NEW,
        assignee_id: null,
        version: 1
      };

      const result = await repository.create(task);

      expect(result.id).toBe(task.id);
      expect(result.title).toBe('Test Task');
      expect(result.state).toBe(TaskState.NEW);
      expect(result.version).toBe(1);
      expect(result.created_at).toBeInstanceOf(Date);
    });
  });

  describe('findById', () => {
    it('should find a task by id', async () => {
      const task = {
        id: uuidv4(),
        tenant_id: 'tenant1',
        workspace_id: 'workspace1',
        title: 'Test Task',
        priority: TaskPriority.MEDIUM,
        state: TaskState.NEW,
        assignee_id: null,
        version: 1
      };

      await repository.create(task);
      const found = await repository.findById(task.id, 'tenant1', 'workspace1');

      expect(found).not.toBeNull();
      expect(found?.id).toBe(task.id);
      expect(found?.title).toBe('Test Task');
    });

    it('should return null if task not found', async () => {
      const found = await repository.findById(uuidv4(), 'tenant1', 'workspace1');
      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a task successfully', async () => {
      const task = {
        id: uuidv4(),
        tenant_id: 'tenant1',
        workspace_id: 'workspace1',
        title: 'Test Task',
        priority: TaskPriority.MEDIUM,
        state: TaskState.NEW,
        assignee_id: null,
        version: 1
      };

      const created = await repository.create(task);
      const updated = await repository.update({
        ...created,
        state: TaskState.IN_PROGRESS,
        assignee_id: 'user1'
      });

      expect(updated.state).toBe(TaskState.IN_PROGRESS);
      expect(updated.assignee_id).toBe('user1');
      expect(updated.version).toBe(2);
    });

    it('should throw error on version conflict', async () => {
      const task = {
        id: uuidv4(),
        tenant_id: 'tenant1',
        workspace_id: 'workspace1',
        title: 'Test Task',
        priority: TaskPriority.MEDIUM,
        state: TaskState.NEW,
        assignee_id: null,
        version: 1
      };

      const created = await repository.create(task);

      // Simulate concurrent update
      await repository.update({ ...created, version: 1 });

      expect(() =>
        repository.update({ ...created, version: 1 })
      ).toThrow('Version conflict');
    });
  });

  describe('findByFilters', () => {
    beforeEach(async () => {
      // Create test tasks
      for (let i = 0; i < 5; i++) {
        repository.create({
          id: uuidv4(),
          tenant_id: 'tenant1',
          workspace_id: 'workspace1',
          title: `Task ${i}`,
          priority: TaskPriority.MEDIUM,
          state: i < 2 ? TaskState.NEW : TaskState.IN_PROGRESS,
          assignee_id: i < 3 ? 'user1' : 'user2',
          version: 1
        });
        // Add small delay to ensure different created_at
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    });

    it('should filter by state', async () => {
      const result = await repository.findByFilters('tenant1', 'workspace1', {
        state: TaskState.NEW
      });

      expect(result.tasks.length).toBe(2);
      result.tasks.forEach(task => {
        expect(task.state).toBe(TaskState.NEW);
      });
    });

    it('should filter by assignee_id', async () => {
      const result = await repository.findByFilters('tenant1', 'workspace1', {
        assignee_id: 'user1'
      });

      expect(result.tasks.length).toBe(3);
      result.tasks.forEach(task => {
        expect(task.assignee_id).toBe('user1');
      });
    });

    it('should apply limit', async () => {
      const result = await repository.findByFilters('tenant1', 'workspace1', {
        limit: 2
      });

      expect(result.tasks.length).toBe(2);
    });

    it('should support cursor pagination', async () => {
      const firstPage = await repository.findByFilters('tenant1', 'workspace1', {
        limit: 2
      });

      expect(firstPage.tasks.length).toBe(2);
      expect(firstPage.nextCursor).toBeDefined();

      const secondPage = await repository.findByFilters('tenant1', 'workspace1', {
        limit: 2,
        cursor: firstPage.nextCursor
      });

      expect(secondPage.tasks.length).toBeGreaterThan(0);
    });
  });
});
