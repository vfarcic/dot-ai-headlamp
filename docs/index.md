# DevOps AI Toolkit Headlamp Plugin

**AI-powered Kubernetes operations directly inside Headlamp — query, remediate, operate, and recommend with natural language.**

---

## What is the Headlamp Plugin?

The DevOps AI Toolkit Headlamp Plugin brings AI-powered Kubernetes operations into the [Headlamp](https://headlamp.dev) dashboard. Instead of switching between separate UIs, you get Query, Remediate, Operate, Recommend, and Knowledge Base search directly inside your existing Kubernetes dashboard.

The plugin communicates with the [dot-ai MCP server](https://devopstoolkit.ai/docs/ai-engine) running in your cluster via Headlamp's Kubernetes API proxy. Authentication is handled by Kubernetes RBAC using your existing cluster credentials.

## Features

### Query

Ask natural language questions about your cluster. Results render as interactive diagrams (Mermaid.js), data tables, cards, and syntax-highlighted code blocks.

[Query tool documentation](https://devopstoolkit.ai/docs/ai-engine/tools/query)

### Remediate

Diagnose issues on any Kubernetes resource. Get root cause analysis and remediation options. Available as a standalone page and injected into every resource detail page via Headlamp's `registerDetailsViewSection()`.

[Remediate tool documentation](https://devopstoolkit.ai/docs/ai-engine/tools/remediate)

### Operate

Perform Day 2 operations (scale, update, rollback, delete) via natural language. The plugin shows proposed changes with dry-run validation before execution. Available as a standalone page and on resource detail pages.

[Operate tool documentation](https://devopstoolkit.ai/docs/ai-engine/tools/operate)

### Recommend

Multi-step wizard for deployment recommendations. Describe what you want to deploy, select from scored solutions, answer configuration questions, preview generated YAML manifests, and deploy directly to your cluster.

[Recommend tool documentation](https://devopstoolkit.ai/docs/ai-engine/tools/recommend)

### Knowledge Base Search

Search your organization's knowledge base from the Headlamp app bar. Get AI-synthesized answers with markdown rendering, source references, and collapsible content chunks.

[Knowledge Base documentation](https://devopstoolkit.ai/docs/ai-engine/tools/knowledge-base)

## Quick Start

> **Recommended**: For the easiest setup, install the complete dot-ai stack which includes all components (MCP server, Web UI, and Controller). See the [Stack Installation Guide](https://devopstoolkit.ai/docs/stack).

### Prerequisites

- [Headlamp](https://headlamp.dev) >= 0.22 (desktop, in-cluster, web, or Docker Desktop)
- [dot-ai MCP server](https://devopstoolkit.ai/docs/ai-engine/setup/deployment) running in your cluster

### Install from Plugin Catalog

1. Open Headlamp
2. Go to **Settings > Plugin Catalog**
3. Search for **dot-ai**
4. Click **Install**

The plugin is also available on [ArtifactHub](https://artifacthub.io/packages/headlamp/dot-ai-headlamp/headlamp-dot-ai).

### Configure

After installing, go to **Settings > Plugins > dot-ai** and configure:

| Setting | Default | Description |
|---------|---------|-------------|
| Service name | `dot-ai` | Kubernetes Service name for the dot-ai MCP server |
| Namespace | `dot-ai` | Namespace where the Service lives |
| Port | `3456` | Service port |
| Token | _(empty)_ | Optional bearer token for `X-Dot-AI-Authorization` header |

**No token needed for most setups** — authentication is handled by Kubernetes RBAC through Headlamp's API proxy.

## How It Works

```text
Headlamp Browser
  └── dot-ai plugin
        └── ApiProxy.request()
              └── Kubernetes API Server (RBAC)
                    └── dot-ai Service (in-cluster)
```

All requests flow through Headlamp's `ApiProxy.request()`, which proxies to the Kubernetes API server. The API server then forwards to the dot-ai Service using the standard Kubernetes service proxy (`/api/v1/namespaces/{ns}/services/{name}:{port}/proxy/`). Your existing cluster credentials handle authentication — no separate token management needed.

The plugin uses a custom `X-Dot-AI-Authorization` header for optional bearer token auth, since Headlamp's backend overwrites the standard `Authorization` header with the Kubernetes token.

## Compatibility

The plugin works with all Headlamp distributions:

| Distribution | Support |
|-------------|---------|
| In-cluster | Yes |
| Web | Yes |
| Docker Desktop | Yes |
| Desktop app | Yes |

## Support

- **GitHub Issues**: [Bug reports and feature requests](https://github.com/vfarcic/dot-ai-headlamp/issues)

## Related Projects

- **[dot-ai](https://github.com/vfarcic/dot-ai)** — DevOps AI Toolkit MCP server
- **[dot-ai-ui](https://github.com/vfarcic/dot-ai-ui)** — Standalone web UI (alternative frontend)
- **[dot-ai-cli](https://github.com/vfarcic/dot-ai-cli)** — CLI for terminal-based interaction
- **[dot-ai-controller](https://github.com/vfarcic/dot-ai-controller)** — Kubernetes controller for autonomous operations

---

**DevOps AI Toolkit Headlamp Plugin** — AI-powered Kubernetes operations inside Headlamp.
