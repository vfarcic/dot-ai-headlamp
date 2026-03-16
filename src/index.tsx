import {
  DetailsViewSectionProps,
  registerDetailsViewSection,
  registerPluginSettings,
  registerRoute,
  registerSidebarEntry,
} from '@kinvolk/headlamp-plugin/lib';
import { SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import React from 'react';
import OperateDetailSection from './components/OperateDetailSection';
import RemediateDetailSection from './components/RemediateDetailSection';
import OperatePage from './pages/OperatePage';
import QueryPage from './pages/QueryPage';
import RecommendPage from './pages/RecommendPage';
import RemediatePage from './pages/RemediatePage';
import { Settings } from './settings';
import { PLUGIN_NAME } from './settings/pluginConfig';

registerPluginSettings(PLUGIN_NAME, Settings);

// Sidebar

registerSidebarEntry({
  parent: null,
  name: 'dot-ai',
  label: 'dot-ai',
  icon: 'mdi:robot-outline',
  useClusterURL: true,
});

registerSidebarEntry({
  parent: 'dot-ai',
  name: 'dot-ai-query',
  label: 'Query',
  url: '/dot-ai/query',
  useClusterURL: true,
  icon: 'mdi:magnify',
});

registerSidebarEntry({
  parent: 'dot-ai',
  name: 'dot-ai-remediate',
  label: 'Remediate',
  url: '/dot-ai/remediate',
  useClusterURL: true,
  icon: 'mdi:wrench',
});

registerSidebarEntry({
  parent: 'dot-ai',
  name: 'dot-ai-operate',
  label: 'Operate',
  url: '/dot-ai/operate',
  useClusterURL: true,
  icon: 'mdi:play-circle-outline',
});

registerSidebarEntry({
  parent: 'dot-ai',
  name: 'dot-ai-recommend',
  label: 'Recommend',
  url: '/dot-ai/recommend',
  useClusterURL: true,
  icon: 'mdi:lightbulb-outline',
});

// Routes

registerRoute({
  path: '/dot-ai/query',
  sidebar: 'dot-ai-query',
  name: 'dot-ai-query',
  exact: true,
  component: QueryPage,
});

registerRoute({
  path: '/dot-ai/remediate',
  sidebar: 'dot-ai-remediate',
  name: 'dot-ai-remediate',
  exact: true,
  component: RemediatePage,
});

registerRoute({
  path: '/dot-ai/operate',
  sidebar: 'dot-ai-operate',
  name: 'dot-ai-operate',
  exact: true,
  component: OperatePage,
});

registerRoute({
  path: '/dot-ai/recommend',
  sidebar: 'dot-ai-recommend',
  name: 'dot-ai-recommend',
  exact: true,
  component: RecommendPage,
});

// Detail view sections

registerDetailsViewSection(({ resource }: DetailsViewSectionProps) => {
  if (!resource) return null;

  return (
    <SectionBox title="dot-ai Remediate">
      <RemediateDetailSection resource={resource} />
    </SectionBox>
  );
});

registerDetailsViewSection(({ resource }: DetailsViewSectionProps) => {
  if (!resource) return null;

  return (
    <SectionBox title="dot-ai Operate">
      <OperateDetailSection resource={resource} />
    </SectionBox>
  );
});
