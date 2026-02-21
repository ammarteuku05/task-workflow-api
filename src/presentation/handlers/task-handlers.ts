import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth-middleware';
import { CreateTaskCommandHandler } from '../../application/commands/create-task-command';
import { AssignTaskCommandHandler } from '../../application/commands/assign-task-command';
import { TransitionTaskCommandHandler } from '../../application/commands/transition-task-command';
import { GetTaskQueryHandler } from '../../application/queries/get-task-query';
import { ListTasksQueryHandler } from '../../application/queries/list-tasks-query';
import { TaskPriority, TaskState } from '../../domain/types';

export class TaskHandlers {
  constructor(
    private createTaskCommand: CreateTaskCommandHandler,
    private assignTaskCommand: AssignTaskCommandHandler,
    private transitionTaskCommand: TransitionTaskCommandHandler,
    private getTaskQuery: GetTaskQueryHandler,
    private listTasksQuery: ListTasksQueryHandler
  ) { }

  async createTask(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { workspaceId } = req.params;
      const { title, priority } = req.body;
      const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

      const task = await this.createTaskCommand.execute(
        req.tenantId!,
        workspaceId,
        { title, priority: priority as TaskPriority },
        idempotencyKey
      );

      res.status(201).json({
        code: 201,
        id: task.id,
        state: task.state,
        version: task.version
      });
    } catch (error: any) {
      next(error);
    }
  }

  async assignTask(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { workspaceId, taskId } = req.params;
      const { assignee_id } = req.body;
      const ifMatchVersion = req.headers['if-match-version'] as string;

      if (!ifMatchVersion) {
        const error = 'If-Match-Version header is required';
        console.error(`[Error][${req.requestId}] ${error}`);
        res.status(400).json({ code: 400, error, request_id: req.requestId });
        return;
      }

      const expectedVersion = parseInt(ifMatchVersion, 10);
      if (isNaN(expectedVersion)) {
        const error = 'If-Match-Version must be a number';
        console.error(`[Error][${req.requestId}] ${error}`);
        res.status(400).json({ code: 400, error, request_id: req.requestId });
        return;
      }

      const task = await this.assignTaskCommand.execute(
        req.tenantId!,
        workspaceId,
        taskId,
        { assignee_id },
        req.role!,
        expectedVersion
      );

      res.status(200).json({
        code: 200,
        id: task.id,
        assignee_id: task.assignee_id,
        version: task.version
      });
    } catch (error: any) {
      next(error);
    }
  }

  async transitionTask(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { workspaceId, taskId } = req.params;
      const { to_state } = req.body;
      const ifMatchVersion = req.headers['if-match-version'] as string;

      if (!ifMatchVersion) {
        const error = 'If-Match-Version header is required';
        console.error(`[Error][${req.requestId}] ${error}`);
        res.status(400).json({ code: 400, error, request_id: req.requestId });
        return;
      }

      const expectedVersion = parseInt(ifMatchVersion, 10);
      if (isNaN(expectedVersion)) {
        const error = 'If-Match-Version must be a number';
        console.error(`[Error][${req.requestId}] ${error}`);
        res.status(400).json({ code: 400, error, request_id: req.requestId });
        return;
      }

      const task = await this.transitionTaskCommand.execute(
        req.tenantId!,
        workspaceId,
        taskId,
        { to_state: to_state as TaskState },
        req.role!,
        req.userId!,
        expectedVersion
      );

      res.status(200).json({
        code: 200,
        id: task.id,
        state: task.state,
        version: task.version
      });
    } catch (error: any) {
      next(error);
    }
  }

  async getTask(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { workspaceId, taskId } = req.params;

      const result = await this.getTaskQuery.execute(req.tenantId!, workspaceId, taskId);

      res.status(200).json({
        code: 200,
        task: {
          id: result.task.id,
          tenant_id: result.task.tenant_id,
          workspace_id: result.task.workspace_id,
          title: result.task.title,
          priority: result.task.priority,
          state: result.task.state,
          assignee_id: result.task.assignee_id,
          version: result.task.version,
          created_at: result.task.created_at,
          updated_at: result.task.updated_at
        },
        timeline: result.timeline.map(event => ({
          id: event.id,
          event_type: event.event_type,
          payload: event.payload,
          created_at: event.created_at
        }))
      });
    } catch (error: any) {
      next(error);
    }
  }

  async listTasks(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { workspaceId } = req.params;
      const { state, assignee_id, limit, cursor } = req.query;

      const filters: any = {};
      if (state) filters.state = state;
      if (assignee_id) filters.assignee_id = assignee_id as string;
      if (limit) filters.limit = parseInt(limit as string, 10);
      if (cursor) filters.cursor = cursor as string;

      const result = await this.listTasksQuery.execute(req.tenantId!, workspaceId, filters);

      res.status(200).json({
        code: 200,
        tasks: result.tasks,
        next_cursor: result.nextCursor
      });
    } catch (error: any) {
      next(error);
    }
  }
}
