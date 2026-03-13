import { registerPluginSettings, registerRoute, registerSidebarEntry } from '@kinvolk/headlamp-plugin/lib';
import QueryPage from './pages/QueryPage';
import { Settings } from './settings';
import { PLUGIN_NAME } from './settings/pluginConfig';

registerPluginSettings(PLUGIN_NAME, Settings);

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

registerRoute({
  path: '/dot-ai/query',
  sidebar: 'dot-ai-query',
  name: 'dot-ai-query',
  exact: true,
  component: QueryPage,
});
