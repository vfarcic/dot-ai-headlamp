import { ConfigStore } from '@kinvolk/headlamp-plugin/lib';
import { PluginConfig } from '../types';

export const PLUGIN_NAME = 'dot-ai';

export const pluginStore = new ConfigStore<PluginConfig>(PLUGIN_NAME);

export const usePluginConfig = pluginStore.useConfig();
