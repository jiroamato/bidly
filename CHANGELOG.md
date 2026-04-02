# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.0.0] - (2026-04-02)

### Added
- Real-time AI streaming with Anthropic SDK streaming API
- Markdown rendering in chat with `react-markdown` and copy buttons
- Chat history persistence across agent views via `ChatHistoryContext`
- Cached tender results and analysis (memory → Supabase → AI 3-tier lookup)
- Multi-signal tender scoring pipeline (BM25 + category + keyword + location)
- `/api/tenders/match` endpoint with composite scoring
- Auto-demo mode with toggle switch and pre-scripted agent walkthroughs
- Writer agent: full bid workspace with cover page, section drafting, and preview
- Compliance agent: 6-section checklist with Buy Canadian hard gate
- Server-side context builder for agent data pipeline
- API key middleware to gate `/api/*` routes for production
- SSE streaming for AI responses with progressive rendering
- Province auto-detection from user input
- Demo reset via `Ctrl+Shift+K` keyboard shortcut
- Proof-of-concept disclaimer and demo mode tip in sidebar
- Dynamic version display from latest git tag

### Changed
- Upgraded AI model from Claude Sonnet 4 to Sonnet 4.6
- Replaced simulated typewriter with real Anthropic SDK streaming
- Rewrote all agent system prompts for working MVP flow
- Expanded tool definitions from initial set to 18 tools with full handler implementations
- Replaced client-side context building with server-side `profileId`/`tenderId` passing
- Chat input upgraded to auto-growing textarea for long messages
- Performance optimizations: 60fps SSE batching, `requestAnimationFrame` throttling, skip markdown during streaming, background fire-and-forget for save/update tool calls
- Applied Vercel React best practices for bundle size and rendering
- Resolved all npm audit vulnerabilities and pinned dependency versions

### Fixed
- Stale closure race conditions in `useAgent` and `useDemoScript` hooks
- Profile hydration on mount causing unnecessary re-fetches
- Concurrent `saveDraft` race conditions via serialized calls
- NAICS code normalization from AI object format to plain strings
- City/NCR-to-province mapping in location scorer
- Render loop from `externalValue` sync in chat input
- Double-click on Analyze/Begin Compliance buttons
- Unknown column errors on profile saves and updates
- Missing profile fallback in `updateProfile` after deletion

## [v0.1.0] - (2026-03-22)

### Added
- Five-stage agent pipeline: Profile → Scout → Analyst → Compliance → Writer
- Sequential agent unlock system (`useAgent` hook)
- Claude AI integration with tool-use via `/api/ai` route
- Database schema with pgvector, indexes, and `match_tenders` RPC
- Tender CSV seeder and Voyage AI embedding pipeline scripts
- API routes: profile CRUD, tenders list/detail, eligibility check, bid drafts, form checklists
- Sidebar navigation, main header, and chat input components
- Profile view with chat-based company info collection
- Scout view with tender dashboard and search
- Analyst view with RFP analysis cards
- Compliance view with eligibility checklist
- Writer view with bid workspace editor
- Frontend-to-API wiring for all five agent views
- Full test suite with Vitest (unit, API, integration tests)
- Supabase client helpers for browser and server contexts
- README with project overview, setup guide, and team info

### Changed
- Redesigned profile view as single-column chat with step indicator
- Replaced auto-advancing demo with manual Next button flow

### Fixed
- Tool-loop history loss, loop guard, stale closure, and tax label issues
- Input validation for NaN IDs, malformed JSON, and missing PUT IDs
- `NaN` average score with empty tender results
- Missing cursor-pointer on compliance action text
- DM Serif Display font loaded via `next/font` with CSS variable