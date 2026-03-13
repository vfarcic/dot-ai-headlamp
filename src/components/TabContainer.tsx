import { Tabs } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import React from 'react';
import { Visualization } from '../types';
import VisualizationRenderer from './renderers/VisualizationRenderer';

interface TabContainerProps {
  visualizations: Visualization[];
}

export default function TabContainer({ visualizations }: TabContainerProps) {
  if (!visualizations || visualizations.length === 0) {
    return null;
  }

  const tabs = visualizations.map(viz => ({
    label: viz.label,
    component: <VisualizationRenderer visualization={viz} />,
  }));

  return <Tabs tabs={tabs} ariaLabel="Visualization results" />;
}
