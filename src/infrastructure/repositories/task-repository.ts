import Database from 'better-sqlite3';
import { Task, TaskState, TaskPriority } from '../../domain/types';
import { v4 as uuidv4 } from 'uuid';

export interface TaskFilters {
  state?: TaskState;
  assignee_id?: string;
  limit?: number;
  cursor?: string;
}

export interface PaginatedTasks {
  tasks: Task[];
  nextCursor?: string;
}

export class TaskRepository {
  constructor(private db: Database.Database) { }

  create(task: Omit<Task, 'created_at' | 'updated_at'>): Task {
    const now = new Date();
    const stmt = this.db.prepare(`
      INSERT INTO tasks (id, tenant_id, workspace_id, title, priority, state, assignee_id, version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      task.id,
      task.tenant_id,
      task.workspace_id,
      task.title,
      task.priority,
      task.state,
      task.assignee_id,
      task.version,
      now.toISOString(),
      now.toISOString()
    );

    return {
      ...task,
      created_at: now,
      updated_at: now
    };
  }

  findById(taskId: string, tenantId: string, workspaceId: string): Task | null {
    const stmt = this.db.prepare(`
      SELECT * FROM tasks
      WHERE id = ? AND tenant_id = ? AND workspace_id = ?
    `);

    const row = stmt.get(taskId, tenantId, workspaceId) as any;
    if (!row) {
      return null;
    }

    return this.mapRowToTask(row);
  }

  update(task: Task): Task {
    const now = new Date();
    const stmt = this.db.prepare(`
      UPDATE tasks
      SET title = ?, priority = ?, state = ?, assignee_id = ?, version = ?, updated_at = ?
      WHERE id = ? AND tenant_id = ? AND workspace_id = ? AND version = ?
    `);

    const result = stmt.run(
      task.title,
      task.priority,
      task.state,
      task.assignee_id,
      task.version + 1,
      now.toISOString(),
      task.id,
      task.tenant_id,
      task.workspace_id,
      task.version
    );

    if (result.changes === 0) {
      throw new Error('Version conflict: task was modified by another request');
    }

    return {
      ...task,
      version: task.version + 1,
      updated_at: now
    };
  }

  findByFilters(
    tenantId: string,
    workspaceId: string,
    filters: TaskFilters
  ): PaginatedTasks {
    let query = 'SELECT * FROM tasks WHERE tenant_id = ? AND workspace_id = ?';
    const params: any[] = [tenantId, workspaceId];

    if (filters.state) {
      query += ' AND state = ?';
      params.push(filters.state);
    }

    if (filters.assignee_id) {
      query += ' AND assignee_id = ?';
      params.push(filters.assignee_id);
    }

    if (filters.cursor) {
      const cursorDate = Buffer.from(filters.cursor, 'base64').toString('utf-8');
      query += ' AND created_at < ?';
      params.push(cursorDate);
    }

    query += ' ORDER BY created_at DESC';

    const limit = filters.limit || 20;
    query += ` LIMIT ?`;
    params.push(limit + 1); // Fetch one extra to check if there's a next page

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    const tasks = rows.slice(0, limit).map(row => this.mapRowToTask(row));
    const hasMore = rows.length > limit;
    const nextCursor = hasMore && tasks.length > 0
      ? Buffer.from(tasks[tasks.length - 1].created_at.toISOString()).toString('base64')
      : undefined;

    return { tasks, nextCursor };
  }

  private mapRowToTask(row: any): Task {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      workspace_id: row.workspace_id,
      title: row.title,
      priority: row.priority as TaskPriority,
      state: row.state as TaskState,
      assignee_id: row.assignee_id,
      version: row.version,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }
}
