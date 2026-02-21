export enum TaskState {
  NEW = 'NEW',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED'
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export enum Role {
  AGENT = 'agent',
  MANAGER = 'manager'
}

export enum TaskEventType {
  TASK_CREATED = 'TaskCreated',
  TASK_ASSIGNED = 'TaskAssigned',
  TASK_STATE_CHANGED = 'TaskStateChanged'
}

export interface Task {
  id: string;
  tenant_id: string;
  workspace_id: string;
  title: string;
  priority: TaskPriority;
  state: TaskState;
  assignee_id: string | null;
  version: number;
  created_at: Date;
  updated_at: Date;
}

export interface TaskEvent {
  id: string;
  task_id: string;
  tenant_id: string;
  workspace_id: string;
  event_type: TaskEventType;
  payload: Record<string, any>;
  created_at: Date;
}

export interface IdempotencyKey {
  id: string;
  task_id: string;
  tenant_id: string;
  workspace_id: string;
  created_at: Date;
}
