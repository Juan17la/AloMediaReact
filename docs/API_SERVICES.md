# API Services

## Overview

AloMedia communicates with a REST backend for authentication, project management, and AI media processing. The HTTP layer is a thin wrapper around `fetch` with unified error handling, cookie-based JWT authentication, and TypeScript generics for type-safe responses.

## HTTP Client

**File:** `src/api/http.ts`

The `http<T>()` function is the single entry point for all API calls:

```typescript
http<T>(path: string, options?: RequestInit & { parse?: boolean }): Promise<T>
```

### Features
- Automatically prepends `VITE_BASE_URL` to paths
- Sends `credentials: "include"` for cookie-based auth
- Sets `Content-Type: application/json` by default
- Parses JSON responses and throws `ApiError` on non-2xx status codes
- Supports `parse: false` for void responses (e.g., logout, delete)

### Error Handling

**File:** `src/api/errors.ts`

```typescript
class ApiError extends Error {
  message: string
  statusCode: number
  errors: FieldError[]  // per-field validation errors
}

interface FieldError {
  field: string
  message: string
}
```

Components can check `error.statusCode` to show specific UI messages (e.g., 401 -> redirect to login, 422 -> show field errors).

---

## Authentication API

**File:** `src/services/authService.ts`

All auth endpoints use the base HTTP client. JWT tokens are stored in cookies via `js-cookie`.

### Endpoints

| Function | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| `signIn(payload)` | POST | `/auth/login` | Authenticates user, stores JWT cookie |
| `signUp(payload)` | POST | `/auth/register` | Creates account, stores JWT cookie |
| `me()` | GET | `/auth/me` | Returns current user profile |
| `signout()` | POST | `/auth/logout` | Ends session, removes JWT cookie |
| `recoverRequest(payload)` | POST | `/auth/recover/request` | Sends password recovery email |
| `validateRecoverToken(token)` | GET | `/auth/recover/validate?token=` | Checks if recovery token is valid |
| `recoverReset(payload)` | POST | `/auth/recover/reset` | Resets password with token |

### Type Definitions

**File:** `src/types/authTypes.ts`

```typescript
interface LoginPayload { email: string; password: string }
interface RegisterPayload { firstName: string; lastName: string; email: string; password: string }
interface AuthResponse { token: string; id: number; firstName: string; lastName: string; email: string; role: 'USER' | 'ADMIN' }
interface MeResponse { authenticated: boolean; user: User | null }
interface RecoverRequestPayload { email: string }
interface RecoverResetPayload { token: string; newPassword: string; confirmPassword: string }
```

### Auth Header Pattern

The auth service reads the `token` cookie and injects it as an `Authorization: Bearer <token>` header. This pattern is duplicated in `projectService.ts` because both services need auth headers independently.

---

## Project API

**File:** `src/services/projectService.ts`

### Endpoints

| Function | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| `getOwnProjects(page, size, sort?)` | GET | `/projects?page=&size=&sort=` | Paginated list of user's projects |
| `getSharedProjects(page, size, sort?)` | GET | `/projects/shared?page=&size=&sort=` | Paginated list of projects shared with user |
| `getProjectById(id)` | GET | `/projects/{id}` | Load a single project with timeline data |
| `createProject(data)` | POST | `/projects` | Create new project |
| `updateProject(id, data)` | PATCH | `/projects/{id}` | Update project name/timeline/status |
| `deleteProject(id)` | DELETE | `/projects/{id}` | Delete project |
| `shareProject(id, email)` | POST | `/projects/{id}/share` | Share project with user by email |

### Type Definitions

**File:** `src/types/projectApiTypes.ts`

```typescript
interface ApiProject {
  id: number
  name: string
  status: 'DRAFT' | 'SHARED' | 'ARCHIVED'
  timelineData: string          // JSON-serialized Project
  ownerId: number
  createdAt: string
  updatedAt: string
}

interface PaginatedResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

interface CreateProjectInput {
  name: string
  timelineData?: string
}

interface UpdateProjectInput {
  name?: string
  timelineData?: string
  status?: 'DRAFT' | 'SHARED' | 'ARCHIVED'
}
```

### Serialization Flow

1. **Save:** `Project` -> `serializeTimeline()` -> `timelineData` string -> `updateProject()`
2. **Load:** `getProjectById()` -> `timelineData` string -> `deserializeTimeline()` -> `Project`
3. **Local JSON Export:** `Project` -> `saveProject()` -> `SavedProject` -> JSON blob -> download
4. **Local JSON Import:** File read -> `loadProject()` -> `Project` -> store

---

## AI Media API

**File:** `src/api/aiMedia.ts`

AI endpoints use multipart/form-data upload because they process binary media files. The base `http()` client is NOT used here; instead, a dedicated `fetch` wrapper (`postFormBlob`) handles multipart requests.

### Endpoints

| Function | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| `cleanAudio(file)` | POST | `/ai/audio/clean` | Removes noise from audio file. Returns cleaned audio blob. |
| `transcribeAudio(file)` | POST | `/ai/audio/transcribe` | Transcribes audio to SRT subtitles. Returns SRT file blob. |

### Usage Flow

1. User selects a media item in the library
2. Clicks "AI Tools" to open `AiToolsModal`
3. Chooses "Clean Audio" or "Transcribe"
4. Frontend uploads the original `File` from `fileMap`
5. Backend processes and returns a new blob
6. Frontend imports the result as new media in the project

### Important Notes

- `Content-Type` must NOT be set manually for multipart requests. The browser sets `multipart/form-data; boundary=...` automatically.
- JSON metadata (like `formats: ["srt"]`) is appended as a JSON blob within the form.
- Auth header is injected from the `token` cookie, same as other endpoints.

---

## Export Server API

**File:** `src/engine/exportPipeline/serverEncoder.ts`

The export server is a separate service (typically deployed on Railway) that runs FFmpeg server-side. It has its own API surface:

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Returns server availability, GPU acceleration status, and codec info |
| `/api/export` | POST | Submits a render job with plan JSON + media files as multipart |
| `/api/export/{id}/status` | GET | Polls job progress (status, percent, frames processed) |
| `/api/export/{id}/download` | GET | Downloads the finished video file |
| `/api/export/{id}` | DELETE | Cancels an in-progress job |

### Health Check Response

```typescript
interface EngineCapabilities {
  available: boolean
  gpuAccel: boolean
  gpuCodec: string | null
  maxConcurrentJobs: number
}
```

### Job Status Polling

The frontend polls every 500ms until the job reaches `done` or `failed`. The server status is mapped to frontend `JobStatus` enum for consistent progress display.

---

## Request/Response Patterns

### Standard Pattern

```typescript
// GET with auth
const projects = await getOwnProjects(0, 10, "updatedAt,desc")

// POST with body
const newProject = await createProject({ name: "My Video", timelineData: "{}" })

// DELETE (void response)
await deleteProject(123)
```

### Error Handling Pattern

```typescript
try {
  await signIn({ email, password })
} catch (error) {
  if (error instanceof ApiError) {
    if (error.statusCode === 401) {
      showToast("Invalid credentials")
    } else if (error.statusCode === 422) {
      showFieldErrors(error.errors)
    }
  }
}
```

### File Upload Pattern

```typescript
const form = new FormData()
form.append("file", file)
form.append("formats", new Blob([JSON.stringify(["srt"])], { type: "application/json" }), "formats.json")

const blob = await postFormBlob("/ai/audio/transcribe", form)
```

---

## Environment Configuration

| Variable | Required | Default | Used By |
|----------|----------|---------|---------|
| `VITE_BASE_URL` | Yes | — | `http.ts`, `aiMedia.ts` |
| `VITE_EXPORT_SERVER_URL` | No | `""` | `serverEncoder.ts` |

If `VITE_EXPORT_SERVER_URL` is empty or the server is unavailable, export falls back to WASM client-side encoding.

---

## CORS and Security

- The backend must allow credentials (`Access-Control-Allow-Credentials: true`) because the client sends `credentials: "include"`.
- The backend must echo the `Origin` in `Access-Control-Allow-Origin` (not `*`) when credentials are used.
- JWT tokens are stored in cookies with `HttpOnly` ideally (currently client-side via js-cookie; migration to HttpOnly + refresh token pattern is recommended).

---

## Future API Considerations

1. **WebSocket for real-time collaboration** — Currently projects are not real-time collaborative. A WebSocket layer could enable live cursor sharing and conflict resolution.
2. **Presigned URLs for large uploads** — For AI media and export server, direct-to-S3 uploads would reduce server bandwidth.
3. **GraphQL for dashboard queries** — As project lists grow, GraphQL could reduce over-fetching of timeline data on the dashboard.
4. **Export webhook callbacks** — Instead of polling the export server, webhooks could notify the client when a job completes.
