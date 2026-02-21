import Database from 'better-sqlite3';
import { IdempotencyRepository } from '../idempotency-repository';
import { v4 as uuidv4 } from 'uuid';

describe('IdempotencyRepository', () => {
  let db: Database.Database;
  let repository: IdempotencyRepository;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE idempotency_keys (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    repository = new IdempotencyRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('create', () => {
    it('should create an idempotency key successfully', async () => {
      const key = {
        id: 'key123',
        task_id: uuidv4(),
        tenant_id: 'tenant1',
        workspace_id: 'workspace1',
        created_at: new Date()
      };

      const result = await repository.create(key);

      expect(result.id).toBe('key123');
      expect(result.task_id).toBe(key.task_id);
    });
  });

  describe('findByKey', () => {
    it('should find an idempotency key', async () => {
      const key = {
        id: 'key123',
        task_id: uuidv4(),
        tenant_id: 'tenant1',
        workspace_id: 'workspace1',
        created_at: new Date()
      };

      await repository.create(key);
      const found = await repository.findByKey('key123');

      expect(found).not.toBeNull();
      expect(found?.id).toBe('key123');
      expect(found?.task_id).toBe(key.task_id);
    });

    it('should return null if key not found', async () => {
      const found = await repository.findByKey('nonexistent');
      expect(found).toBeNull();
    });
  });
});
