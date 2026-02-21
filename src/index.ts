import express from 'express';
import { getDatabase } from './infrastructure/database/database';
import { TaskRepository } from './infrastructure/repositories/task-repository';
import { TaskEventRepository } from './infrastructure/repositories/task-event-repository';
import { IdempotencyRepository } from './infrastructure/repositories/idempotency-repository';
import { CreateTaskCommandHandler } from './application/commands/create-task-command';
import { AssignTaskCommandHandler } from './application/commands/assign-task-command';
import { TransitionTaskCommandHandler } from './application/commands/transition-task-command';
import { GetTaskQueryHandler } from './application/queries/get-task-query';
import { ListTasksQueryHandler } from './application/queries/list-tasks-query';
import { GetEventsQueryHandler } from './application/queries/get-events-query';
import { TaskHandlers } from './presentation/handlers/task-handlers';
import { EventHandlers } from './presentation/handlers/event-handlers';
import { createTaskRoutes } from './presentation/routes/task-routes';
import { createEventRoutes } from './presentation/routes/event-routes';
import { requestIdMiddleware } from './presentation/middleware/request-id-middleware';
import { errorMiddleware } from './presentation/middleware/error-middleware';

const app = express();
app.use(express.json());
app.use(requestIdMiddleware);

// Initialize database
const db = getDatabase();

// Initialize repositories
const taskRepo = new TaskRepository(db);
const eventRepo = new TaskEventRepository(db);
const idempotencyRepo = new IdempotencyRepository(db);

// Initialize commands
const createTaskCommand = new CreateTaskCommandHandler(taskRepo, idempotencyRepo, eventRepo, db);
const assignTaskCommand = new AssignTaskCommandHandler(taskRepo, eventRepo, db);
const transitionTaskCommand = new TransitionTaskCommandHandler(taskRepo, eventRepo, db);

// Initialize queries
const getTaskQuery = new GetTaskQueryHandler(taskRepo, eventRepo);
const listTasksQuery = new ListTasksQueryHandler(taskRepo);
const getEventsQuery = new GetEventsQueryHandler(eventRepo);

// Initialize handlers
const taskHandlers = new TaskHandlers(
  createTaskCommand,
  assignTaskCommand,
  transitionTaskCommand,
  getTaskQuery,
  listTasksQuery
);
const eventHandlers = new EventHandlers(getEventsQuery);

// Setup routes
app.use('/v1', createTaskRoutes(taskHandlers));
app.use('/v1', createEventRoutes(eventHandlers));

// Error handling middleware
app.use(errorMiddleware);

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
