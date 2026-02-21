# Task Workflow API
## Installation

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on port 3000 (or the port specified in the `PORT` environment variable).

### Using Docker Compose 
1. Start the application:
```bash
docker compose up -d
```

### Using Docker
1. Build the image:
```bash
docker build -t task-workflow-api .
```

2. Run the container:
```bash
docker run -p 3000:3000 -v task-workflow-api:latest
```

## Testing

### Run all tests
```bash
npm test
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Verify 80% coverage threshold
```bash
npm run test:coverage:check
```

## API Endpoints

### 1. Create Task (Idempotent)

**POST** `/v1/workspaces/:workspaceId/tasks`

**Headers:**
- `X-Tenant-Id`: Tenant identifier (required)
- `X-Role`: `agent` or `manager` (required)
- `Idempotency-Key`: Optional idempotency key

**Body:**
```json
{
  "title": "Follow up customer",
  "priority": "LOW|MEDIUM|HIGH"
}
```

**Response:**
```json
{
  "id": "uuid",
  "state": "NEW",
  "version": 1
}
```

### 2. Assign Task

**POST** `/v1/workspaces/:workspaceId/tasks/:taskId/assign`

**Headers:**
- `X-Tenant-Id`: Tenant identifier (required)
- `X-Role`: `manager` (required)
- `If-Match-Version`: Current task version (required)

**Body:**
```json
{
  "assignee_id": "u_123"
}
```

**Response:**
```json
{
  "id": "uuid",
  "assignee_id": "u_123",
  "version": 2
}
```

### 3. Transition Task State

**POST** `/v1/workspaces/:workspaceId/tasks/:taskId/transition`

**Headers:**
- `X-Tenant-Id`: Tenant identifier (required)
- `X-Role`: `agent` or `manager` (required)
- `X-User-Id`: User identifier (required for agent role)
- `If-Match-Version`: Current task version (required)

**Body:**
```json
{
  "to_state": "IN_PROGRESS|DONE|CANCELLED"
}
```

**Response:**
```json
{
  "id": "uuid",
  "state": "IN_PROGRESS",
  "version": 2
}
```

### 4. Get Task with Timeline

**GET** `/v1/workspaces/:workspaceId/tasks/:taskId`

**Headers:**
- `X-Tenant-Id`: Tenant identifier (required)
- `X-Role`: `agent` or `manager` (required)

**Response:**
```json
{
  "task": {
    "id": "uuid",
    "tenant_id": "tenant1",
    "workspace_id": "workspace1",
    "title": "Follow up customer",
    "priority": "MEDIUM",
    "state": "NEW",
    "assignee_id": null,
    "version": 1,
    "created_at": "2026-02-20T10:00:00.000Z",
    "updated_at": "2026-02-20T10:00:00.000Z"
  },
  "timeline": [
    {
      "id": "uuid",
      "event_type": "TaskCreated",
      "payload": {
        "title": "Follow up customer",
        "priority": "MEDIUM"
      },
      "created_at": "2026-02-20T10:00:00.000Z"
    }
  ]
}
```

### 5. List Tasks

**GET** `/v1/workspaces/:workspaceId/tasks?state=IN_PROGRESS&assignee_id=u_123&limit=20&cursor=...`

**Headers:**
- `X-Tenant-Id`: Tenant identifier (required)
- `X-Role`: `agent` or `manager` (required)

**Query Parameters:**
- `state`: Filter by state (optional)
- `assignee_id`: Filter by assignee (optional)
- `limit`: Number of results (default: 20)
- `cursor`: Pagination cursor (optional)

**Response:**
```json
{
  "tasks": [...],
  "next_cursor": "base64-encoded-cursor"
}
```

### 6. Get Events

**GET** `/v1/events?limit=50`

**Response:**
```json
{
  "events": [
    {
      "id": "uuid",
      "task_id": "uuid",
      "tenant_id": "tenant1",
      "workspace_id": "workspace1",
      "event_type": "TaskCreated",
      "payload": {...},
      "created_at": "2026-02-20T10:00:00.000Z"
    }
  ]
}
```

## Sample cURL Commands

### Create a Task
```bash
curl -X POST http://localhost:3000/v1/workspaces/ws1/tasks \
  -H "X-Tenant-Id: tenant1" \
  -H "X-Role: manager" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Follow up customer",
    "priority": "HIGH"
  }'
```

### Create Task with Idempotency Key
```bash
curl -X POST http://localhost:3000/v1/workspaces/ws1/tasks \
  -H "X-Tenant-Id: tenant1" \
  -H "X-Role: manager" \
  -H "Idempotency-Key: unique-key-123" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Follow up customer",
    "priority": "MEDIUM"
  }'
```

### Assign Task
```bash
curl -X POST http://localhost:3000/v1/workspaces/ws1/tasks/{taskId}/assign \
  -H "X-Tenant-Id: tenant1" \
  -H "X-Role: manager" \
  -H "If-Match-Version: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "assignee_id": "u_123"
  }'
```

### Transition Task State (Agent)
```bash
curl -X POST http://localhost:3000/v1/workspaces/ws1/tasks/{taskId}/transition \
  -H "X-Tenant-Id: tenant1" \
  -H "X-Role: agent" \
  -H "X-User-Id: u_123" \
  -H "If-Match-Version: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "to_state": "IN_PROGRESS"
  }'
```

### Transition Task State (Manager - Cancel)
```bash
curl -X POST http://localhost:3000/v1/workspaces/ws1/tasks/{taskId}/transition \
  -H "X-Tenant-Id: tenant1" \
  -H "X-Role: manager" \
  -H "If-Match-Version: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "to_state": "CANCELLED"
  }'
```

### Get Task with Timeline
```bash
curl -X GET http://localhost:3000/v1/workspaces/ws1/tasks/{taskId} \
  -H "X-Tenant-Id: tenant1" \
  -H "X-Role: manager"
```

### List Tasks
```bash
curl -X GET "http://localhost:3000/v1/workspaces/ws1/tasks?state=IN_PROGRESS&assignee_id=u_123&limit=20" \
  -H "X-Tenant-Id: tenant1" \
  -H "X-Role: manager"
```

### Get Events
```bash
curl -X GET "http://localhost:3000/v1/events?limit=50"
```

## Database Schema
### Tasks Table
- `id` (TEXT, PRIMARY KEY)
- `tenant_id` (TEXT, NOT NULL)
- `workspace_id` (TEXT, NOT NULL)
- `title` (TEXT, NOT NULL, max 120 chars)
- `priority` (TEXT: LOW|MEDIUM|HIGH)
- `state` (TEXT: NEW|IN_PROGRESS|DONE|CANCELLED)
- `assignee_id` (TEXT, nullable)
- `version` (INTEGER, for optimistic locking)
- `created_at` (DATETIME)
- `updated_at` (DATETIME)

### Task Events Table (Outbox)
- `id` (TEXT, PRIMARY KEY)
- `task_id` (TEXT, NOT NULL)
- `tenant_id` (TEXT, NOT NULL)
- `workspace_id` (TEXT, NOT NULL)
- `event_type` (TEXT: TaskCreated|TaskAssigned|TaskStateChanged)
- `payload` (TEXT, JSON)
- `created_at` (DATETIME)

### Idempotency Keys Table
- `id` (TEXT, PRIMARY KEY)
- `task_id` (TEXT, NOT NULL)
- `tenant_id` (TEXT, NOT NULL)
- `workspace_id` (TEXT, NOT NULL)
- `created_at` (DATETIME)