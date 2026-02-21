import { TaskState, Role } from './types';

export class StateMachine {
  private static readonly VALID_TRANSITIONS: Map<TaskState, TaskState[]> = new Map([
    [TaskState.NEW, [TaskState.IN_PROGRESS, TaskState.CANCELLED]],
    [TaskState.IN_PROGRESS, [TaskState.DONE, TaskState.CANCELLED]],
    [TaskState.DONE, []],
    [TaskState.CANCELLED, []]
  ]);

  static isValidTransition(from: TaskState, to: TaskState): boolean {
    const allowedStates = this.VALID_TRANSITIONS.get(from) || [];
    return allowedStates.includes(to);
  }

  static canAgentTransition(
    from: TaskState,
    to: TaskState,
    assigneeId: string | null,
    currentUserId: string
  ): boolean {
    if (!this.isValidTransition(from, to)) {
      return false;
    }

    // Agent can only transition if task is assigned to them
    if (assigneeId !== currentUserId) {
      return false;
    }

    // Agent can only do: NEW -> IN_PROGRESS, IN_PROGRESS -> DONE
    return (
      (from === TaskState.NEW && to === TaskState.IN_PROGRESS) ||
      (from === TaskState.IN_PROGRESS && to === TaskState.DONE)
    );
  }

  static canManagerTransition(from: TaskState, to: TaskState): boolean {
    if (!this.isValidTransition(from, to)) {
      return false;
    }

    // Manager can cancel NEW or IN_PROGRESS
    return (
      (from === TaskState.NEW && to === TaskState.CANCELLED) ||
      (from === TaskState.IN_PROGRESS && to === TaskState.CANCELLED)
    );
  }

  static canAssign(state: TaskState): boolean {
    return state === TaskState.NEW || state === TaskState.IN_PROGRESS;
  }
}
