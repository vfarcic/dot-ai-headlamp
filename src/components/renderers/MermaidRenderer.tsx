import { Icon } from '@iconify/react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  CircularProgress,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  generateCollapsedCode,
  type ParsedMermaid,
  parseMermaid,
} from '../../utils/mermaidParser';
import { injectMermaidStyles } from './mermaidStyles';

interface MermaidRendererProps {
  content: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MermaidAPI = any;

const MERMAID_CDN_URL = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
const MERMAID_CALLBACK_NAME = '__mermaidToggle';
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

// Singleton: load mermaid once from CDN via script tag
let mermaidPromise: Promise<MermaidAPI> | null = null;

function loadMermaid(): Promise<MermaidAPI> {
  if (!mermaidPromise) {
    // Already loaded (e.g. by another plugin or previous load)
    if ((window as Record<string, MermaidAPI>).mermaid) {
      mermaidPromise = Promise.resolve((window as Record<string, MermaidAPI>).mermaid);
      return mermaidPromise;
    }

    mermaidPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = MERMAID_CDN_URL;
      script.async = true;
      script.onload = () => {
        const api = (window as Record<string, MermaidAPI>).mermaid;
        if (api) {
          resolve(api);
        } else {
          reject(new Error('Mermaid script loaded but API not found on window'));
        }
      };
      script.onerror = () => {
        mermaidPromise = null;
        reject(new Error('Failed to load Mermaid from CDN'));
      };
      document.head.appendChild(script);
    });
  }
  return mermaidPromise;
}

export default function MermaidRenderer({ content }: MermaidRendererProps) {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(true);
  const [mermaidApi, setMermaidApi] = useState<MermaidAPI>(null);

  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Parse Mermaid content to extract subgraph structure
  const parsedMermaid = useMemo<ParsedMermaid>(() => parseMermaid(content), [content]);

  // Collapsible subgraphs state
  const [collapsedSubgraphs, setCollapsedSubgraphs] = useState<Set<string>>(new Set());

  // Track content for which collapse state has been initialized
  const initializedContentRef = useRef<string>('');

  // Load mermaid from CDN
  useEffect(() => {
    loadMermaid()
      .then(api => setMermaidApi(api))
      .catch(err => setError(`Failed to load Mermaid library: ${err.message}`));
  }, []);

  // Set/reset collapsed state when content changes
  useEffect(() => {
    if (initializedContentRef.current === content) return;
    initializedContentRef.current = content;

    if (parsedMermaid.type === 'flowchart' && parsedMermaid.subgraphs.length > 0) {
      setCollapsedSubgraphs(new Set(parsedMermaid.subgraphs.map(sg => sg.id)));
    } else {
      setCollapsedSubgraphs(new Set());
    }
  }, [content, parsedMermaid]);

  // Toggle a subgraph's collapsed state
  const toggleSubgraph = useCallback((subgraphId: string) => {
    setCollapsedSubgraphs(prev => {
      const next = new Set(prev);
      if (next.has(subgraphId)) {
        next.delete(subgraphId);
      } else {
        next.add(subgraphId);
      }
      return next;
    });
  }, []);

  // Register the callback on window for Mermaid's click handlers
  useEffect(() => {
    (window as unknown as Record<string, (id: string) => void>)[MERMAID_CALLBACK_NAME] =
      toggleSubgraph;
    return () => {
      delete (window as unknown as Record<string, unknown>)[MERMAID_CALLBACK_NAME];
    };
  }, [toggleSubgraph]);

  // Generate display code based on collapsed state
  const displayCode = useMemo(() => {
    if (parsedMermaid.type !== 'flowchart' || collapsedSubgraphs.size === 0) {
      return content;
    }
    return generateCollapsedCode(parsedMermaid, collapsedSubgraphs, MERMAID_CALLBACK_NAME);
  }, [content, parsedMermaid, collapsedSubgraphs]);

  // Track previous content to know when to reset zoom/pan
  const prevContentRef = useRef<string>('');
  const hasAppliedInitialPulse = useRef<boolean>(false);

  // Initialize mermaid on theme change
  useEffect(() => {
    if (!mermaidApi) return;
    const isDark = theme.palette.mode === 'dark';
    mermaidApi.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'default',
      securityLevel: 'loose',
      themeVariables: isDark
        ? {
            primaryColor: theme.palette.primary.main,
            primaryTextColor: theme.palette.primary.contrastText,
            primaryBorderColor: theme.palette.primary.main,
            lineColor: theme.palette.text.secondary,
            secondaryColor: theme.palette.action.selected,
            tertiaryColor: theme.palette.background.paper,
            background: theme.palette.background.default,
            mainBkg: theme.palette.background.paper,
            secondBkg: theme.palette.background.default,
            fontFamily: theme.typography.fontFamily as string,
            fontSize: '14px',
            textColor: theme.palette.text.primary,
            nodeTextColor: theme.palette.text.primary,
          }
        : {
            primaryColor: theme.palette.primary.main,
            primaryTextColor: theme.palette.primary.contrastText,
            primaryBorderColor: theme.palette.primary.main,
            lineColor: theme.palette.text.secondary,
            secondaryColor: theme.palette.action.selected,
            tertiaryColor: theme.palette.grey[100],
            background: theme.palette.background.default,
            mainBkg: theme.palette.grey[100],
            secondBkg: theme.palette.background.default,
            fontFamily: theme.typography.fontFamily as string,
            fontSize: '14px',
            textColor: theme.palette.text.primary,
            nodeTextColor: theme.palette.text.primary,
          },
    });
  }, [theme.palette.mode, mermaidApi]);

  // Add click handlers to expanded subgraph headers after render
  const attachExpandedSubgraphHandlers = useCallback(
    (container: HTMLElement) => {
      if (parsedMermaid.type !== 'flowchart') return;

      const expandedSubgraphs = parsedMermaid.subgraphs.filter(
        sg => !collapsedSubgraphs.has(sg.id)
      );
      const clusters = container.querySelectorAll('.cluster');

      const normalizeLabel = (text: string) =>
        text
          .replace(/^▼\s*/, '')
          .replace(/^['"]|['"]$/g, '')
          .trim();

      for (const subgraph of expandedSubgraphs) {
        const normalizedSubgraphLabel = normalizeLabel(subgraph.label);
        let matchedCluster: Element | null = null;

        for (const cluster of clusters) {
          const labelSpan =
            cluster.querySelector('.cluster-label foreignObject span') ||
            cluster.querySelector('.cluster-label text') ||
            cluster.querySelector('.cluster-label p') ||
            cluster.querySelector('.nodeLabel') ||
            cluster.querySelector('text');

          if (!labelSpan) continue;

          const labelText = labelSpan.textContent || '';
          if (normalizeLabel(labelText) === normalizedSubgraphLabel) {
            matchedCluster = cluster;
            break;
          }
        }

        if (!matchedCluster) continue;

        let clusterLabel = matchedCluster.querySelector('.cluster-label');
        if (!clusterLabel) {
          clusterLabel = matchedCluster;
        }

        const foreignObject = clusterLabel.querySelector('foreignObject');
        const labelSpan =
          clusterLabel.querySelector('foreignObject span') ||
          clusterLabel.querySelector('.cluster-label text') ||
          clusterLabel.querySelector('text') ||
          clusterLabel.querySelector('p');

        if (labelSpan) {
          const labelText = labelSpan.textContent || '';
          if (!labelText.startsWith('▼')) {
            labelSpan.textContent = `▼ ${labelText}`;
            if (foreignObject) {
              const currentWidth = parseFloat(foreignObject.getAttribute('width') || '0');
              foreignObject.setAttribute('width', String(currentWidth + 20));
            }
          }
        }

        (clusterLabel as HTMLElement).style.cursor = 'pointer';
        clusterLabel.classList.add('mermaid-collapsible-header');

        const clickHandler = (e: Event) => {
          e.stopPropagation();
          e.preventDefault();
          toggleSubgraph(subgraph.id);
        };

        const newClusterLabel = clusterLabel.cloneNode(true) as HTMLElement;
        newClusterLabel.addEventListener('click', clickHandler);
        clusterLabel.parentNode?.replaceChild(newClusterLabel, clusterLabel);
      }
    },
    [parsedMermaid, collapsedSubgraphs, toggleSubgraph]
  );

  // Apply pulse animation to collapsed placeholder nodes
  const applyPulseToCollapsedNodes = useCallback(
    (container: HTMLElement) => {
      if (parsedMermaid.type !== 'flowchart' || collapsedSubgraphs.size === 0) return;
      const clickableNodes = container.querySelectorAll('.node.clickable');
      for (const node of clickableNodes) {
        node.classList.add('mermaid-collapsed-pulse');
      }
    },
    [parsedMermaid, collapsedSubgraphs]
  );

  // Render the diagram
  useEffect(() => {
    if (!mermaidApi) return;

    async function renderDiagram() {
      if (!svgContainerRef.current || !displayCode) return;

      setIsRendering(true);
      setError(null);
      injectMermaidStyles();

      try {
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        await mermaidApi.parse(displayCode);
        const { svg, bindFunctions } = await mermaidApi.render(id, displayCode);

        if (svgContainerRef.current) {
          svgContainerRef.current.innerHTML = svg;
          bindFunctions?.(svgContainerRef.current);
          attachExpandedSubgraphHandlers(svgContainerRef.current);

          if (prevContentRef.current !== content) {
            setZoom(1);
            setPan({ x: 0, y: 0 });
            prevContentRef.current = content;
            hasAppliedInitialPulse.current = false;
          }

          if (!hasAppliedInitialPulse.current) {
            applyPulseToCollapsedNodes(svgContainerRef.current);
            hasAppliedInitialPulse.current = true;
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to render diagram';
        setError(errorMessage);
      } finally {
        setIsRendering(false);
      }
    }

    renderDiagram();
  }, [
    mermaidApi,
    displayCode,
    content,
    attachExpandedSubgraphHandlers,
    applyPulseToCollapsedNodes,
  ]);

  // Zoom/pan handlers
  const handleZoomIn = useCallback(() => {
    setZoom(z => Math.min(z + ZOOM_STEP, MAX_ZOOM));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(z => Math.max(z - ZOOM_STEP, MIN_ZOOM));
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom(z => Math.min(Math.max(z + delta, MIN_ZOOM), MAX_ZOOM));
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 0) {
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    },
    [pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        setPan({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, [isFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Error fallback
  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to render diagram: {error}
        </Alert>
        <Accordion>
          <AccordionSummary expandIcon={<Icon icon="mdi:chevron-down" width={20} />}>
            <Typography variant="body2">Show raw Mermaid content</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box
              component="pre"
              sx={{
                p: 1,
                borderRadius: 1,
                bgcolor: 'action.hover',
                overflow: 'auto',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
              }}
            >
              {content}
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>
    );
  }

  // Loading mermaid from CDN
  if (!mermaidApi) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">
          Loading diagram renderer...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        ...(isFullscreen && { bgcolor: 'background.default', height: '100vh' }),
      }}
    >
      {/* Controls toolbar */}
      <Toolbar
        variant="dense"
        disableGutters
        sx={{
          minHeight: 36,
          gap: 0.5,
          px: 0.5,
          justifyContent: 'space-between',
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title="Zoom out">
            <span>
              <IconButton size="small" onClick={handleZoomOut} disabled={zoom <= MIN_ZOOM}>
                <Icon icon="mdi:minus" width={18} />
              </IconButton>
            </span>
          </Tooltip>
          <Typography variant="caption" sx={{ minWidth: 40, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </Typography>
          <Tooltip title="Zoom in">
            <span>
              <IconButton size="small" onClick={handleZoomIn} disabled={zoom >= MAX_ZOOM}>
                <Icon icon="mdi:plus" width={18} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Reset view">
            <IconButton size="small" onClick={handleReset}>
              <Icon icon="mdi:fit-to-screen" width={18} />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: { xs: 'none', sm: 'inline' }, mr: 1 }}
          >
            Scroll to zoom &bull; Drag to pan
          </Typography>
          <Tooltip title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            <IconButton size="small" onClick={toggleFullscreen}>
              <Icon icon={isFullscreen ? 'mdi:fullscreen-exit' : 'mdi:fullscreen'} width={18} />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>

      {/* Diagram viewport */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 1,
          border: 1,
          borderColor: 'divider',
          bgcolor: 'action.hover',
          cursor: isDragging ? 'grabbing' : 'grab',
          ...(isFullscreen
            ? { flex: 1 }
            : { minHeight: { xs: 250, sm: 400 }, maxHeight: { xs: '60vh', sm: '70vh' } }),
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {isRendering && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(0,0,0,0.3)',
              zIndex: 10,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Rendering diagram...
            </Typography>
          </Box>
        )}
        <Box
          ref={svgContainerRef}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100%',
            '& svg': { maxWidth: 'none' },
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
        />
      </Box>
    </Box>
  );
}
