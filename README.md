# SkillBridge

SkillBridge is a responsive AI-assisted learning roadmap builder. It turns a learner's target role, current skills, study time and learning horizon into a phased plan.

## Current MVP
- Landing page and roadmap builder
- Roadmap results dashboard with phases, topics, practice projects and resources
- Milestone completion and progress calculation
- Roadmap persistence in browser localStorage
- Server-side AI adapter with a deterministic demo fallback
- Mobile responsive UI

## Requirements
- Node.js 18+ (20+ recommended)
- npm

## Run locally
1. Extract this folder.
2. Open a terminal in the folder.
3. Run `npm install`.
4. Copy `.env.example` to `.env`.
5. Run `npm run dev`.
6. Open `http://localhost:5173`.

The app runs in clearly labelled demo mode until the official Gemma endpoint settings are configured.

## Gemma configuration
The hackathon's Gemma quickstart and API documentation must be treated as the source of truth for the supported endpoint, authentication scheme, model identifier and request/response format. Do not guess a model identifier or use a different model without disclosure.

Set these values in the server environment (never in frontend code):
- `GEMMA_API_KEY`
- `GEMMA_API_URL`
- `GEMMA_MODEL`

The initial adapter expects an OpenAI-compatible chat-completions request/response shape and Bearer authentication. If the official hackathon endpoint uses a different format, update only the server adapter in `server/index.js` to match its docs. Never expose the key in Vite variables or commit `.env`.

## Architecture
- React + Vite frontend in `src/`
- Express API in `server/index.js`
- `POST /api/roadmap` validates basic inputs and either calls the configured Gemma endpoint or returns a clearly labelled demo roadmap
- `GET /api/health` reports whether server-side Gemma settings are present
- localStorage stores the current roadmap and checked milestones

## Build
Run `npm run build`.

## Deployment
Deploy the Node server and built frontend to a host that supports Node.js. Configure the three Gemma environment variables as server-side secrets in the hosting dashboard. Never commit `.env`. Verify `/api/health` and generate a test roadmap after deployment.

## Important
This starter integration does not assume the exact Gemma 4 endpoint or model name. Confirm those details from the MLH-provided Gemma Quickstart/API Docs before adding credentials. The demo mode is available so the project can be presented while API access is being configured.
