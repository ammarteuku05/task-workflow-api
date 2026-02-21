import { EventHandlers } from '../event-handlers';
import { GetEventsQueryHandler } from '../../../application/queries/get-events-query';
import { TaskEvent, TaskEventType } from '../../../domain/types';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

describe('EventHandlers', () => {
  let handlers: EventHandlers;
  let getEventsQuery: jest.Mocked<GetEventsQueryHandler>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    getEventsQuery = {
      execute: jest.fn()
    } as any;

    handlers = new EventHandlers(getEventsQuery);

    mockRequest = {
      query: {}
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  describe('getEvents', () => {
    it('should get events successfully', async () => {
      const events: TaskEvent[] = [
        {
          id: uuidv4(),
          task_id: uuidv4(),
          tenant_id: 'tenant1',
          workspace_id: 'workspace1',
          event_type: TaskEventType.TASK_CREATED,
          payload: { title: 'Test Task' },
          created_at: new Date()
        }
      ];

      getEventsQuery.execute.mockResolvedValue(events);

      await handlers.getEvents(mockRequest as Request, mockResponse as Response, next);

      expect(getEventsQuery.execute).toHaveBeenCalledWith(50);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ code: 200, events });
    });

    it('should respect limit query parameter', async () => {
      const events: TaskEvent[] = [];

      getEventsQuery.execute.mockResolvedValue(events);
      mockRequest.query = { limit: '10' };

      await handlers.getEvents(mockRequest as Request, mockResponse as Response, next);

      expect(getEventsQuery.execute).toHaveBeenCalledWith(10);
    });

    it('should call next on error', async () => {
      getEventsQuery.execute.mockRejectedValue(new Error('Test error'));

      await handlers.getEvents(mockRequest as Request, mockResponse as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
