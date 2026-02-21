import { Router } from 'express';
import { TaskHandlers } from '../handlers/task-handlers';
import { authMiddleware } from '../middleware/auth-middleware';

export function createTaskRoutes(handlers: TaskHandlers): Router {
  const router = Router();

  router.post('/workspaces/:workspaceId/tasks', authMiddleware, (req, res, next) => {
    handlers.createTask(req as any, res, next);
  });

  router.post('/workspaces/:workspaceId/tasks/:taskId/assign', authMiddleware, (req, res, next) => {
    handlers.assignTask(req as any, res, next);
  });

  router.post('/workspaces/:workspaceId/tasks/:taskId/transition', authMiddleware, (req, res, next) => {
    handlers.transitionTask(req as any, res, next);
  });

  router.get('/workspaces/:workspaceId/tasks/:taskId', authMiddleware, (req, res, next) => {
    handlers.getTask(req as any, res, next);
  });

  router.get('/workspaces/:workspaceId/tasks', authMiddleware, (req, res, next) => {
    handlers.listTasks(req as any, res, next);
  });

  return router;
}
