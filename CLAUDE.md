# Claude Code Instructions

## Project Overview

Headlamp plugin for DevOps AI Toolkit (dot-ai). Brings AI-powered Kubernetes operations (query, remediate, operate, recommend) into the Headlamp dashboard as a plugin.

## Tech Stack

- **Plugin framework**: `@kinvolk/headlamp-plugin`
- **UI**: React, TypeScript, MUI (shared Headlamp dependency)
- **Visualizations**: Mermaid.js (bundled), Recharts (shared Headlamp dependency)
- **Build**: Headlamp plugin CLI (`headlamp-plugin build`)

## Development

```bash
npm run start       # Dev server with hot reload (requires Headlamp running)
npm run build       # Production build
npm run lint        # Lint code
npm run format      # Format code
npm run test        # Run tests
npm run package     # Create distributable .tar.gz
```

## MCP Integration

This plugin communicates with the in-cluster dot-ai MCP server via **`ApiProxy.request()`** through the Kubernetes API proxy. Authentication is handled by Kubernetes RBAC — no separate token needed. Plugin settings configure the Service name/namespace (default: `dot-ai` in `dot-ai` namespace).

## Key Headlamp APIs

- `registerRoute()` — Custom pages
- `registerSidebarEntry()` — Sidebar navigation items
- `registerDetailsViewSection()` — Inject sections into K8s resource detail pages
- `registerAppBarAction()` — App bar widgets
- `registerPluginSettings()` — Plugin configuration UI
- `registerResourceTableColumnsProcessor()` — Modify resource table columns
- `ApiProxy.request()` — K8s API proxy for in-cluster services

## Project Structure

```
src/
├── index.tsx          # Plugin entry point (registrations)
├── api/               # API client for dot-ai MCP REST endpoints
├── components/        # React components
│   └── renderers/     # Visualization renderers (Mermaid, Cards, Code, Table, BarChart)
├── pages/             # Route pages (Query, Remediate, Operate, Recommend)
├── settings/          # Plugin settings (Service name/namespace)
└── types/             # TypeScript types
```

## Companion Projects

- **dot-ai-ui** (`github.com/vfarcic/dot-ai-ui`) — Standalone web UI (alternative frontend)
- **dot-ai** — MCP server providing the REST API this plugin consumes
