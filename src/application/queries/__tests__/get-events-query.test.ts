import { GetEventsQueryHandler } from '../get-events-query';
import { TaskEventRepository } from '../../../infrastructure/repositories/task-event-repository';
import { TaskEvent, TaskEventType } from '../../../domain/types';
import { v4 as uuidv4 } from 'uuid';

describe('GetEventsQueryHandler', () => {
  let query: GetEventsQueryHandler;
  let eventRepo: jest.Mocked<TaskEventRepository>;

  beforeEach(() => {
    eventRepo = {
      findAll: jest.fn(),
      countAll: jest.fn()
    } as any;

    query = new GetEventsQueryHandler(eventRepo);
  });

  describe('execute', () => {
    it('should get events with default limit', async () => {
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

      eventRepo.findAll.mockReturnValue(events);
      eventRepo.countAll.mockReturnValue(1);

      const result = await query.execute();

      expect(eventRepo.findAll).toHaveBeenCalledWith(50, 0);
      expect(eventRepo.countAll).toHaveBeenCalled();
      expect(result).toEqual({
        events,
        total: 1,
        limit: 50,
        offset: 0
      });
    });

    it('should get events with custom limit and offset', async () => {
      const events: TaskEvent[] = [];

      eventRepo.findAll.mockReturnValue(events);
      eventRepo.countAll.mockReturnValue(100);

      const result = await query.execute(10, 20);

      expect(eventRepo.findAll).toHaveBeenCalledWith(10, 20);
      expect(eventRepo.countAll).toHaveBeenCalled();
      expect(result).toEqual({
        events,
        total: 100,
        limit: 10,
        offset: 20
      });
    });
  });
});
