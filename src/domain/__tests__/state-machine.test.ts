import { StateMachine } from '../state-machine';
import { TaskState } from '../types';

describe('StateMachine', () => {
  describe('isValidTransition', () => {
    it('should allow NEW -> IN_PROGRESS', () => {
      expect(StateMachine.isValidTransition(TaskState.NEW, TaskState.IN_PROGRESS)).toBe(true);
    });

    it('should allow NEW -> CANCELLED', () => {
      expect(StateMachine.isValidTransition(TaskState.NEW, TaskState.CANCELLED)).toBe(true);
    });

    it('should allow IN_PROGRESS -> DONE', () => {
      expect(StateMachine.isValidTransition(TaskState.IN_PROGRESS, TaskState.DONE)).toBe(true);
    });

    it('should allow IN_PROGRESS -> CANCELLED', () => {
      expect(StateMachine.isValidTransition(TaskState.IN_PROGRESS, TaskState.CANCELLED)).toBe(true);
    });

    it('should reject NEW -> DONE', () => {
      expect(StateMachine.isValidTransition(TaskState.NEW, TaskState.DONE)).toBe(false);
    });

    it('should reject DONE -> IN_PROGRESS', () => {
      expect(StateMachine.isValidTransition(TaskState.DONE, TaskState.IN_PROGRESS)).toBe(false);
    });

    it('should reject CANCELLED -> NEW', () => {
      expect(StateMachine.isValidTransition(TaskState.CANCELLED, TaskState.NEW)).toBe(false);
    });
  });

  describe('canAgentTransition', () => {
    it('should allow agent to transition NEW -> IN_PROGRESS if assigned to them', () => {
      expect(
        StateMachine.canAgentTransition(
          TaskState.NEW,
          TaskState.IN_PROGRESS,
          'user1',
          'user1'
        )
      ).toBe(true);
    });

    it('should reject agent transition if task not assigned to them', () => {
      expect(
        StateMachine.canAgentTransition(
          TaskState.NEW,
          TaskState.IN_PROGRESS,
          'user2',
          'user1'
        )
      ).toBe(false);
    });

    it('should reject agent transition if task is unassigned', () => {
      expect(
        StateMachine.canAgentTransition(
          TaskState.NEW,
          TaskState.IN_PROGRESS,
          null,
          'user1'
        )
      ).toBe(false);
    });

    it('should allow agent to transition IN_PROGRESS -> DONE if assigned to them', () => {
      expect(
        StateMachine.canAgentTransition(
          TaskState.IN_PROGRESS,
          TaskState.DONE,
          'user1',
          'user1'
        )
      ).toBe(true);
    });

    it('should reject agent transition NEW -> CANCELLED', () => {
      expect(
        StateMachine.canAgentTransition(
          TaskState.NEW,
          TaskState.CANCELLED,
          'user1',
          'user1'
        )
      ).toBe(false);
    });
  });

  describe('canManagerTransition', () => {
    it('should allow manager to cancel NEW task', () => {
      expect(
        StateMachine.canManagerTransition(TaskState.NEW, TaskState.CANCELLED)
      ).toBe(true);
    });

    it('should allow manager to cancel IN_PROGRESS task', () => {
      expect(
        StateMachine.canManagerTransition(TaskState.IN_PROGRESS, TaskState.CANCELLED)
      ).toBe(true);
    });

    it('should reject manager transition NEW -> IN_PROGRESS', () => {
      expect(
        StateMachine.canManagerTransition(TaskState.NEW, TaskState.IN_PROGRESS)
      ).toBe(false);
    });

    it('should reject manager transition DONE -> CANCELLED', () => {
      expect(
        StateMachine.canManagerTransition(TaskState.DONE, TaskState.CANCELLED)
      ).toBe(false);
    });
  });

  describe('canAssign', () => {
    it('should allow assignment for NEW state', () => {
      expect(StateMachine.canAssign(TaskState.NEW)).toBe(true);
    });

    it('should allow assignment for IN_PROGRESS state', () => {
      expect(StateMachine.canAssign(TaskState.IN_PROGRESS)).toBe(true);
    });

    it('should reject assignment for DONE state', () => {
      expect(StateMachine.canAssign(TaskState.DONE)).toBe(false);
    });

    it('should reject assignment for CANCELLED state', () => {
      expect(StateMachine.canAssign(TaskState.CANCELLED)).toBe(false);
    });
  });
});
