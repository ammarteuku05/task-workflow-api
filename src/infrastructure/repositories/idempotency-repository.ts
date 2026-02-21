import Database from 'better-sqlite3';
import { IdempotencyKey } from '../../domain/types';

export class IdempotencyRepository {
  constructor(private db: Database.Database) { }

  findByKey(idempotencyKey: string): IdempotencyKey | null {
    const stmt = this.db.prepare(`
      SELECT * FROM idempotency_keys
      WHERE id = ?
    `);

    const row = stmt.get(idempotencyKey) as any;
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      task_id: row.task_id,
      tenant_id: row.tenant_id,
      workspace_id: row.workspace_id,
      created_at: new Date(row.created_at)
    };
  }

  create(idempotencyKey: IdempotencyKey): IdempotencyKey {
    const stmt = this.db.prepare(`
      INSERT INTO idempotency_keys (id, task_id, tenant_id, workspace_id, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      idempotencyKey.id,
      idempotencyKey.task_id,
      idempotencyKey.tenant_id,
      idempotencyKey.workspace_id,
      idempotencyKey.created_at.toISOString()
    );

    return idempotencyKey;
  }
}
