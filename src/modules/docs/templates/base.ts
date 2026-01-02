/**
 * Base layout and shared styles for documentation pages
 */

export const sharedStyles = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  line-height: 1.6;
  color: #333;
  background: #f5f5f5;
  padding: 20px;
}
.container {
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow-x: hidden;
  word-wrap: break-word;
}
.container.wide {
  max-width: 1400px;
}
.container.narrow {
  max-width: 1000px;
}
h1 {
  color: #2c3e50;
  margin-bottom: 10px;
  border-bottom: 3px solid #3498db;
  padding-bottom: 10px;
}
.subtitle {
  color: #7f8c8d;
  margin-bottom: 30px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.nav-links {
  display: flex;
  gap: 15px;
  font-size: 0.9em;
}
.nav-links a {
  color: #3498db;
  text-decoration: none;
  padding: 5px 10px;
  border-radius: 4px;
  transition: background 0.2s;
}
.nav-links a:hover {
  background: #e8f4f8;
}
.back-link {
  display: inline-block;
  margin-bottom: 20px;
  color: #3498db;
  text-decoration: none;
  font-weight: 500;
}
.back-link:hover {
  text-decoration: underline;
}
.metadata {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
  border-left: 4px solid #3498db;
}
.metadata-item {
  margin: 8px 0;
  font-size: 0.95em;
}
.metadata-item strong {
  color: #555;
  margin-right: 8px;
}
.stats-bar {
  display: flex;
  gap: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
  margin-bottom: 25px;
  flex-wrap: wrap;
}
.stat-item {
  font-size: 0.9em;
}
.stat-item strong {
  color: #2c3e50;
}
.status {
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 0.85em;
  font-weight: 500;
}
.status.Implemented, .status.Done, .status.Production {
  background: #d4edda;
  color: #155724;
}
.status.Draft, .status.In.Progress, .status.PR {
  background: #fff3cd;
  color: #856404;
}
.status.Ready {
  background: #cce5ff;
  color: #004085;
}
.status.Deprecated {
  background: #f8d7da;
  color: #721c24;
}
.content {
  margin-top: 20px;
  padding: 20px;
  background: #f9f9f9;
  border-radius: 4px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  font-size: 0.95em;
  line-height: 1.8;
  color: #2c3e50;
  overflow-x: auto;
  word-wrap: break-word;
  max-width: 100%;
}
.content h1, .content h2, .content h3 {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  color: #2c3e50;
}
.content h1 { font-size: 1.8em; border-bottom: 2px solid #3498db; padding-bottom: 0.3em; }
.content h2 { font-size: 1.5em; border-bottom: 1px solid #e0e0e0; padding-bottom: 0.3em; }
.content h3 { font-size: 1.2em; }
.content p { margin: 1em 0; }
.content ul, .content ol { margin: 1em 0; padding-left: 2em; }
.content li { margin: 0.5em 0; }
.content code {
  background: #f4f4f4;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
  word-break: break-all;
}
.content pre {
  background: #2c3e50;
  color: #ecf0f1;
  padding: 15px;
  border-radius: 5px;
  overflow-x: auto;
  margin: 1em 0;
  max-width: 100%;
}
.content pre code {
  background: transparent;
  padding: 0;
  color: inherit;
  word-break: normal;
}
.content a {
  color: #3498db;
  text-decoration: none;
}
.content a:hover {
  text-decoration: underline;
}
.content strong {
  font-weight: 600;
  color: #2c3e50;
}
`;

export interface BaseLayoutProps {
  title: string;
  containerClass?: 'wide' | 'narrow' | '';
  styles?: string;
  scripts?: string;
}

export function baseLayout(props: BaseLayoutProps, content: string): string {
  const containerClass = props.containerClass ? `container ${props.containerClass}` : 'container';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <base href="/">
  <title>${props.title}</title>
  <style>
    ${sharedStyles}
    ${props.styles || ''}
  </style>
</head>
<body>
  <div class="${containerClass}">
    ${content}
  </div>
  ${props.scripts || ''}
</body>
</html>`;
}
