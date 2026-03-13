import { Icon } from '@iconify/react';
import Editor from '@monaco-editor/react';
import { Box, IconButton, Tooltip, useTheme } from '@mui/material';
import React, { useState } from 'react';
import { CodeContent } from '../../types';

interface CodeRendererProps {
  content: CodeContent;
}

const LANGUAGE_MAP: Record<string, string> = {
  yml: 'yaml',
  sh: 'bash',
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  rb: 'ruby',
  md: 'markdown',
  tf: 'hcl',
};

function mapLanguage(lang: string): string {
  return LANGUAGE_MAP[lang] || lang;
}

export default function CodeRenderer({ content }: CodeRendererProps) {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);

  if (!content || !content.code) {
    return null;
  }

  const lineCount = content.code.split('\n').length;
  const height = Math.min(Math.max(lineCount * 20, 100), 500);
  const monacoTheme = theme.palette.mode === 'dark' ? 'vs-dark' : 'light';

  function handleCopy() {
    navigator.clipboard.writeText(content.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Box sx={{ position: 'relative', border: 1, borderColor: 'divider', borderRadius: 1 }}>
      <Tooltip title={copied ? 'Copied!' : 'Copy'}>
        <IconButton
          size="small"
          onClick={handleCopy}
          aria-label="Copy code"
          sx={{ position: 'absolute', top: 4, right: 4, zIndex: 1 }}
        >
          <Icon icon="mdi:content-copy" width={18} />
        </IconButton>
      </Tooltip>
      <Editor
        height={height}
        language={mapLanguage(content.language)}
        value={content.code}
        theme={monacoTheme}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: 'on',
          folding: false,
          wordWrap: 'on',
        }}
      />
    </Box>
  );
}
