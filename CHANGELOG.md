# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.0.1] - (2026-04-02)

### Added
- Copy button in Writer agent wired to clipboard ([#79](https://github.com/jiroamato/bidly/pull/79))

### Fixed
- Profile card fetch now uses `apiFetch` for proper API key auth ([#78](https://github.com/jiroamato/bidly/pull/78))

### Docs
- Added disclaimer to README ([#80](https://github.com/jiroamato/bidly/pull/80))
- Updated Vercel deployment link in README

## [v1.0.0] - (2026-04-02)

### Added
- Real-time AI streaming with Anthropic SDK streaming API ([#68](https://github.com/jiroamato/bidly/pull/68))
- Markdown rendering in chat with `react-markdown` and copy buttons ([#68](https://github.com/jiroamato/bidly/pull/68))
- Chat history persistence across agent views via `ChatHistoryContext` ([#72](https://github.com/jiroamato/bidly/pull/72))
- Cached tender results and analysis (memory → Supabase → AI 3-tier lookup) ([#72](https://github.com/jiroamato/bidly/pull/72))
- Multi-signal tender scoring pipeline (BM25 + category + keyword + location) ([#60](https://github.com/jiroamato/bidly/pull/60))
- `/api/tenders/match` endpoint with composite scoring ([#60](https://github.com/jiroamato/bidly/pull/60))
- Auto-demo mode with toggle switch and pre-scripted agent walkthroughs ([#47](https://github.com/jiroamato/bidly/pull/47))
- Writer agent: full bid workspace with cover page, section drafting, and preview ([#69](https://github.com/jiroamato/bidly/pull/69))
- Compliance agent: 6-section checklist with Buy Canadian hard gate ([#42](https://github.com/jiroamato/bidly/pull/42))
- Server-side context builder for agent data pipeline ([#28](https://github.com/jiroamato/bidly/pull/28))
- API key middleware to gate `/api/*` routes for production ([#73](https://github.com/jiroamato/bidly/pull/73))
- SSE streaming for AI responses with progressive rendering ([#26](https://github.com/jiroamato/bidly/pull/26))
- Province auto-detection from user input ([#68](https://github.com/jiroamato/bidly/pull/68))
- Demo reset via `Ctrl+Shift+K` keyboard shortcut ([#45](https://github.com/jiroamato/bidly/pull/45))
- Proof-of-concept disclaimer and demo mode tip in sidebar ([#73](https://github.com/jiroamato/bidly/pull/73))
- Dynamic version display from latest git tag ([#73](https://github.com/jiroamato/bidly/pull/73))

### Changed
- Upgraded AI model from Claude Sonnet 4 to Sonnet 4.6 ([#69](https://github.com/jiroamato/bidly/pull/69))
- Replaced simulated typewriter with real Anthropic SDK streaming ([#68](https://github.com/jiroamato/bidly/pull/68))
- Rewrote all agent system prompts for working MVP flow ([#28](https://github.com/jiroamato/bidly/pull/28))
- Expanded tool definitions from initial set to 18 tools with full handler implementations ([#28](https://github.com/jiroamato/bidly/pull/28))
- Replaced client-side context building with server-side `profileId`/`tenderId` passing ([#43](https://github.com/jiroamato/bidly/pull/43))
- Chat input upgraded to auto-growing textarea for long messages ([#47](https://github.com/jiroamato/bidly/pull/47))
- Performance optimizations: 60fps SSE batching, `requestAnimationFrame` throttling, skip markdown during streaming, background fire-and-forget for save/update tool calls ([#69](https://github.com/jiroamato/bidly/pull/69))
- Applied Vercel React best practices for bundle size and rendering ([#73](https://github.com/jiroamato/bidly/pull/73))
- Resolved all npm audit vulnerabilities and pinned dependency versions ([#73](https://github.com/jiroamato/bidly/pull/73))

### Fixed
- Stale closure race conditions in `useAgent` and `useDemoScript` hooks ([#47](https://github.com/jiroamato/bidly/pull/47))
- Profile hydration on mount causing unnecessary re-fetches ([#71](https://github.com/jiroamato/bidly/pull/71))
- Concurrent `saveDraft` race conditions via serialized calls ([#69](https://github.com/jiroamato/bidly/pull/69))
- NAICS code normalization from AI object format to plain strings ([#69](https://github.com/jiroamato/bidly/pull/69))
- City/NCR-to-province mapping in location scorer ([#69](https://github.com/jiroamato/bidly/pull/69))
- Render loop from `externalValue` sync in chat input ([#69](https://github.com/jiroamato/bidly/pull/69))
- Double-click on Analyze/Begin Compliance buttons ([#72](https://github.com/jiroamato/bidly/pull/72))
- Unknown column errors on profile saves and updates ([#69](https://github.com/jiroamato/bidly/pull/69))
- Missing profile fallback in `updateProfile` after deletion ([#69](https://github.com/jiroamato/bidly/pull/69))

## [v0.1.0] - (2026-03-22)

### Added
- Five-stage agent pipeline: Profile → Scout → Analyst → Compliance → Writer ([#17](https://github.com/jiroamato/bidly/pull/17), [#18](https://github.com/jiroamato/bidly/pull/18), [#19](https://github.com/jiroamato/bidly/pull/19))
- Sequential agent unlock system (`useAgent` hook) ([#19](https://github.com/jiroamato/bidly/pull/19))
- Claude AI integration with tool-use via `/api/ai` route ([#18](https://github.com/jiroamato/bidly/pull/18))
- Database schema with pgvector, indexes, and `match_tenders` RPC ([#17](https://github.com/jiroamato/bidly/pull/17))
- Tender CSV seeder and Voyage AI embedding pipeline scripts ([#17](https://github.com/jiroamato/bidly/pull/17))
- API routes: profile CRUD, tenders list/detail, eligibility check, bid drafts, form checklists ([#20](https://github.com/jiroamato/bidly/pull/20))
- Sidebar navigation, main header, and chat input components ([#19](https://github.com/jiroamato/bidly/pull/19))
- Profile view with chat-based company info collection ([#19](https://github.com/jiroamato/bidly/pull/19))
- Scout view with tender dashboard and search ([#19](https://github.com/jiroamato/bidly/pull/19))
- Analyst view with RFP analysis cards ([#19](https://github.com/jiroamato/bidly/pull/19))
- Compliance view with eligibility checklist ([#19](https://github.com/jiroamato/bidly/pull/19))
- Writer view with bid workspace editor ([#19](https://github.com/jiroamato/bidly/pull/19))
- Frontend-to-API wiring for all five agent views ([#21](https://github.com/jiroamato/bidly/pull/21))
- Full test suite with Vitest (unit, API, integration tests) ([#20](https://github.com/jiroamato/bidly/pull/20), [#21](https://github.com/jiroamato/bidly/pull/21))
- Supabase client helpers for browser and server contexts ([#20](https://github.com/jiroamato/bidly/pull/20))
- README with project overview, setup guide, and team info ([#24](https://github.com/jiroamato/bidly/pull/24))

### Changed
- Redesigned profile view as single-column chat with step indicator ([#24](https://github.com/jiroamato/bidly/pull/24))
- Replaced auto-advancing demo with manual Next button flow ([#24](https://github.com/jiroamato/bidly/pull/24))

### Fixed
- Tool-loop history loss, loop guard, stale closure, and tax label issues ([#18](https://github.com/jiroamato/bidly/pull/18))
- Input validation for NaN IDs, malformed JSON, and missing PUT IDs ([#20](https://github.com/jiroamato/bidly/pull/20))
- `NaN` average score with empty tender results ([#21](https://github.com/jiroamato/bidly/pull/21))
- Missing cursor-pointer on compliance action text ([#19](https://github.com/jiroamato/bidly/pull/19))
- DM Serif Display font loaded via `next/font` with CSS variable ([#19](https://github.com/jiroamato/bidly/pull/19))