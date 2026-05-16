# Court Case Management System — REST API

A backend REST API for managing the lifecycle of judicial cases — registering cases, assigning judges, scheduling hearings, and recording outcomes. Built with Node.js, Express, and MongoDB, secured with JWT authentication and role-based authorization.

---

## Features

- Role-based access control: **admin**, **lawyer**, **judge**
- JWT authentication with access tokens (15 min) and refresh tokens
- Secure password hashing using bcryptjs
- Full case lifecycle: create, list, view, update, assign judge, close
- Hearing scheduling with per-judge date/time conflict detection
- Cascading status update — when a hearing is marked `Completed`, the parent case is automatically `Closed`


---
## Run the Server
npm start

The API will be available at http://localhost:5000.

Data Models
User
name, email (unique), passwordHash, phone
role: "admin" | "lawyer" | "judge"
createdAt, updatedAt
Case
caseNumber (unique), title, description, applicant, respondent
caseType: "civil" | "criminal" | "commercial"
filedDate, status (Pending | Ongoing | Closed)
lawyerId → User, assignedJudgeId → User (nullable)
Hearing
caseId → Case, judgeId → User
hearingDate, hearingTime (HH:MM), location, description
status: "Scheduled" | "Completed" | "Adjourned" | "Postponed"
outcome, notes
API Reference
All endpoints are mounted under /api. Protected routes require the header
Authorization: Bearer <accessToken>.

Health
Method	Endpoint	Description
GET	/	Welcome message
GET	/api/health	Verbose health check
GET	/api/healthz	Lightweight liveness
Authentication
Method	Endpoint	Auth	Description
POST	/api/auth/register	No	Create a new user
POST	/api/auth/login	No	Issue access + refresh tokens
POST	/api/auth/refresh	Yes	Rotate access token
Users
Method	Endpoint	Roles	Description
GET	/api/users	admin	List users (paginated)
GET	/api/users/:userId	any logged-in user	Get a single user
PUT	/api/users/:userId	self	Update profile / password
Cases
Method	Endpoint	Roles	Description
POST	/api/cases	admin, lawyer, judge	Create a case
GET	/api/cases	any logged-in user	List cases (paginated, filterable)
GET	/api/cases/:caseId	any logged-in user	Get a single case
PUT	/api/cases/:caseId	admin, owning lawyer	Update case fields
POST	/api/cases/:caseId/assign	admin	Assign a judge
GET	/api/cases/:caseId/hearings	any logged-in user	List hearings for a case
Hearings
Method	Endpoint	Roles	Description
POST	/api/hearings	admin, judge	Schedule a hearing
GET	/api/hearings/:hearingId	logged-in user	Get a single hearing
PUT	/api/hearings/:hearingId/outcome	assigned judge	Record outcome — auto-closes case if Completed


## Example Requests
Register a lawyer
POST /api/auth/register
Content-Type: application/json
{
  "name": "Lawyer User",
  "email": "lawyer@example.com",
  "password": "Password123",
  "role": "lawyer",
  "phone": "+10000000001"
}

Login
POST /api/auth/login
Content-Type: application/json
{
  "email": "lawyer@example.com",
  "password": "Password123"
}

Response:

{
  "success": true,
  "data": {
    "token": "<accessToken>",
    "refreshToken": "<refreshToken>",
    "user": { "id": "...", "name": "Lawyer User", "role": "lawyer" }
  }
}

Create a case
POST /api/cases
Authorization: Bearer <accessToken>
Content-Type: application/json
{
  "caseNumber": "C-2026-001",
  "title": "Sample Case",
  "description": "Description of the case",
  "applicant": "John Doe",
  "respondent": "Jane Roe",
  "caseType": "civil",
  "filedDate": "2026-04-21",
  "lawyerId": "<lawyer ObjectId>"
}

Assign a judge
POST /api/cases/:caseId/assign
Authorization: Bearer <adminAccessToken>
Content-Type: application/json
{ "judgeId": "<judge ObjectId>" }

Schedule a hearing
POST /api/hearings
Authorization: Bearer <accessToken>
Content-Type: application/json
{
  "caseId": "<case ObjectId>",
  "hearingDate": "2026-05-01",
  "hearingTime": "10:30",
  "location": "Courtroom 4B",
  "description": "First hearing",
  "judgeId": "<judge ObjectId>"
}

Record outcome (auto-closes the case)
PUT /api/hearings/:hearingId/outcome
Authorization: Bearer <judgeAccessToken>
Content-Type: application/json
{
  "status": "Completed",
  "outcome": "Verdict in favor of applicant",
  "notes": "Case closed successfully"
}

Error Format
All errors follow a consistent shape:

{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "timestamp": "2026-04-21T19:23:54.055Z"
  }
}


## Recommended testing order:

GET /api/health
POST /api/auth/register — admin, lawyer, judge
POST /api/auth/login — lawyer
POST /api/cases — create case
POST /api/auth/login — admin → POST /api/cases/:caseId/assign
POST /api/hearings — schedule
POST /api/auth/login — judge → PUT /api/hearings/:hearingId/outcome with status: "Completed"
GET /api/cases/:caseId — verify status is now "Closed"
