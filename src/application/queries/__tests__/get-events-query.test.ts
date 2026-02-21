import { GetEventsQueryHandler } from '../get-events-query';
import { TaskEventRepository } from '../../../infrastructure/repositories/task-event-repository';
import { TaskEvent, TaskEventType } from '../../../domain/types';
import { v4 as uuidv4 } from 'uuid';

describe('GetEventsQueryHandler', () => {
  let query: GetEventsQueryHandler;
  let eventRepo: jest.Mocked<TaskEventRepository>;

  beforeEach(() => {
    eventRepo = {
      findAll: jest.fn()
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

      const result = await query.execute();

      expect(eventRepo.findAll).toHaveBeenCalledWith(50);
      expect(result).toEqual(events);
    });

    it('should get events with custom limit', async () => {
      const events: TaskEvent[] = [];

      eventRepo.findAll.mockReturnValue(events);

      const result = await query.execute(100);

      expect(eventRepo.findAll).toHaveBeenCalledWith(100);
      expect(result).toEqual(events);
    });
  });
});
