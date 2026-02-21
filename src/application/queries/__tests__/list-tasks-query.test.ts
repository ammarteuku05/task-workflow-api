import Database from 'better-sqlite3';
import { ListTasksQueryHandler } from '../list-tasks-query';
import { TaskRepository } from '../../../infrastructure/repositories/task-repository';
import { TaskState, TaskPriority } from '../../../domain/types';
import { v4 as uuidv4 } from 'uuid';

describe('ListTasksQueryHandler', () => {
  let db: Database.Database;
  let query: ListTasksQueryHandler;
  let taskRepo: TaskRepository;

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
    `);
    taskRepo = new TaskRepository(db);
    query = new ListTasksQueryHandler(taskRepo);
  });

  afterEach(() => {
    db.close();
  });

  describe('execute', () => {
    beforeEach(async () => {
      // Create test tasks
      for (let i = 0; i < 5; i++) {
        taskRepo.create({
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

    it('should list all tasks', async () => {
      const result = await query.execute('tenant1', 'workspace1', {});

      expect(result.tasks.length).toBe(5);
    });

    it('should filter by state', async () => {
      const result = await query.execute('tenant1', 'workspace1', {
        state: TaskState.NEW
      });

      expect(result.tasks.length).toBe(2);
      result.tasks.forEach(task => {
        expect(task.state).toBe(TaskState.NEW);
      });
    });

    it('should filter by assignee_id', async () => {
      const result = await query.execute('tenant1', 'workspace1', {
        assignee_id: 'user1'
      });

      expect(result.tasks.length).toBe(3);
      result.tasks.forEach(task => {
        expect(task.assignee_id).toBe('user1');
      });
    });

    it('should apply limit', async () => {
      const result = await query.execute('tenant1', 'workspace1', {
        limit: 2
      });

      expect(result.tasks.length).toBe(2);
    });

    it('should support cursor pagination', async () => {
      const firstPage = await query.execute('tenant1', 'workspace1', {
        limit: 2
      });

      expect(firstPage.tasks.length).toBe(2);
      expect(firstPage.nextCursor).toBeDefined();

      const secondPage = await query.execute('tenant1', 'workspace1', {
        limit: 2,
        cursor: firstPage.nextCursor
      });

      expect(secondPage.tasks.length).toBeGreaterThan(0);
    });
  });
});
