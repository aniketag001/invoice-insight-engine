Documentation
System Architecture
The Invoice Insight Engine is a full-stack web application built as a modern, serverless solution for uploading, processing, and analyzing invoices to generate actionable business insights.
High-Level Overview

Frontend (Client-side UI):
A single-page React application written in TypeScript and powered by Vite. It provides an intuitive interface for users to upload invoices (PDFs or images), view extracted data, and explore insights/dashboards.
Tech: React + TypeScript + Tailwind CSS + Vite (build tool).
Key folders: src/ (contains App.tsx, components/, pages/, hooks/, etc.).
Integrations: Supabase JavaScript client for authentication, real-time database queries, file storage, and invoking Edge Functions.

Backend / Data Layer: Supabase (managed PostgreSQL + additional services).
Database: PostgreSQL with schema managed via migration files (supabase/migrations/). Includes tables for users, invoices, line items, extracted fields, and insights (inferred from the single migration file present). Row Level Security (RLS) is expected for data isolation.
Storage: Supabase Storage bucket for raw invoice files (PDFs/images).
Processing Logic: Supabase Edge Functions (Deno/TypeScript runtime) – the core function is extract-invoice (supabase/functions/extract-invoice/). This serverless function is triggered on file upload or via HTTP call. It handles parsing, data extraction, and writing structured results back to the database.
Auth: Supabase Auth (email/password, OAuth, etc.) for secure user sessions.

Data Flow
User authenticates and uploads an invoice via the React UI.
File is stored in Supabase Storage → triggers (or manually calls) the extract-invoice Edge Function.
Function processes the document → extracts structured data (vendor, date, total, line items, etc.) → inserts records into PostgreSQL tables.
Frontend polls/queries the database (or uses Supabase Realtime) to display extracted data and generate insights (totals, trends, anomalies, etc.).
Optional: Real-time updates via Supabase subscriptions.

Deployment:
Frontend is statically built with Vite and can be deployed anywhere (Vercel, Netlify, or Supabase hosting). Backend lives entirely on Supabase (no separate server required). Local development uses supabase start + bun dev / npm run dev.

Key Design Decisions

Full Supabase Stack: Chosen for rapid development and low operational overhead. Supabase provides a complete backend (DB + Auth + Storage + Edge Functions) in one platform, eliminating the need for a separate Express/FastAPI backend or infrastructure management.
Serverless Edge Functions for Invoice Processing: The extract-invoice function runs close to the database, offering low latency and automatic scaling. Deno runtime ensures secure, sandboxed execution with built-in TypeScript support.
TypeScript Everywhere: Frontend (React) and backend (Edge Functions) both use TypeScript for end-to-end type safety and better developer experience.
Modern Frontend Tooling: Vite + Tailwind + React for lightning-fast HMR, excellent DX, and responsive, accessible UI out of the box. Playwright + Vitest are pre-configured for E2E and unit testing.
Migration-Based Schema Management: All database changes are version-controlled in supabase/migrations/, making schema evolution reproducible and safe for team collaboration.
Separation of Concerns: UI handles presentation and user interaction; Edge Function isolates heavy document-processing logic (OCR/parsing/AI calls); database acts as the single source of truth.

Assumptions & Limitations
Assumptions

Invoices are provided as PDFs or common image formats and contain reasonably structured text (printed, not handwritten).
The extraction logic in extract-invoice relies on external services (e.g., vision models, LLM APIs, or PDF parsers) whose API keys are configured via Supabase environment variables.
Users have a Supabase project linked (local or remote) and have run supabase init / migrations.
Single-tenant usage initially (multi-user support via Supabase Auth is possible but requires RLS policies).
English-language invoices (or languages supported by the underlying extraction model).

Limitations

Edge Function execution limits (time, memory, CPU) may constrain very large or complex invoices.
Extraction accuracy depends on the implementation inside extract-invoice (not yet fully visible in the scaffold); poor-quality scans or non-standard layouts may produce incomplete results.
No built-in retry or queuing mechanism for failed extractions in the current scaffold.
Real-time features require proper Supabase Realtime configuration.
Scalability and cost are tied to your Supabase plan (storage, compute, function invocations, and any external AI API usage).
Placeholder UI and minimal documentation (Lovable-generated starter) mean production polish (error UX, loading states, accessibility) is still needed.

Potential Improvements

Enhanced Extraction Pipeline
Integrate robust OCR (e.g., Tesseract via Edge Function or external service like Google Document AI / Azure Form Recognizer).
Add LLM post-processing (OpenAI/Anthropic/Groq) for intelligent insights (categorization, anomaly detection, forecasting).
Support multi-page PDFs and batch uploads.

UI/UX Polish
Add a full dashboard with charts (Recharts or Tremor) showing spend trends, top vendors, tax breakdowns.
Implement drag-and-drop upload with progress indicators and preview.
Add invoice search, filtering, and export (CSV/PDF reports).

Reliability & Observability
Add background job queuing (Supabase pg_cron or external like Inngest) for long-running extractions.
Implement comprehensive error handling, logging, and user notifications (email or in-app).
Add comprehensive test coverage (expand existing Vitest + Playwright setup).

Security & Compliance
Enable and tune RLS policies on all tables.
Add data retention policies and audit logging for sensitive invoice data.
GDPR/CCPA support (anonymization, consent flows).

Advanced Features
Multi-tenant / organization support.
AI-powered chat interface for querying invoice data (“What was my total spend with Vendor X last quarter?”).
Integration with accounting tools (QuickBooks, Xero) via webhooks.
Mobile-responsive PWA support.

DevOps & Scalability
Add CI/CD pipeline (GitHub Actions) for linting, testing, and deploying to Supabase + static hosting.
Docker / Supabase self-hosting option for enterprise environments.
Monitoring with Supabase logs + external tools (Sentry, LogRocket).

Documentation & Onboarding
Expand this README with installation steps, environment variables, and architecture diagram (use Mermaid or Excalidraw).
Create a CONTRIBUTING.md and API reference for the Edge Function.
