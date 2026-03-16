/**
 * Mermaid Flowchart Parser
 * Extracts subgraph structure from Mermaid flowchart source code
 * for implementing collapsible subgraphs feature.
 */

export interface ParsedSubgraph {
  id: string;
  label: string;
  content: string;
  nodeIds: string[];
  startIndex: number;
  endIndex: number;
  depth: number;
  parentId: string | null;
}

export interface ParsedMermaid {
  type: 'flowchart' | 'other';
  direction: string;
  subgraphs: ParsedSubgraph[];
  originalCode: string;
}

export interface ParsedEdge {
  source: string;
  target: string;
  label?: string;
  style: string;
  originalLine: string;
}

function isFlowchart(code: string): boolean {
  const trimmed = code.trim();
  return /^(graph|flowchart)\s+(TD|TB|BT|LR|RL|DT)/im.test(trimmed);
}

function getFlowchartDirection(code: string): string {
  const match = code.match(/^(graph|flowchart)\s+(TD|TB|BT|LR|RL|DT)/im);
  return match ? match[2].toUpperCase() : 'TD';
}

const MERMAID_KEYWORDS = new Set([
  'subgraph',
  'end',
  'graph',
  'flowchart',
  'direction',
  'style',
  'class',
  'click',
  'linkStyle',
  'classDef',
  'td',
  'tb',
  'bt',
  'lr',
  'rl',
  'dt',
]);

function isMermaidKeyword(str: string): boolean {
  return MERMAID_KEYWORDS.has(str.toLowerCase());
}

export function extractNodeIds(content: string): string[] {
  const nodeIds: string[] = [];
  const withoutComments = content.replace(/%%.*$/gm, '');

  const nodePatterns = [
    /(\w+)\s*\(\(\([^)]*\)\)\)/g,
    /(\w+)\s*\[[\\/][^\]]*[\\/]\]/g,
    /(\w+)\s*\[\[[^\]]*\]\]/g,
    /(\w+)\s*\(\[[^\]]*\]\)/g,
    /(\w+)\s*\[\([^)]*\)\]/g,
    /(\w+)\s*\{\{[^}]*\}\}/g,
    /(\w+)\s*\(\([^)]*\)\)/g,
    /(\w+)\s*\[(?:[^[\]]|\[[^\]]*\])*\]/g,
    /(\w+)\s*\((?:[^()]|\([^)]*\))*\)/g,
    /(\w+)\s*\{(?:[^{}]|\{[^}]*\})*\}/g,
    /(\w+)\s*>\s*[^\]]+\]/g,
  ];

  for (const pattern of nodePatterns) {
    let match;
    while ((match = pattern.exec(withoutComments)) !== null) {
      const nodeId = match[1];
      if (!isMermaidKeyword(nodeId) && !nodeIds.includes(nodeId)) {
        nodeIds.push(nodeId);
      }
    }
  }

  const edges = extractEdges(withoutComments);
  for (const edge of edges) {
    if (!isMermaidKeyword(edge.source) && !nodeIds.includes(edge.source)) {
      nodeIds.push(edge.source);
    }
    if (!isMermaidKeyword(edge.target) && !nodeIds.includes(edge.target)) {
      nodeIds.push(edge.target);
    }
  }

  return nodeIds;
}

function removeNestedSubgraphs(content: string): string {
  let result = '';
  let depth = 0;
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.match(/^subgraph\s+/)) {
      depth++;
    } else if (trimmed === 'end' && depth > 0) {
      depth--;
    } else if (depth === 0) {
      result += line + '\n';
    }
  }

  return result;
}

export function parseSubgraphs(code: string): ParsedSubgraph[] {
  const subgraphs: ParsedSubgraph[] = [];
  const lines = code.split('\n');

  const stack: Array<{
    id: string;
    label: string;
    startLine: number;
    startIndex: number;
    depth: number;
    parentId: string | null;
    contentStartIndex: number;
  }> = [];

  let currentIndex = 0;
  const generatedIds = new Set<string>();

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('%%')) {
      currentIndex += line.length + 1;
      continue;
    }

    const subgraphMatchId = trimmedLine.match(/^subgraph\s+(\w+)(?:\s*\[([^\]]*)\])?/);
    const subgraphMatchQuoted = trimmedLine.match(/^subgraph\s+"([^"]+)"/);
    const subgraphMatch = subgraphMatchId || subgraphMatchQuoted;

    if (subgraphMatch) {
      let id: string;
      let label: string;

      if (subgraphMatchQuoted && !subgraphMatchId) {
        label = subgraphMatchQuoted[1];
        const baseId = label.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        id = baseId;
        let counter = 1;
        while (generatedIds.has(id)) {
          id = `${baseId}_${counter++}`;
        }
        generatedIds.add(id);
      } else if (subgraphMatchId) {
        id = subgraphMatchId[1];
        label = subgraphMatchId[2] || id;
      } else {
        currentIndex += line.length + 1;
        continue;
      }
      const depth = stack.length;
      const parentId = stack.length > 0 ? stack[stack.length - 1].id : null;

      stack.push({
        id,
        label,
        startLine: lineNum,
        startIndex: currentIndex,
        depth,
        parentId,
        contentStartIndex: currentIndex + line.length + 1,
      });
    }

    if (trimmedLine === 'end' && stack.length > 0) {
      const subgraph = stack.pop()!;
      const endIndex = currentIndex + line.length;
      const contentEndIndex = currentIndex;
      const content = code.slice(subgraph.contentStartIndex, contentEndIndex).trim();
      const contentWithoutNestedSubgraphs = removeNestedSubgraphs(content);
      const nodeIds = extractNodeIds(contentWithoutNestedSubgraphs);

      subgraphs.push({
        id: subgraph.id,
        label: subgraph.label,
        content,
        nodeIds,
        startIndex: subgraph.startIndex,
        endIndex,
        depth: subgraph.depth,
        parentId: subgraph.parentId,
      });
    }

    currentIndex += line.length + 1;
  }

  return subgraphs.sort((a, b) => a.startIndex - b.startIndex);
}

export function parseMermaid(code: string): ParsedMermaid {
  if (!isFlowchart(code)) {
    return {
      type: 'other',
      direction: '',
      subgraphs: [],
      originalCode: code,
    };
  }

  return {
    type: 'flowchart',
    direction: getFlowchartDirection(code),
    subgraphs: parseSubgraphs(code),
    originalCode: code,
  };
}

function getChildSubgraphs(parsed: ParsedMermaid, parentId: string): ParsedSubgraph[] {
  return parsed.subgraphs.filter(sg => sg.parentId === parentId);
}

function countSubgraphNodes(parsed: ParsedMermaid, subgraphId: string): number {
  const subgraph = parsed.subgraphs.find(sg => sg.id === subgraphId);
  if (!subgraph) return 0;

  let count = subgraph.nodeIds.length;
  const children = getChildSubgraphs(parsed, subgraphId);
  for (const child of children) {
    count += countSubgraphNodes(parsed, child.id);
  }

  return count;
}

// Arrow patterns for Mermaid edges (ordered by specificity)
const ARROW_PATTERNS = [
  '<-->',
  'o--o',
  'x--x',
  '==>',
  '===',
  '-\\.\\s*[^.]+\\s*\\.->',
  '-\\.\\s*[^.]+\\s*\\.-',
  '-.->',
  '-.-',
  '--\\s*[^-]+\\s*-->',
  '--\\s*[^-]+\\s*---',
  '--o',
  '--x',
  'o--',
  'x--',
  '-->',
  '---',
];

const ARROW_REGEX_PART = ARROW_PATTERNS.map(p => {
  if (p.includes('\\s')) return `(${p})`;
  return `(${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`;
}).join('|');

const SIMPLE_EDGE_REGEX = new RegExp(
  `^\\s*(\\w+)\\s*(?:${ARROW_REGEX_PART})\\s*(?:\\|([^|]*)\\|\\s*)?(\\w+)`
);

export function extractEdges(code: string): ParsedEdge[] {
  const edges: ParsedEdge[] = [];
  const lines = code.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    if (
      trimmed.startsWith('%%') ||
      trimmed.startsWith('subgraph') ||
      trimmed === 'end' ||
      trimmed.match(/^(graph|flowchart)\s+/i) ||
      trimmed.match(/^(style|class|click|linkStyle)\s+/i) ||
      trimmed.match(/^direction\s+/i)
    ) {
      continue;
    }

    const lineEdges = parseEdgeLine(trimmed, line);
    edges.push(...lineEdges);
  }

  return edges;
}

function extractNodeId(nodePart: string): string {
  const withoutPipeLabel = nodePart.replace(/^\|[^|]*\|\s*/, '');
  const match = withoutPipeLabel.match(/^(\w+)/);
  return match ? match[1] : '';
}

function extractArrowText(arrow: string): string {
  const dashMatch = arrow.match(/^--\s*(.+?)\s*-->$/);
  if (dashMatch) return dashMatch[1];
  const dotMatch = arrow.match(/^-\.\s*(.+?)\s*\.->$/);
  if (dotMatch) return dotMatch[1];
  return '';
}

function normalizeArrowStyle(arrow: string): string {
  if (arrow.match(/^--\s*.+\s*-->$/)) return '-->';
  if (arrow.match(/^--\s*.+\s*---$/)) return '---';
  if (arrow.match(/^-\.\s*.+\s*\.->$/)) return '-.->';
  if (arrow.match(/^-\.\s*.+\s*\.-$/)) return '-.-';
  return arrow;
}

function parseEdgeLine(trimmed: string, originalLine: string): ParsedEdge[] {
  const edges: ParsedEdge[] = [];

  const parallelMatch = trimmed.match(
    /^([\w\s&]+?)\s*(-->|---|-\.->|-\.-|==>|===|--[ox]|o--o|x--x|<-->|-\.[^.]+\.->|--[^-]+-->)\s*(?:\|([^|]*)\|\s*)?([\w[\](){}'"<>\s&]+)$/
  );

  if (parallelMatch) {
    const sourcePart = parallelMatch[1];
    const style = normalizeArrowStyle(parallelMatch[2]);
    const label = parallelMatch[3] || extractArrowText(parallelMatch[2]);
    const targetPart = parallelMatch[4];

    const sources = sourcePart
      .split('&')
      .map(s => extractNodeId(s.trim()))
      .filter(Boolean);
    const targets = targetPart
      .split('&')
      .map(t => extractNodeId(t.trim()))
      .filter(Boolean);

    for (const source of sources) {
      for (const target of targets) {
        if (source && target) {
          edges.push({ source, target, label, style, originalLine });
        }
      }
    }

    return edges;
  }

  const chainedEdges = parseChainedEdges(trimmed, originalLine);
  if (chainedEdges.length > 0) {
    return chainedEdges;
  }

  const simpleMatch = trimmed.match(SIMPLE_EDGE_REGEX);
  if (simpleMatch) {
    const source = simpleMatch[1];
    let style = '';
    let labelFromArrow = '';
    for (let i = 2; i < simpleMatch.length - 2; i++) {
      if (simpleMatch[i]) {
        const arrowText = simpleMatch[i];
        labelFromArrow = extractArrowText(arrowText);
        style = normalizeArrowStyle(arrowText);
        break;
      }
    }
    const pipeLabel = simpleMatch[simpleMatch.length - 2];
    const target = simpleMatch[simpleMatch.length - 1];

    edges.push({
      source,
      target,
      label: pipeLabel || labelFromArrow || undefined,
      style: style || '-->',
      originalLine,
    });
  }

  return edges;
}

function parseChainedEdges(line: string, originalLine: string): ParsedEdge[] {
  const edges: ParsedEdge[] = [];
  const arrowRegex =
    /(-->|---|-\.->|-\.-|==>|===|--[ox]|o--o|x--x|<-->|-\.[^.]+\.->|--[^-]+-->)/g;

  const parts = line.split(arrowRegex);

  if (parts.length < 3) return [];

  for (let i = 0; i < parts.length - 2; i += 2) {
    const sourcePart = parts[i].trim();
    const arrow = parts[i + 1];
    const targetPart = parts[i + 2].trim();

    const source = extractNodeId(sourcePart);
    const target = extractNodeId(targetPart);

    let label = extractArrowText(arrow);
    const pipeMatch = targetPart.match(/^\|([^|]*)\|\s*(\w+)/);
    if (pipeMatch) {
      label = pipeMatch[1];
    }

    if (source && target) {
      edges.push({
        source,
        target,
        label: label || undefined,
        style: normalizeArrowStyle(arrow),
        originalLine,
      });
    }
  }

  return edges;
}

function findOutermostCollapsedAncestor(
  parsed: ParsedMermaid,
  subgraphId: string,
  collapsedIds: Set<string>
): string | null {
  const subgraph = parsed.subgraphs.find(sg => sg.id === subgraphId);
  if (!subgraph) return null;

  let current: ParsedSubgraph | undefined = subgraph;
  let outermostCollapsed: string | null = null;

  while (current) {
    if (collapsedIds.has(current.id)) {
      outermostCollapsed = current.id;
    }
    if (current.parentId) {
      current = parsed.subgraphs.find(sg => sg.id === current!.parentId);
    } else {
      break;
    }
  }

  return outermostCollapsed;
}

function getHiddenNodes(
  parsed: ParsedMermaid,
  collapsedIds: Set<string>
): Map<string, string> {
  const hiddenNodes = new Map<string, string>();

  function collectNodes(subgraphId: string, rootCollapsedId: string) {
    const subgraph = parsed.subgraphs.find(sg => sg.id === subgraphId);
    if (!subgraph) return;

    for (const nodeId of subgraph.nodeIds) {
      hiddenNodes.set(nodeId, rootCollapsedId);
    }

    const children = getChildSubgraphs(parsed, subgraphId);
    for (const child of children) {
      hiddenNodes.set(child.id, rootCollapsedId);
      collectNodes(child.id, rootCollapsedId);
    }
  }

  for (const collapsedId of collapsedIds) {
    const outermostAncestor = findOutermostCollapsedAncestor(parsed, collapsedId, collapsedIds);
    if (outermostAncestor === collapsedId) {
      collectNodes(collapsedId, collapsedId);
    }
  }

  return hiddenNodes;
}

export function generateCollapsedCode(
  parsed: ParsedMermaid,
  collapsedIds: Set<string>,
  callbackName: string = '__mermaidToggle'
): string {
  if (collapsedIds.size === 0 || parsed.type !== 'flowchart') {
    return parsed.originalCode;
  }

  const lines: string[] = [];
  const clickDirectives: string[] = [];
  const hiddenNodes = getHiddenNodes(parsed, collapsedIds);
  const originalLines = parsed.originalCode.split('\n');

  const headerMatch = parsed.originalCode.match(/^(graph|flowchart)\s+(TD|TB|BT|LR|RL|DT)/im);
  if (headerMatch) {
    lines.push(headerMatch[0]);
  }

  let inCollapsedSubgraph = false;
  let collapsedDepth = 0;

  for (const line of originalLines) {
    const trimmed = line.trim();

    if (trimmed.match(/^(graph|flowchart)\s+(TD|TB|BT|LR|RL|DT)/i)) {
      continue;
    }

    if (trimmed.startsWith('%%')) {
      lines.push(line);
      continue;
    }

    const subgraphMatchId = trimmed.match(/^subgraph\s+(\w+)/);
    const subgraphMatchQuoted = trimmed.match(/^subgraph\s+"([^"]+)"/);

    if (subgraphMatchId || subgraphMatchQuoted) {
      let subgraphId: string;

      if (subgraphMatchQuoted && !subgraphMatchId) {
        const label = subgraphMatchQuoted[1];
        subgraphId = label.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      } else if (subgraphMatchId) {
        subgraphId = subgraphMatchId[1];
      } else {
        lines.push(line);
        continue;
      }

      if (inCollapsedSubgraph) {
        collapsedDepth++;
        continue;
      }

      if (collapsedIds.has(subgraphId)) {
        const subgraph = parsed.subgraphs.find(sg => sg.id === subgraphId);
        const outermostAncestor = findOutermostCollapsedAncestor(
          parsed,
          subgraphId,
          collapsedIds
        );

        if (outermostAncestor === subgraphId) {
          if (subgraph) {
            const nodeCount = countSubgraphNodes(parsed, subgraphId);
            const safeLabel = subgraph.label.replace(/"/g, "'");
            const itemText = nodeCount === 1 ? '1 item' : `${nodeCount} items`;
            const placeholder = `    ${subgraphId}["▶ ${safeLabel} • ${itemText}"]:::collapsedPulse`;
            lines.push(placeholder);
            clickDirectives.push(`    click ${subgraphId} ${callbackName}`);
          }
        }
        inCollapsedSubgraph = true;
        collapsedDepth = 1;
        continue;
      }

      const subgraph = parsed.subgraphs.find(sg => sg.id === subgraphId);
      if (subgraph && subgraph.parentId && collapsedIds.has(subgraph.parentId)) {
        continue;
      }

      lines.push(line);
      continue;
    }

    if (trimmed === 'end') {
      if (inCollapsedSubgraph) {
        collapsedDepth--;
        if (collapsedDepth === 0) {
          inCollapsedSubgraph = false;
        }
        continue;
      }
      lines.push(line);
      continue;
    }

    if (inCollapsedSubgraph) {
      continue;
    }

    if (trimmed.match(/^direction\s+(TD|TB|BT|LR|RL|DT)/i)) {
      lines.push(line);
      continue;
    }

    const linkStyleMatch = trimmed.match(/^linkStyle\s+(\d+(?:\s*,\s*\d+)*)\s+/);
    if (linkStyleMatch) {
      lines.push(line);
      continue;
    }

    const lineEdges = parseEdgeLine(trimmed, line);
    if (lineEdges.length > 0) {
      const rewrittenEdges: ParsedEdge[] = [];

      for (const edge of lineEdges) {
        const newSource = hiddenNodes.get(edge.source) || edge.source;
        const newTarget = hiddenNodes.get(edge.target) || edge.target;

        if (hiddenNodes.has(edge.source) && hiddenNodes.has(edge.target)) {
          const sourceParent = hiddenNodes.get(edge.source);
          const targetParent = hiddenNodes.get(edge.target);
          if (sourceParent === targetParent) {
            continue;
          }
        }

        const isDuplicate = rewrittenEdges.some(
          e => e.source === newSource && e.target === newTarget
        );
        if (!isDuplicate) {
          rewrittenEdges.push({
            source: newSource,
            target: newTarget,
            label: edge.label,
            style: edge.style,
            originalLine: edge.originalLine,
          });
        }
      }

      for (const edge of rewrittenEdges) {
        const labelPart = edge.label ? `|${edge.label}| ` : '';
        lines.push(`    ${edge.source} ${edge.style} ${labelPart}${edge.target}`);
      }
      continue;
    }

    const nodeDefMatch = trimmed.match(/^(\w+)\s*[[({>]/);
    if (nodeDefMatch) {
      const nodeId = nodeDefMatch[1];
      if (hiddenNodes.has(nodeId)) {
        continue;
      }
    }

    const styleMatch = trimmed.match(/^(style|class)\s+(\w+)/);
    if (styleMatch && hiddenNodes.has(styleMatch[2])) {
      continue;
    }

    const classDefMatch = trimmed.match(/^classDef\s+(\w+)/);
    if (classDefMatch) {
      lines.push(line);
      continue;
    }

    lines.push(line);
  }

  if (clickDirectives.length > 0) {
    lines.push('');
    lines.push(...clickDirectives);
  }

  return lines.join('\n');
}
