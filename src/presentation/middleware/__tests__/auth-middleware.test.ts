import { authMiddleware, AuthRequest } from '../auth-middleware';
import { Response, NextFunction } from 'express';

describe('authMiddleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      requestId: undefined
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    nextFunction = jest.fn();
  });

  it('should set tenantId and role when headers are present', () => {
    mockRequest.headers = {
      'x-tenant-id': 'tenant1',
      'x-role': 'manager'
    };

    authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(mockRequest.tenantId).toBe('tenant1');
    expect(mockRequest.role).toBe('manager');
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should return 400 if X-Tenant-Id is missing', () => {
    mockRequest.headers = {
      'x-role': 'manager'
    };

    authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      code: 400,
      error: 'X-Tenant-Id header is required',
      request_id: undefined
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 400 if X-Role is missing', () => {
    mockRequest.headers = {
      'x-tenant-id': 'tenant1'
    };

    authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      code: 400,
      error: 'X-Role header must be "agent" or "manager"',
      request_id: undefined
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 400 if X-Role is invalid', () => {
    mockRequest.headers = {
      'x-tenant-id': 'tenant1',
      'x-role': 'invalid'
    };

    authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      code: 400,
      error: 'X-Role header must be "agent" or "manager"',
      request_id: undefined
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should accept agent role', () => {
    mockRequest.headers = {
      'x-tenant-id': 'tenant1',
      'x-role': 'agent'
    };

    authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(mockRequest.role).toBe('agent');
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should set userId from header if provided', () => {
    mockRequest.headers = {
      'x-tenant-id': 'tenant1',
      'x-role': 'manager',
      'x-user-id': 'user123'
    };

    authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(mockRequest.userId).toBe('user123');
  });

  it('should default userId to system if not provided', () => {
    mockRequest.headers = {
      'x-tenant-id': 'tenant1',
      'x-role': 'manager'
    };

    authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(mockRequest.userId).toBe('system');
  });
});
