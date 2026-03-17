# Feature Request: Add Headlamp Plugin Documentation Section

## From
dot-ai-headlamp

## To
dot-ai-website

## Request

Add a new "Headlamp Plugin" documentation section to devopstoolkit.ai, following the same pattern as the existing CLI, Controller, and Web UI sections.

## What's Needed

### 1. Documentation Plugin Instance

Add a new Docusaurus docs plugin instance in `docusaurus.config.ts`:

```typescript
[
  '@docusaurus/plugin-content-docs',
  {
    id: 'headlamp',
    path: 'docs/headlamp',
    routeBasePath: '/docs/headlamp',
    sidebarPath: './sidebars/headlamp.ts',
    editUrl: 'https://github.com/vfarcic/dot-ai-headlamp/tree/main/docs/',
  },
],
```

### 2. Sidebar Configuration

Create `sidebars/headlamp.ts`:

```typescript
import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  headlampSidebar: [
    'index',
  ],
};

export default sidebars;
```

### 3. Documentation Content

Copy `docs/index.md` from `dot-ai-headlamp` repo into `docs/headlamp/index.md`.

### 4. Navbar Entry

Add a "Headlamp" button to the navbar, linking to `/docs/headlamp`:

```typescript
{
  to: '/docs/headlamp',
  label: 'Headlamp',
  position: 'left',
},
```

### 5. Homepage Card

Add a Headlamp card to the homepage (alongside AI Engine, CLI, Controller, Web UI, Stack), linking to `/docs/headlamp` with a description like:

> **Headlamp Plugin** — AI-powered Kubernetes operations inside the Headlamp dashboard. Install from the Plugin Catalog.

## Context

The dot-ai Headlamp plugin is now published on ArtifactHub and available in Headlamp's Plugin Catalog for one-click install. Documentation lives in `dot-ai-headlamp/docs/index.md` and follows the same pattern as the Web UI docs.

## Priority

Low — the plugin works without website docs, but having it on devopstoolkit.ai completes the ecosystem documentation.
