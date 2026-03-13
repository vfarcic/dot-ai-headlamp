import { Box, TextField, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { pluginStore, usePluginConfig } from './pluginConfig';

const DEFAULT_SERVICE_NAME = 'dot-ai';
const DEFAULT_NAMESPACE = 'dot-ai';

export default function Settings() {
  const config = usePluginConfig();

  const [serviceName, setServiceName] = useState(DEFAULT_SERVICE_NAME);
  const [namespace, setNamespace] = useState(DEFAULT_NAMESPACE);

  useEffect(() => {
    setServiceName(config?.serviceName ?? DEFAULT_SERVICE_NAME);
    setNamespace(config?.namespace ?? DEFAULT_NAMESPACE);
  }, [config?.serviceName, config?.namespace]);

  function handleServiceNameBlur() {
    pluginStore.update({ serviceName });
  }

  function handleNamespaceBlur() {
    pluginStore.update({ namespace });
  }

  return (
    <Box sx={{ width: '80%' }}>
      <Typography variant="body1" sx={{ mb: 3 }}>
        Configure the in-cluster dot-ai Service. The plugin uses Headlamp&apos;s Kubernetes API
        proxy to reach the service — no separate authentication is needed.
      </Typography>

      <TextField
        label="Service Name"
        placeholder={DEFAULT_SERVICE_NAME}
        value={serviceName}
        onChange={e => setServiceName(e.target.value)}
        onBlur={handleServiceNameBlur}
        fullWidth
        sx={{ mb: 2 }}
        helperText="Name of the dot-ai Kubernetes Service"
      />

      <TextField
        label="Namespace"
        placeholder={DEFAULT_NAMESPACE}
        value={namespace}
        onChange={e => setNamespace(e.target.value)}
        onBlur={handleNamespaceBlur}
        fullWidth
        sx={{ mb: 3 }}
        helperText="Namespace where the dot-ai Service is running"
      />
    </Box>
  );
}
