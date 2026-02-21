import { TaskHandlers } from '../task-handlers';
import { CreateTaskCommandHandler } from '../../../application/commands/create-task-command';
import { AssignTaskCommandHandler } from '../../../application/commands/assign-task-command';
import { TransitionTaskCommandHandler } from '../../../application/commands/transition-task-command';
import { GetTaskQueryHandler } from '../../../application/queries/get-task-query';
import { ListTasksQueryHandler } from '../../../application/queries/list-tasks-query';
import { Task, TaskState, TaskPriority, Role } from '../../../domain/types';
import { AuthRequest } from '../../middleware/auth-middleware';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

describe('TaskHandlers', () => {
  let handlers: TaskHandlers;
  let createTaskCommand: jest.Mocked<CreateTaskCommandHandler>;
  let assignTaskCommand: jest.Mocked<AssignTaskCommandHandler>;
  let transitionTaskCommand: jest.Mocked<TransitionTaskCommandHandler>;
  let getTaskQuery: jest.Mocked<GetTaskQueryHandler>;
  let listTasksQuery: jest.Mocked<ListTasksQueryHandler>;
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    createTaskCommand = {
      execute: jest.fn()
    } as any;

    assignTaskCommand = {
      execute: jest.fn()
    } as any;

    transitionTaskCommand = {
      execute: jest.fn()
    } as any;

    getTaskQuery = {
      execute: jest.fn()
    } as any;

    listTasksQuery = {
      execute: jest.fn()
    } as any;

    handlers = new TaskHandlers(
      createTaskCommand,
      assignTaskCommand,
      transitionTaskCommand,
      getTaskQuery,
      listTasksQuery
    );

    mockRequest = {
      tenantId: 'tenant1',
      role: Role.MANAGER,
      userId: 'user1',
      params: {},
      body: {},
      headers: {},
      query: {},
      requestId: 'test-request-id'
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  describe('createTask', () => {
    it('should create a task successfully', async () => {
      const task: Task = {
        id: uuidv4(),
        tenant_id: 'tenant1',
        workspace_id: 'workspace1',
        title: 'Test Task',
        priority: TaskPriority.MEDIUM,
        state: TaskState.NEW,
        assignee_id: null,
        version: 1,
        created_at: new Date(),
        updated_at: new Date()
      };

      createTaskCommand.execute.mockResolvedValue(task);
      mockRequest.params = { workspaceId: 'workspace1' };
      mockRequest.body = { title: 'Test Task', priority: TaskPriority.MEDIUM };

      await handlers.createTask(mockRequest as AuthRequest, mockResponse as Response, next);

      expect(createTaskCommand.execute).toHaveBeenCalledWith(
        'tenant1',
        'workspace1',
        { title: 'Test Task', priority: TaskPriority.MEDIUM },
        undefined
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 201,
        id: task.id,
        state: task.state,
        version: task.version
      });
    });

    it('should handle idempotency key', async () => {
      const task: Task = {
        id: uuidv4(),
        tenant_id: 'tenant1',
        workspace_id: 'workspace1',
        title: 'Test Task',
        priority: TaskPriority.MEDIUM,
        state: TaskState.NEW,
        assignee_id: null,
        version: 1,
        created_at: new Date(),
        updated_at: new Date()
      };

      createTaskCommand.execute.mockResolvedValue(task);
      mockRequest.params = { workspaceId: 'workspace1' };
      mockRequest.body = { title: 'Test Task' };
      mockRequest.headers = { 'idempotency-key': 'key123' };

      await handlers.createTask(mockRequest as AuthRequest, mockResponse as Response, next);

      expect(createTaskCommand.execute).toHaveBeenCalledWith(
        'tenant1',
        'workspace1',
        { title: 'Test Task', priority: undefined },
        'key123'
      );
    });

    it('should return 400 for validation errors', async () => {
      createTaskCommand.execute.mockRejectedValue(new Error('Title is required'));

      mockRequest.params = { workspaceId: 'workspace1' };
      mockRequest.body = { title: '' };

      await handlers.createTask(mockRequest as AuthRequest, mockResponse as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('assignTask', () => {
    it('should assign task successfully', async () => {
      const task: Task = {
        id: uuidv4(),
        tenant_id: 'tenant1',
        workspace_id: 'workspace1',
        title: 'Test Task',
        priority: TaskPriority.MEDIUM,
        state: TaskState.NEW,
        assignee_id: 'user2',
        version: 2,
        created_at: new Date(),
        updated_at: new Date()
      };

      assignTaskCommand.execute.mockResolvedValue(task);
      mockRequest.params = { workspaceId: 'workspace1', taskId: task.id };
      mockRequest.body = { assignee_id: 'user2' };
      mockRequest.headers = { 'if-match-version': '1' };

      await handlers.assignTask(mockRequest as AuthRequest, mockResponse as Response, next);

      expect(assignTaskCommand.execute).toHaveBeenCalledWith(
        'tenant1',
        'workspace1',
        task.id,
        { assignee_id: 'user2' },
        Role.MANAGER,
        1
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 200,
        id: task.id,
        assignee_id: task.assignee_id,
        version: task.version
      });
    });

    it('should return 400 if If-Match-Version header is missing', async () => {
      mockRequest.params = { workspaceId: 'workspace1', taskId: uuidv4() };
      mockRequest.body = { assignee_id: 'user2' };
      mockRequest.headers = {};

      await handlers.assignTask(mockRequest as AuthRequest, mockResponse as Response, next);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 400,
        error: 'If-Match-Version header is required',
        request_id: 'test-request-id'
      });
    });

    it('should return 409 on version conflict', async () => {
      assignTaskCommand.execute.mockRejectedValue(new Error('Version conflict'));

      mockRequest.params = { workspaceId: 'workspace1', taskId: uuidv4() };
      mockRequest.body = { assignee_id: 'user2' };
      mockRequest.headers = { 'if-match-version': '1' };

      await handlers.assignTask(mockRequest as AuthRequest, mockResponse as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should return 404 if task not found', async () => {
      assignTaskCommand.execute.mockRejectedValue(new Error('Task not found'));

      mockRequest.params = { workspaceId: 'workspace1', taskId: uuidv4() };
      mockRequest.body = { assignee_id: 'user2' };
      mockRequest.headers = { 'if-match-version': '1' };

      await handlers.assignTask(mockRequest as AuthRequest, mockResponse as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should return 400 if If-Match-Version is not a number', async () => {
      mockRequest.params = { workspaceId: 'workspace1', taskId: uuidv4() };
      mockRequest.body = { assignee_id: 'user2' };
      mockRequest.headers = { 'if-match-version': 'invalid' };

      await handlers.assignTask(mockRequest as AuthRequest, mockResponse as Response, next);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 400,
        error: 'If-Match-Version must be a number',
        request_id: 'test-request-id'
      });
    });
  });

  describe('transitionTask', () => {
    it('should transition task successfully', async () => {
      const task: Task = {
        id: uuidv4(),
        tenant_id: 'tenant1',
        workspace_id: 'workspace1',
        title: 'Test Task',
        priority: TaskPriority.MEDIUM,
        state: TaskState.IN_PROGRESS,
        assignee_id: 'user1',
        version: 2,
        created_at: new Date(),
        updated_at: new Date()
      };

      transitionTaskCommand.execute.mockResolvedValue(task);
      mockRequest.params = { workspaceId: 'workspace1', taskId: task.id };
      mockRequest.body = { to_state: TaskState.IN_PROGRESS };
      mockRequest.headers = { 'if-match-version': '1' };

      await handlers.transitionTask(mockRequest as AuthRequest, mockResponse as Response, next);

      expect(transitionTaskCommand.execute).toHaveBeenCalledWith(
        'tenant1',
        'workspace1',
        task.id,
        { to_state: TaskState.IN_PROGRESS },
        Role.MANAGER,
        'user1',
        1
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 200,
        id: task.id,
        state: task.state,
        version: task.version
      });
    });

    it('should return 409 on invalid transition', async () => {
      transitionTaskCommand.execute.mockRejectedValue(
        new Error('Invalid transition from NEW to DONE for role agent')
      );

      mockRequest.params = { workspaceId: 'workspace1', taskId: uuidv4() };
      mockRequest.body = { to_state: TaskState.DONE };
      mockRequest.headers = { 'if-match-version': '1' };

      await handlers.transitionTask(mockRequest as AuthRequest, mockResponse as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should return 409 on version conflict', async () => {
      transitionTaskCommand.execute.mockRejectedValue(new Error('Version conflict'));

      mockRequest.params = { workspaceId: 'workspace1', taskId: uuidv4() };
      mockRequest.body = { to_state: TaskState.IN_PROGRESS };
      mockRequest.headers = { 'if-match-version': '1' };

      await handlers.transitionTask(mockRequest as AuthRequest, mockResponse as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should return 400 if If-Match-Version header is missing', async () => {
      mockRequest.params = { workspaceId: 'workspace1', taskId: uuidv4() };
      mockRequest.body = { to_state: TaskState.IN_PROGRESS };
      mockRequest.headers = {};

      await handlers.transitionTask(mockRequest as AuthRequest, mockResponse as Response, next);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 400,
        error: 'If-Match-Version header is required',
        request_id: 'test-request-id'
      });
    });

    it('should return 400 if If-Match-Version is not a number', async () => {
      mockRequest.params = { workspaceId: 'workspace1', taskId: uuidv4() };
      mockRequest.body = { to_state: TaskState.IN_PROGRESS };
      mockRequest.headers = { 'if-match-version': 'invalid' };

      await handlers.transitionTask(mockRequest as AuthRequest, mockResponse as Response, next);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 400,
        error: 'If-Match-Version must be a number',
        request_id: 'test-request-id'
      });
    });
  });

  describe('getTask', () => {
    it('should get task with timeline', async () => {
      const task: Task = {
        id: uuidv4(),
        tenant_id: 'tenant1',
        workspace_id: 'workspace1',
        title: 'Test Task',
        priority: TaskPriority.MEDIUM,
        state: TaskState.NEW,
        assignee_id: null,
        version: 1,
        created_at: new Date(),
        updated_at: new Date()
      };

      getTaskQuery.execute.mockResolvedValue({
        task,
        timeline: []
      });

      mockRequest.params = { workspaceId: 'workspace1', taskId: task.id };

      await handlers.getTask(mockRequest as AuthRequest, mockResponse as Response, next);

      expect(getTaskQuery.execute).toHaveBeenCalledWith('tenant1', 'workspace1', task.id);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        code: 200,
        task: expect.objectContaining({
          id: task.id
        })
      }));
    });

    it('should return 404 if task not found', async () => {
      getTaskQuery.execute.mockRejectedValue(new Error('Task not found'));

      mockRequest.params = { workspaceId: 'workspace1', taskId: uuidv4() };

      await handlers.getTask(mockRequest as AuthRequest, mockResponse as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('listTasks', () => {
    it('should list tasks with filters', async () => {
      const tasks: Task[] = [
        {
          id: uuidv4(),
          tenant_id: 'tenant1',
          workspace_id: 'workspace1',
          title: 'Task 1',
          priority: TaskPriority.MEDIUM,
          state: TaskState.NEW,
          assignee_id: null,
          version: 1,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      listTasksQuery.execute.mockResolvedValue({
        tasks,
        nextCursor: undefined
      });

      mockRequest.params = { workspaceId: 'workspace1' };
      mockRequest.query = { state: TaskState.NEW };

      await handlers.listTasks(mockRequest as AuthRequest, mockResponse as Response, next);

      expect(listTasksQuery.execute).toHaveBeenCalledWith('tenant1', 'workspace1', {
        state: TaskState.NEW
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 200,
        tasks: tasks,
        next_cursor: undefined
      });
    });

    it('should pass errors to next', async () => {
      listTasksQuery.execute.mockRejectedValue(new Error('Database error'));
      mockRequest.params = { workspaceId: 'workspace1' };

      await handlers.listTasks(mockRequest as AuthRequest, mockResponse as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
