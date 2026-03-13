import { registerPluginSettings } from '@kinvolk/headlamp-plugin/lib';
import { Settings } from './settings';
import { PLUGIN_NAME } from './settings/pluginConfig';

registerPluginSettings(PLUGIN_NAME, Settings);
