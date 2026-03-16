const STYLE_ID = 'dot-ai-mermaid-styles';

export function injectMermaidStyles(): void {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes mermaidCollapsedPulse {
      0%, 100% { filter: drop-shadow(0 0 0px transparent); }
      50% { filter: drop-shadow(0 0 6px rgba(25, 118, 210, 0.5)); }
    }

    .mermaid-collapsed-pulse .label-container,
    .mermaid-collapsed-pulse rect {
      animation: mermaidCollapsedPulse 1s ease-in-out 2;
    }

    .mermaid-collapsible-header {
      cursor: pointer;
    }

    .mermaid-collapsible-header:hover {
      filter: brightness(1.2);
    }
  `;
  document.head.appendChild(style);
}
