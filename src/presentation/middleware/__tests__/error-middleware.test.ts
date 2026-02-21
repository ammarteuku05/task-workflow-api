import { Response, NextFunction } from 'express';
import { errorMiddleware } from '../error-middleware';
import { RequestWithId } from '../request-id-middleware';

describe('errorMiddleware', () => {
    let mockRequest: Partial<RequestWithId>;
    let mockResponse: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        mockRequest = {
            requestId: 'test-id',
            path: '/test',
            method: 'GET',
            body: {},
            params: {},
            query: {}
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            headersSent: false
        };
        next = jest.fn();
        // Spying on console.error to avoid cluttering test output
        jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should return 400 for validation errors (required, characters, must be a number)', () => {
        const error = new Error('Title is required');
        errorMiddleware(error, mockRequest as RequestWithId, mockResponse as Response, next);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            code: 400,
            error: 'Title is required',
            request_id: 'test-id'
        });
    });

    it('should return 404 for "Task not found" error', () => {
        const error = new Error('Task not found');
        errorMiddleware(error, mockRequest as RequestWithId, mockResponse as Response, next);

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith({
            code: 404,
            error: 'Task not found',
            request_id: 'test-id'
        });
    });

    it('should return 409 for conflict errors (Version conflict, Invalid transition)', () => {
        const error = new Error('Version conflict');
        errorMiddleware(error, mockRequest as RequestWithId, mockResponse as Response, next);

        expect(mockResponse.status).toHaveBeenCalledWith(409);
        expect(mockResponse.json).toHaveBeenCalledWith({
            code: 409,
            error: 'Version conflict',
            request_id: 'test-id'
        });
    });

    it('should return 403 for forbidden errors (Only managers, Cannot assign)', () => {
        const error = new Error('Only managers can cancel tasks');
        errorMiddleware(error, mockRequest as RequestWithId, mockResponse as Response, next);

        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
            code: 403,
            error: 'Only managers can cancel tasks',
            request_id: 'test-id'
        });
    });

    it('should return 500 for generic errors', () => {
        const error = new Error('Something went wrong');
        errorMiddleware(error, mockRequest as RequestWithId, mockResponse as Response, next);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
            code: 500,
            error: 'Internal server error',
            request_id: 'test-id'
        });
    });

    it('should call next(err) if headers are already sent', () => {
        const error = new Error('Already sent');
        mockResponse.headersSent = true;
        errorMiddleware(error, mockRequest as RequestWithId, mockResponse as Response, next);

        expect(next).toHaveBeenCalledWith(error);
        expect(mockResponse.status).not.toHaveBeenCalled();
    });
});
