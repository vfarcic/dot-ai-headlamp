# DevOps AI Toolkit Headlamp Plugin

AI-powered Kubernetes operations directly inside [Headlamp](https://headlamp.dev) — powered by [DevOps AI Toolkit](https://devopstoolkit.ai).

## What It Does

This plugin integrates the DevOps AI Toolkit's AI engine into your Headlamp dashboard, giving you natural language Kubernetes operations without leaving your existing cluster UI.

### Features

- **Query** — Ask questions about your cluster in plain English. Get AI-generated answers with diagrams, tables, cards, and code blocks.
- **Remediate** — Analyze any Kubernetes resource for issues. Get root cause analysis and one-click remediation options, from any resource detail page.
- **Operate** — Perform Day 2 operations (scale, update, rollback, delete) via natural language intent. Dry-run validation before execution.
- **Recommend** — Multi-step wizard that recommends deployment configurations, generates Kubernetes manifests, and deploys them directly to your cluster.
- **Knowledge Base** — Search your organization's knowledge base from the Headlamp app bar. Get AI-synthesized answers with source references.

## Requirements

- Headlamp >= 0.22
- [DevOps AI Toolkit](https://devopstoolkit.ai) MCP server running in-cluster

## Installation

Install directly from the Headlamp Plugin Catalog (search for **dot-ai**), or via [ArtifactHub](https://artifacthub.io/packages/headlamp/dot-ai-headlamp/headlamp-dot-ai).

## Configuration

After installing, go to **Settings → Plugins → dot-ai** and configure:

| Setting | Default | Description |
|---|---|---|
| Service name | `dot-ai` | Kubernetes Service name for the dot-ai MCP server |
| Namespace | `dot-ai` | Namespace where the Service lives |
| Port | `3456` | Service port |
| Token | _(empty)_ | Optional bearer token (`X-Dot-AI-Authorization`) |

## How It Works

The plugin communicates with the dot-ai MCP server running in your cluster via Headlamp's Kubernetes API proxy (`ApiProxy.request()`). Authentication is handled by Kubernetes RBAC using your existing cluster credentials — no separate token needed for most setups.

## Related Projects

- [AI Engine](https://devopstoolkit.ai/docs/ai-engine) — The MCP server this plugin connects to
- [Web UI](https://devopstoolkit.ai/docs/ui) — Standalone web UI (alternative frontend)
- [CLI](https://devopstoolkit.ai/docs/cli) — CLI for terminal-based interaction
- [Controller](https://devopstoolkit.ai/docs/controller) — Kubernetes controller for autonomous operations
