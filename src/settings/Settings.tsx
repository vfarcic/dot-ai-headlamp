import { Box, TextField, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { pluginStore, usePluginConfig } from './pluginConfig';

const DEFAULT_SERVICE_NAME = 'dot-ai';
const DEFAULT_NAMESPACE = 'dot-ai';
const DEFAULT_PORT = '3456';

export default function Settings() {
  const config = usePluginConfig();

  const [serviceName, setServiceName] = useState(DEFAULT_SERVICE_NAME);
  const [namespace, setNamespace] = useState(DEFAULT_NAMESPACE);
  const [port, setPort] = useState(DEFAULT_PORT);
  const [token, setToken] = useState('');

  useEffect(() => {
    setServiceName(config?.serviceName ?? DEFAULT_SERVICE_NAME);
    setNamespace(config?.namespace ?? DEFAULT_NAMESPACE);
    setPort(config?.port ?? DEFAULT_PORT);
    setToken(config?.token ?? '');
  }, [config?.serviceName, config?.namespace, config?.port, config?.token]);

  function handleServiceNameBlur() {
    pluginStore.update({ serviceName });
  }

  function handleNamespaceBlur() {
    pluginStore.update({ namespace });
  }

  function handlePortBlur() {
    pluginStore.update({ port });
  }

  function handleTokenBlur() {
    pluginStore.update({ token });
  }

  return (
    <Box sx={{ width: '80%' }}>
      <Typography variant="body1" sx={{ mb: 3 }}>
        Configure the in-cluster dot-ai Service. The plugin uses Headlamp&apos;s Kubernetes API
        proxy to reach the service.
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
        sx={{ mb: 2 }}
        helperText="Namespace where the dot-ai Service is running"
      />

      <TextField
        label="Port"
        placeholder={DEFAULT_PORT}
        value={port}
        onChange={e => setPort(e.target.value)}
        onBlur={handlePortBlur}
        fullWidth
        sx={{ mb: 2 }}
        helperText="Port of the dot-ai Kubernetes Service"
      />

      <TextField
        label="Token"
        type="password"
        value={token}
        onChange={e => setToken(e.target.value)}
        onBlur={handleTokenBlur}
        fullWidth
        sx={{ mb: 3 }}
        helperText="Static bearer token for dot-ai authentication (leave empty if not required)"
      />
    </Box>
  );
}
