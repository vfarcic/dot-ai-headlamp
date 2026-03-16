# PRD: Headlamp Plugin for DevOps AI Toolkit

**Issue**: #1
**Status**: In Progress
**Progress**: 4/12 features complete (Features 1-4 done — Query Page + Core Renderers + Mermaid Renderer complete, Feature 5 Remediate next)

## Problem Statement

Users of DevOps AI Toolkit (dot-ai) currently need a separate standalone web UI to access AI-powered Kubernetes operations. Users who already use Headlamp as their Kubernetes dashboard have to switch between two UIs. Integrating dot-ai capabilities directly into Headlamp eliminates context switching and leverages Headlamp's existing resource browsing, auth, and RBAC.

## Proposed Solution

A Headlamp plugin that brings dot-ai's AI-powered Kubernetes capabilities into the Headlamp dashboard. The plugin communicates with the dot-ai MCP server running in-cluster via Headlamp's Kubernetes API proxy (`ApiProxy.request()`). Authentication is handled by Kubernetes RBAC through the user's existing cluster credentials.

## Architecture

```
Headlamp Browser UI
├── dot-ai plugin
│   ├── Settings (Service name/namespace)
│   ├── API Client (ApiProxy.request() → K8s API → dot-ai Service)
│   ├── Sidebar entries (Query, Remediate, Operate, Recommend)
│   ├── Custom routes/pages
│   ├── Resource detail sections (injected via registerDetailsViewSection)
│   └── Visualization renderers (Mermaid, Cards, Code, Table, BarChart)
```

### Authentication

- Requests proxy through the K8s API server using Headlamp's Kubernetes API proxy
- Static token auth via `X-Dot-AI-Authorization` header (Headlamp backend overwrites standard `Authorization` with K8s token)
- Plugin settings configure the Service name/namespace/port and optional bearer token
- Plugin auto-detects per cluster whether dot-ai is available; UI hides/disables in clusters without it

### Tech Stack

- React + TypeScript (Headlamp requirement)
- MUI components (shared Headlamp dependency — replaces Tailwind from dot-ai-ui)
- Mermaid.js (loaded from CDN at runtime)
- Recharts (shared Headlamp dependency — replaces custom BarChartRenderer)
- Monaco Editor (shared Headlamp dependency — alternative to Prism.js)

## Development Setup

- **Headlamp**: Desktop app for local development (plugins work identically in desktop and in-cluster modes)
- **Kubernetes cluster**: Headlamp connects to any cluster via kubeconfig — use your existing cluster
- **MCP server**: Hosted at `https://dot-ai.devopstoolkit.ai` (auth token via vals)
- **Dev workflow**: `npm start` hot-reloads the plugin into the running Headlamp desktop app

## Features

### Foundation

#### 1. Plugin Settings Page
Configure dot-ai Service discovery via `registerPluginSettings()`.
- [x] Text input for Service name (default: `dot-ai`)
- [x] Text input for namespace (default: `dot-ai`)
- [~] Connection test button — removed: multi-cluster Headlamp makes per-settings testing meaningless; validation at point of use instead
- [x] Persist via `ConfigStore`

#### 2. API Client
HTTP client using Headlamp's `ApiProxy.request()` to reach the in-cluster dot-ai Service.
- [x] `ApiProxy.request()` routing through K8s API proxy
- [x] Timeout handling (30s default, 30min for AI tools, 5min for knowledge)
- [x] Error classification (network, auth, server, timeout, service-not-found)
- [x] Endpoints: `/api/v1/tools/query`, `/api/v1/tools/remediate`, `/api/v1/tools/operate`, `/api/v1/tools/recommend`, `/api/v1/knowledge/ask`

### AI Tool Workflows

#### 3. Query Page + Core Renderers
Natural language cluster analysis — first end-to-end AI workflow. Includes the VisualizationRenderer dispatcher and the three simplest renderers (Cards, Table, Code). Each renderer is validated against real Query results before moving on.
- [x] `VisualizationRenderer` dispatcher (routes by visualization type)
- [x] **Cards** renderer — Grid layout with MUI Card components, status indicators
- [x] **Table** renderer — Data tables with MUI Table, status indicators
- [x] **Code** renderer — Syntax-highlighted blocks (Monaco Editor)
- [x] `registerRoute()` + `registerSidebarEntry()` under "dot-ai" section
- [x] Text input for natural language query
- [x] Visualization rendering of results
- [x] Insights panel

#### 4. Mermaid Renderer
Complex diagram visualization with interactive controls. Split from core renderers due to significantly higher complexity (~450 lines in reference implementation). Enhances Query page results.
- [x] Mermaid.js integration (loaded from CDN at runtime)
- [x] Zoom/pan/fullscreen controls
- [x] Collapsible subgraphs
- [x] Error display with raw content fallback

#### 5. Remediate
Issue analysis and remediation.
- [ ] Standalone page via `registerRoute()`
- [ ] Injected into resource detail pages via `registerDetailsViewSection()`
- [ ] Two-step workflow: analysis → execution choice
- [ ] Action buttons for remediation options

#### 6. Operate
Day 2 operations (scale, update, rollback, delete).
- [ ] Standalone page via `registerRoute()`
- [ ] Injected into resource detail pages via `registerDetailsViewSection()`
- [ ] Two-step workflow: proposed changes → approval → execution
- [ ] Dry-run validation display

#### 7. Recommend + BarChart Renderer
Multi-step deployment recommendations. Introduces the BarChart renderer for scoring visualizations.
- [ ] **BarChart** renderer — Horizontal/vertical charts via Recharts
- [ ] `registerRoute()` + `registerSidebarEntry()`
- [ ] Multi-step flow: intent → solutions → questions → manifests → deploy
- [ ] Solution cards with scores
- [ ] YAML manifest preview
- [ ] Deploy button with results

### Dashboard Enhancements

#### 8. Knowledge Base Search
Organizational knowledge queries.
- [ ] `registerAppBarAction()` search widget
- [ ] Search input with results dropdown
- [ ] Links to full results page

#### 9. Resource Capabilities
Enrich Headlamp's resource tables with dot-ai capability data.
- [ ] `registerResourceTableColumnsProcessor()` to add printer columns
- [ ] Capability descriptions and use cases

#### 10. Resource Detail AI Section
Unified "dot-ai" section on any resource detail page.
- [ ] `registerDetailsViewSection()` with quick action buttons
- [ ] Query, Remediate, Operate actions pre-filled with resource context

### Distribution

#### 11. ArtifactHub Publishing
Package for Headlamp's Plugin Catalog.
- [ ] `npm run package` produces `.tar.gz`
- [ ] ArtifactHub metadata
- [ ] One-click install from Headlamp UI

#### 12. Helm Chart Integration
Optional Helm chart for deploying plugin with Headlamp.
- [ ] ConfigMap for plugin artifacts
- [ ] Values for dot-ai Service name/namespace

## Implementation Order

1. Foundation (settings, API client) — features 1-2
2. Query page + core renderers — feature 3 (first end-to-end AI workflow with Cards, Table, Code renderers)
3. Mermaid renderer — feature 4 (complex diagram visualization, enhances Query results)
4. Remediate & Operate — features 5-6 (two-step workflows + resource detail injection)
5. Recommend + BarChart — feature 7 (most complex multi-step workflow + chart renderer)
6. Dashboard enhancements — features 8-10 (knowledge search, resource capabilities, detail sections)
7. Distribution — features 11-12 (ArtifactHub + Helm chart)

## Decision Log

### 2026-03-13: Merge renderers into the pages that use them
- **Decision**: Remove standalone "Visualization Renderers" feature. Distribute renderers across the pages that introduce them: Cards/Table/Code with Query page (Feature 3), Mermaid as its own feature (Feature 4), BarChart with Recommend (Feature 7).
- **Rationale**: Renderers can't be validated in isolation — they need a page with real data. Building all 5 up front creates a large batch with no feedback loop. Interleaving renderers with pages enables incremental build-validate cycles. Mermaid (~450 lines, collapsible subgraphs, zoom/pan) is complex enough to warrant its own feature.
- **Impact**: Feature count stays at 12. Old Feature 3 (Renderers) absorbed into Features 3, 4, 7. Old Feature 4 (Query) merged into new Feature 3. Implementation order updated.

### 2026-03-13: Remove connection test from settings page
- **Decision**: Remove the "Test Connection" button from the plugin settings page.
- **Rationale**: Headlamp supports multiple clusters. `ApiProxy.request()` routes to the currently active cluster, but settings are global. A test in settings would only check one cluster and mislead users about dot-ai availability in other clusters. Connection validation will happen at the point of use (API client calls) instead.
- **Impact**: Feature 1 connection test checkbox marked as deferred (`[~]`). Connection error handling moves to the API client (Feature 2) and individual tool pages.

### 2026-03-13: In-cluster service discovery via ApiProxy instead of global URL + Bearer token
- **Decision**: Use Headlamp's `ApiProxy.request()` for all dot-ai API calls instead of direct `fetch()` with a configured MCP URL and Bearer token.
- **Rationale**: dot-ai runs as an in-cluster Service. Users may have multiple clusters in Headlamp — ApiProxy automatically routes to the active cluster's dot-ai instance. Authentication is handled by Kubernetes RBAC, eliminating separate token management.
- **Impact**: Feature 1 (Settings) reworked to Service name/namespace. Feature 2 (API Client) uses ApiProxy. Bearer token removed from architecture. Plugin auto-detects dot-ai availability per cluster.

### 2026-03-14: Port required in K8s API proxy URL
- **Decision**: Add configurable port to plugin settings and include it in the K8s API proxy path (`services/{name}:{port}/proxy/`).
- **Rationale**: The Kubernetes API server proxy defaults to port 80 when no port is specified. The dot-ai service runs on port 3456, so requests failed with "no endpoints available" until the port was explicitly included.
- **Impact**: Feature 1 (Settings) gains a Port field (default: `3456`). Feature 2 (API Client) includes port in proxy path.

### 2026-03-14: X-Dot-AI-Authorization header for auth through K8s proxy
- **Decision**: Use `X-Dot-AI-Authorization: Bearer <token>` instead of standard `Authorization` header for dot-ai authentication.
- **Rationale**: The Headlamp backend overwrites the `Authorization` header with the Kubernetes bearer token before proxying to the K8s API server. A custom header survives the proxy chain. Feature request to dot-ai MCP server added support for this fallback header (v1.10.2+).
- **Impact**: Feature 1 (Settings) gains a Token field. Feature 2 (API Client) sends token via custom header. Architecture section updated to reflect auth approach.

### 2026-03-14: MCP response envelope contains nested tool result
- **Decision**: Unwrap MCP responses by extracting `data.result` (not just `data`) from the response envelope.
- **Rationale**: The dot-ai MCP server wraps tool responses as `{ success, data: { tool, result: { ...actual data... } } }`. The API client was stopping at `data` level, returning the wrapper object instead of the tool result.
- **Impact**: Feature 2 (API Client) updated to check for `result` key in `data` object.

### 2026-03-16: Mermaid.js loaded from CDN instead of bundled
- **Decision**: Load Mermaid.js from jsDelivr CDN at runtime via `<script>` tag instead of bundling as an npm dependency.
- **Rationale**: Bundling mermaid (~16MB) into the plugin's UMD bundle crashed Headlamp's plugin loader. Headlamp plugins must stay small since they're loaded synchronously at startup. CDN loading defers the heavy library to first use and keeps the plugin bundle at ~26KB.
- **Impact**: Feature 4 (Mermaid Renderer) uses `loadMermaid()` singleton that injects a script tag on first render. No `mermaid` npm dependency. Requires internet access for diagram rendering.

### 2026-03-13: Remove data endpoints from API client
- **Decision**: Remove `/api/v1/resources`, `/api/v1/resources/kinds`, and `/api/v1/namespaces` endpoints from the plugin API client.
- **Rationale**: Headlamp already provides resource browsing, namespace listing, and K8s API access natively. Duplicating these through dot-ai would overlap with existing Headlamp features. The API client focuses exclusively on AI tool endpoints.
- **Impact**: Feature 2 (API Client) exposes only the 5 AI tools (Query, Remediate, Operate, Recommend, Knowledge). Resource data comes from Headlamp's built-in K8s APIs.

## Companion Projects

- **dot-ai-ui** (`github.com/vfarcic/dot-ai-ui`) — Standalone web UI (coexists as alternative frontend)
- **dot-ai** — MCP server providing the REST API this plugin consumes
