import { Icon } from '@iconify/react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { ConnectionTestResult, testConnection } from './ConnectionTest';
import { pluginStore, usePluginConfig } from './pluginConfig';

export default function Settings() {
  const config = usePluginConfig();

  const [mcpServerUrl, setMcpServerUrl] = useState('');
  const [bearerToken, setBearerToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  useEffect(() => {
    setMcpServerUrl(config?.mcpServerUrl ?? '');
    setBearerToken(config?.bearerToken ?? '');
  }, [config?.mcpServerUrl, config?.bearerToken]);

  function handleUrlBlur() {
    pluginStore.update({ mcpServerUrl });
  }

  function handleTokenBlur() {
    pluginStore.update({ bearerToken });
  }

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    const result = await testConnection(mcpServerUrl, bearerToken);
    setTestResult(result);
    setTesting(false);
  }

  return (
    <Box sx={{ width: '80%' }}>
      <Typography variant="body1" sx={{ mb: 3 }}>
        Configure the connection to your dot-ai MCP server. The plugin uses this server for
        AI-powered Kubernetes operations.
      </Typography>

      <TextField
        label="MCP Server URL"
        placeholder="https://mcp.example.com"
        value={mcpServerUrl}
        onChange={e => setMcpServerUrl(e.target.value)}
        onBlur={handleUrlBlur}
        fullWidth
        sx={{ mb: 2 }}
      />

      <TextField
        label="Bearer Token"
        type={showToken ? 'text' : 'password'}
        value={bearerToken}
        onChange={e => setBearerToken(e.target.value)}
        onBlur={handleTokenBlur}
        fullWidth
        sx={{ mb: 3 }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={() => setShowToken(prev => !prev)} edge="end">
                <Icon icon={showToken ? 'mdi:eye-off' : 'mdi:eye'} />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          variant="contained"
          onClick={handleTestConnection}
          disabled={!mcpServerUrl || !bearerToken || testing}
        >
          {testing ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
          Test Connection
        </Button>
      </Box>

      {testResult && (
        <Alert severity={testResult.success ? 'success' : 'error'} sx={{ mt: 2 }}>
          {testResult.message}
        </Alert>
      )}
    </Box>
  );
}
