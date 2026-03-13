# PRD: Headlamp Plugin for DevOps AI Toolkit

**Issue**: #1
**Status**: In Progress
**Progress**: 1/12 features complete (Foundation phase — Feature 1 done, Feature 2 next)

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

- Handled by Kubernetes RBAC — requests proxy through the K8s API server using the user's existing cluster credentials
- No separate auth token needed — dot-ai runs as an in-cluster Service
- Plugin settings configure the Service name/namespace (default: `dot-ai` in `dot-ai` namespace)
- Plugin auto-detects per cluster whether dot-ai is available; UI hides/disables in clusters without it

### Tech Stack

- React + TypeScript (Headlamp requirement)
- MUI components (shared Headlamp dependency — replaces Tailwind from dot-ai-ui)
- Mermaid.js (bundled with plugin)
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
- [ ] `ApiProxy.request()` routing through K8s API proxy
- [ ] Timeout handling (30s default, 30min for AI tools)
- [ ] Error classification (network, auth, server, timeout, service-not-found)
- [ ] Endpoints: `/api/v1/resources`, `/api/v1/tools/query`, `/api/v1/tools/remediate`, `/api/v1/tools/operate`, `/api/v1/tools/recommend`, `/api/v1/knowledge/ask`, etc.

#### 3. Visualization Renderers
Port visualization renderers from dot-ai-ui (Tailwind → MUI).
- [ ] **Mermaid** — Diagrams with zoom/pan/fullscreen (mermaid.js bundled)
- [ ] **Cards** — Grid layout with MUI Card components, status indicators
- [ ] **Code** — Syntax-highlighted blocks (Monaco Editor or Prism.js)
- [ ] **Table** — Data tables with MUI Table, status indicators
- [ ] **BarChart** — Horizontal/vertical charts via Recharts

### AI Tool Workflows

#### 4. Query Page
Natural language cluster analysis.
- [ ] `registerRoute()` + `registerSidebarEntry()` under "dot-ai" section
- [ ] Text input for natural language query
- [ ] Visualization rendering of results
- [ ] Insights panel

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

#### 7. Recommend
Multi-step deployment recommendations.
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

1. Foundation (settings, API client, renderers) — features 1-3
2. Query page — feature 4 (simplest workflow, proves the full stack end-to-end)
3. Remediate & Operate — features 5-6 (two-step workflows + resource detail injection)
4. Recommend — feature 7 (most complex multi-step workflow)
5. Dashboard enhancements — features 8-10 (knowledge search, resource capabilities, detail sections)
6. Distribution — features 11-12 (ArtifactHub + Helm chart)

## Decision Log

### 2026-03-13: Remove connection test from settings page
- **Decision**: Remove the "Test Connection" button from the plugin settings page.
- **Rationale**: Headlamp supports multiple clusters. `ApiProxy.request()` routes to the currently active cluster, but settings are global. A test in settings would only check one cluster and mislead users about dot-ai availability in other clusters. Connection validation will happen at the point of use (API client calls) instead.
- **Impact**: Feature 1 connection test checkbox marked as deferred (`[~]`). Connection error handling moves to the API client (Feature 2) and individual tool pages.

### 2026-03-13: In-cluster service discovery via ApiProxy instead of global URL + Bearer token
- **Decision**: Use Headlamp's `ApiProxy.request()` for all dot-ai API calls instead of direct `fetch()` with a configured MCP URL and Bearer token.
- **Rationale**: dot-ai runs as an in-cluster Service. Users may have multiple clusters in Headlamp — ApiProxy automatically routes to the active cluster's dot-ai instance. Authentication is handled by Kubernetes RBAC, eliminating separate token management.
- **Impact**: Feature 1 (Settings) reworked to Service name/namespace. Feature 2 (API Client) uses ApiProxy. Bearer token removed from architecture. Plugin auto-detects dot-ai availability per cluster.

## Companion Projects

- **dot-ai-ui** (`github.com/vfarcic/dot-ai-ui`) — Standalone web UI (coexists as alternative frontend)
- **dot-ai** — MCP server providing the REST API this plugin consumes
