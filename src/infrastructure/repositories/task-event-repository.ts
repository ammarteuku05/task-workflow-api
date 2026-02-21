import Database from 'better-sqlite3';
import { TaskEvent, TaskEventType } from '../../domain/types';
import { v4 as uuidv4 } from 'uuid';

export class TaskEventRepository {
  constructor(private db: Database.Database) { }

  create(event: Omit<TaskEvent, 'id' | 'created_at'>): TaskEvent {
    const id = uuidv4();
    const now = new Date();
    const stmt = this.db.prepare(`
      INSERT INTO task_events (id, task_id, tenant_id, workspace_id, event_type, payload, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      event.task_id,
      event.tenant_id,
      event.workspace_id,
      event.event_type,
      JSON.stringify(event.payload),
      now.toISOString()
    );

    return {
      id,
      ...event,
      created_at: now
    };
  }

  findByTaskId(taskId: string, limit: number = 20): TaskEvent[] {
    const stmt = this.db.prepare(`
      SELECT * FROM task_events
      WHERE task_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `);

    const rows = stmt.all(taskId, limit) as any[];
    return rows.map(row => this.mapRowToEvent(row));
  }

  findAll(limit: number = 50, offset: number = 0): TaskEvent[] {
    const stmt = this.db.prepare(`
      SELECT * FROM task_events
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(limit, offset) as any[];
    return rows.map(row => this.mapRowToEvent(row));
  }

  countAll(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM task_events');
    const row = stmt.get() as { count: number };
    return row.count;
  }

  private mapRowToEvent(row: any): TaskEvent {
    return {
      id: row.id,
      task_id: row.task_id,
      tenant_id: row.tenant_id,
      workspace_id: row.workspace_id,
      event_type: row.event_type as TaskEventType,
      payload: JSON.parse(row.payload),
      created_at: new Date(row.created_at)
    };
  }
}
