import request from 'supertest';
import app from '../index';
import { TaskState, TaskPriority, Role } from '../domain/types';
import { closeDatabase } from '../infrastructure/database/database';

describe('API Integration Tests', () => {
    const workspaceId = 'ws-integration-test';
    const tenantId = 'tenant-integration-test';
    let taskId: string;
    let version: number;

    const headers = {
        'X-Tenant-Id': tenantId,
        'X-Role': Role.MANAGER,
        'X-User-Id': 'manager-1'
    };

    afterAll(() => {
        closeDatabase();
    });

    describe('Task Lifecycle', () => {
        it('should create a task (POST /v1/workspaces/:workspaceId/tasks)', async () => {
            const resp = await request(app)
                .post(`/v1/workspaces/${workspaceId}/tasks`)
                .set(headers)
                .send({
                    title: 'Integration Test Task',
                    priority: TaskPriority.HIGH
                });

            expect(resp.status).toBe(201);
            expect(resp.body).toHaveProperty('id');
            expect(resp.body.state).toBe(TaskState.NEW);
            expect(resp.body.version).toBe(1);

            taskId = resp.body.id;
            version = resp.body.version;
        });

        it('should support idempotency (POST /v1/workspaces/:workspaceId/tasks)', async () => {
            const idempotencyKey = 'idempotency-key-test';

            const resp1 = await request(app)
                .post(`/v1/workspaces/${workspaceId}/tasks`)
                .set({ ...headers, 'Idempotency-Key': idempotencyKey })
                .send({ title: 'Idempotent Task' });

            expect(resp1.status).toBe(201);
            const id1 = resp1.body.id;

            const resp2 = await request(app)
                .post(`/v1/workspaces/${workspaceId}/tasks`)
                .set({ ...headers, 'Idempotency-Key': idempotencyKey })
                .send({ title: 'Idempotent Task' });

            expect(resp2.status).toBe(201);
            expect(resp2.body.id).toBe(id1);
        });

        it('should assign the task (POST /v1/workspaces/:workspaceId/tasks/:taskId/assign)', async () => {
            const resp = await request(app)
                .post(`/v1/workspaces/${workspaceId}/tasks/${taskId}/assign`)
                .set({ ...headers, 'If-Match-Version': version.toString() })
                .send({ assignee_id: 'agent-1' });

            expect(resp.status).toBe(200);
            expect(resp.body.version).toBe(version + 1);
            version = resp.body.version;
        });

        it('should transition the task state (POST /v1/workspaces/:workspaceId/tasks/:taskId/transition)', async () => {
            // Transition to IN_PROGRESS as an agent
            const resp = await request(app)
                .post(`/v1/workspaces/${workspaceId}/tasks/${taskId}/transition`)
                .set({
                    ...headers,
                    'X-Role': Role.AGENT,
                    'X-User-Id': 'agent-1',
                    'If-Match-Version': version.toString()
                })
                .send({ to_state: TaskState.IN_PROGRESS });

            expect(resp.status).toBe(200);
            expect(resp.body.state).toBe(TaskState.IN_PROGRESS);
            expect(resp.body.version).toBe(version + 1);
            version = resp.body.version;
        });

        it('should get task with timeline (GET /v1/workspaces/:workspaceId/tasks/:taskId)', async () => {
            const resp = await request(app)
                .get(`/v1/workspaces/${workspaceId}/tasks/${taskId}`)
                .set(headers);

            expect(resp.status).toBe(200);
            expect(resp.body.task.id).toBe(taskId);
            expect(resp.body.timeline.length).toBeGreaterThanOrEqual(3); // Created, Assigned, Transitioned
        });

        it('should list tasks (GET /v1/workspaces/:workspaceId/tasks)', async () => {
            const resp = await request(app)
                .get(`/v1/workspaces/${workspaceId}/tasks`)
                .set(headers)
                .query({ state: TaskState.IN_PROGRESS });

            expect(resp.status).toBe(200);
            expect(resp.body.tasks.length).toBeGreaterThan(0);
            expect(resp.body.tasks[0].state).toBe(TaskState.IN_PROGRESS);
        });

        it('should get events (GET /v1/events)', async () => {
            const resp = await request(app)
                .get('/v1/events')
                .set(headers);

            expect(resp.status).toBe(200);
            expect(resp.body.events.length).toBeGreaterThan(0);
        });
    });
});
