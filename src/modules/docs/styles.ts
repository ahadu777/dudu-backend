/**
 * CSS styles for documentation portal pages
 * Extracted from router.ts for better maintainability
 */

// PRD List styles
export const prdListStyles = `
.prd-list {
  display: grid;
  gap: 20px;
}
.prd-card {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 20px;
  background: #fafafa;
  transition: all 0.2s;
  cursor: pointer;
  position: relative;
}
.prd-card:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  border-color: #3498db;
  transform: translateY(-2px);
}
.prd-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 15px;
}
.prd-title {
  font-size: 1.3em;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 5px;
}
.prd-title a {
  color: #3498db;
  text-decoration: none;
}
.prd-title a:hover {
  text-decoration: underline;
  color: #2980b9;
}
.prd-id {
  background: #3498db;
  color: white;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 0.85em;
  font-weight: 600;
  text-decoration: none;
  display: inline-block;
  transition: background 0.2s;
}
.prd-id:hover {
  background: #2980b9;
}
.prd-id-link {
  text-decoration: none;
}
.prd-meta {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  margin-bottom: 15px;
  font-size: 0.9em;
  color: #7f8c8d;
}
.meta-item {
  display: flex;
  align-items: center;
  gap: 5px;
}
.stories-section-inline {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #e0e0e0;
}
.stories-title-inline {
  font-size: 0.95em;
  font-weight: 600;
  color: #555;
  margin-bottom: 10px;
}
.stories-list-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.story-badge-inline {
  display: inline-block;
  padding: 4px 10px;
  background: #e8f4f8;
  border: 1px solid #bee5eb;
  border-radius: 4px;
  font-size: 0.85em;
}
.story-badge-inline a {
  color: #0c5460;
  text-decoration: none;
  font-weight: 500;
}
.story-badge-inline a:hover {
  text-decoration: underline;
}
`;

// Card grid styles
export const cardGridStyles = `
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}
.card-item {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 20px;
  background: #fafafa;
  transition: all 0.2s;
  cursor: pointer;
}
.card-item:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  border-color: #3498db;
  transform: translateY(-2px);
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 12px;
}
.card-title {
  font-size: 1.1em;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 5px;
}
.card-title a {
  color: #3498db;
  text-decoration: none;
}
.card-title a:hover {
  text-decoration: underline;
}
.status-badge {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.8em;
  font-weight: 600;
  white-space: nowrap;
}
.status-badge.Done {
  background: #d4edda;
  color: #155724;
}
.status-badge.Ready {
  background: #cce5ff;
  color: #004085;
}
.status-badge.In.Progress, .status-badge.PR {
  background: #fff3cd;
  color: #856404;
}
.status-badge.Deprecated {
  background: #f8d7da;
  color: #721c24;
}
.card-meta {
  font-size: 0.85em;
  color: #7f8c8d;
  margin-bottom: 10px;
}
.card-meta div {
  margin-bottom: 4px;
}
.related-stories {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #e0e0e0;
}
.related-stories-title {
  font-size: 0.85em;
  font-weight: 600;
  color: #555;
  margin-bottom: 6px;
}
.story-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.story-tag {
  display: inline-block;
  padding: 3px 8px;
  background: #e8f4f8;
  border: 1px solid #bee5eb;
  border-radius: 3px;
  font-size: 0.75em;
  color: #0c5460;
  text-decoration: none;
}
.story-tag:hover {
  background: #d1ecf1;
}
`;

// Story list styles
export const storyListStyles = `
.story-list {
  display: grid;
  gap: 15px;
}
.story-item {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 20px;
  background: #fafafa;
  transition: all 0.2s;
  cursor: pointer;
}
.story-item:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  border-color: #3498db;
  transform: translateY(-2px);
}
.story-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 10px;
}
.story-title {
  font-size: 1.15em;
  font-weight: 600;
  color: #2c3e50;
}
.story-title a {
  color: #3498db;
  text-decoration: none;
}
.story-title a:hover {
  text-decoration: underline;
}
.story-id {
  background: #3498db;
  color: white;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.85em;
  font-weight: 600;
}
.story-meta {
  display: flex;
  gap: 15px;
  font-size: 0.9em;
  color: #7f8c8d;
}
.story-meta a {
  color: #3498db;
  text-decoration: none;
}
.story-meta a:hover {
  text-decoration: underline;
}
`;

// Story detail styles
export const storyDetailStyles = `
.story-id-badge {
  background: #3498db;
  color: white;
  padding: 5px 12px;
  border-radius: 4px;
  font-size: 0.9em;
  display: inline-block;
  margin-bottom: 20px;
}
.section {
  margin-top: 30px;
}
.section h2 {
  color: #2c3e50;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 10px;
  margin-bottom: 15px;
}
.card-grid-detail {
  display: grid;
  gap: 15px;
  margin-top: 15px;
}
.card-item-detail {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 15px;
  background: #fafafa;
  transition: all 0.2s;
}
.card-item-detail:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  border-color: #3498db;
}
.card-item-detail a {
  color: #3498db;
  text-decoration: none;
  font-weight: 600;
}
.card-item-detail a:hover {
  text-decoration: underline;
}
.status-badge-detail {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.85em;
  font-weight: 600;
  margin-left: 10px;
}
.status-Done, .status-Complete {
  background: #d4edda;
  color: #155724;
}
.status-In.Progress {
  background: #fff3cd;
  color: #856404;
}
.status-Draft, .status-Ready, .status-Approved {
  background: #d1ecf1;
  color: #0c5460;
}
`;

// PRD detail - stories section styles (used in individual PRD view)
export const storiesSectionStyles = `
.stories-section {
  background: #e8f4f8;
  padding: 15px;
  border-radius: 6px;
  margin: 20px 0;
}
.stories-title {
  font-weight: 600;
  color: #0c5460;
  margin-bottom: 10px;
}
.stories-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.story-badge {
  display: inline-block;
  padding: 6px 12px;
  background: white;
  border: 1px solid #bee5eb;
  border-radius: 4px;
}
.story-badge a {
  color: #0c5460;
  text-decoration: none;
  font-weight: 500;
}
.story-badge a:hover {
  text-decoration: underline;
}
`;

// Sitemap styles
export const sitemapStyles = `
.sitemap-container {
  max-width: 1400px;
  margin: 0 auto;
}
.sitemap-header {
  margin-bottom: 30px;
}
.sitemap-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.stat-item {
  background: #f8f9fa;
  padding: 15px 25px;
  border-radius: 8px;
  text-align: center;
}
.stat-value {
  font-size: 2em;
  font-weight: 700;
  color: #3498db;
}
.stat-label {
  font-size: 0.9em;
  color: #7f8c8d;
}
.prd-section {
  margin-bottom: 30px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}
.prd-section-header {
  background: #3498db;
  color: white;
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.prd-section-title {
  font-size: 1.2em;
  font-weight: 600;
}
.prd-section-title a {
  color: white;
  text-decoration: none;
}
.prd-section-title a:hover {
  text-decoration: underline;
}
.prd-section-status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.85em;
  font-weight: 600;
}
.prd-section-status.Done {
  background: rgba(255,255,255,0.2);
}
.prd-section-status.In.Progress {
  background: #fff3cd;
  color: #856404;
}
.prd-section-status.Draft {
  background: #d1ecf1;
  color: #0c5460;
}
.stories-container {
  padding: 15px 20px;
  background: #fafafa;
}
.story-row {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  margin-bottom: 10px;
  background: white;
  overflow: hidden;
}
.story-row:last-child {
  margin-bottom: 0;
}
.story-row-header {
  padding: 12px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}
.story-row-title {
  font-weight: 600;
}
.story-row-title a {
  color: #2c3e50;
  text-decoration: none;
}
.story-row-title a:hover {
  color: #3498db;
}
.story-row-status {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 0.8em;
  font-weight: 600;
}
.story-row-status.Done {
  background: #d4edda;
  color: #155724;
}
.story-row-status.In.Progress {
  background: #fff3cd;
  color: #856404;
}
.story-row-status.Draft {
  background: #d1ecf1;
  color: #0c5460;
}
.cards-container {
  padding: 10px 15px;
}
.card-chip {
  display: inline-block;
  padding: 5px 12px;
  margin: 3px;
  border-radius: 4px;
  font-size: 0.85em;
  text-decoration: none;
  transition: all 0.2s;
}
.card-chip.Done {
  background: #d4edda;
  color: #155724;
}
.card-chip.Ready {
  background: #cce5ff;
  color: #004085;
}
.card-chip.In.Progress {
  background: #fff3cd;
  color: #856404;
}
.card-chip.Deprecated {
  background: #f8d7da;
  color: #721c24;
}
.card-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.no-stories {
  padding: 20px;
  text-align: center;
  color: #7f8c8d;
  font-style: italic;
}
`;

// Graph styles
export const graphStyles = `
.graph-container {
  max-width: 1600px;
  margin: 0 auto;
}
.graph-header {
  margin-bottom: 20px;
}
.graph-controls {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  align-items: center;
}
.graph-controls label {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}
.graph-controls select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9em;
}
.graph-legend {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
}
.legend-color {
  width: 20px;
  height: 20px;
  border-radius: 4px;
}
.legend-color.prd { background: #3498db; }
.legend-color.story { background: #2ecc71; }
.legend-color.card { background: #e74c3c; }
#graph-canvas {
  width: 100%;
  height: 700px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
}
.node-tooltip {
  position: absolute;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  max-width: 300px;
  z-index: 1000;
  display: none;
}
.node-tooltip.visible {
  display: block;
}
.tooltip-title {
  font-weight: 600;
  margin-bottom: 8px;
  color: #2c3e50;
}
.tooltip-meta {
  font-size: 0.85em;
  color: #7f8c8d;
}
.tooltip-meta div {
  margin-bottom: 4px;
}
`;

// Compliance styles
export const complianceStyles = `
.compliance-container {
  max-width: 1200px;
  margin: 0 auto;
}
.compliance-header {
  margin-bottom: 30px;
}
.score-section {
  display: flex;
  gap: 30px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}
.score-card {
  flex: 1;
  min-width: 200px;
  background: #f8f9fa;
  border-radius: 12px;
  padding: 25px;
  text-align: center;
}
.score-card.main {
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: white;
}
.score-value {
  font-size: 3em;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 10px;
}
.score-label {
  font-size: 0.9em;
  opacity: 0.9;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}
.stat-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
}
.stat-card-title {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e0e0e0;
}
.stat-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 0.9em;
}
.stat-row-label {
  color: #7f8c8d;
}
.stat-row-value {
  font-weight: 600;
}
.quick-wins {
  background: #d4edda;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
}
.quick-wins-title {
  font-weight: 600;
  color: #155724;
  margin-bottom: 10px;
}
.quick-wins ul {
  margin: 0;
  padding-left: 20px;
  color: #155724;
}
.violations-section {
  margin-top: 30px;
}
.violations-title {
  font-size: 1.3em;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 20px;
}
.violation-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 15px;
  overflow: hidden;
}
.violation-card.error {
  border-left: 4px solid #e74c3c;
}
.violation-card.warning {
  border-left: 4px solid #f39c12;
}
.violation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #f8f9fa;
  cursor: pointer;
}
.violation-header:hover {
  background: #f0f0f0;
}
.violation-type {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 0.8em;
  font-weight: 600;
}
.violation-type.error {
  background: #f8d7da;
  color: #721c24;
}
.violation-type.warning {
  background: #fff3cd;
  color: #856404;
}
.violation-category {
  font-weight: 600;
  color: #2c3e50;
}
.violation-file {
  font-size: 0.85em;
  color: #7f8c8d;
  font-family: monospace;
}
.violation-details {
  padding: 15px;
  border-top: 1px solid #e0e0e0;
  background: white;
}
.violation-issue {
  margin-bottom: 10px;
}
.violation-fix {
  background: #d4edda;
  padding: 10px;
  border-radius: 4px;
  font-size: 0.9em;
  margin-bottom: 10px;
}
.violation-impact {
  font-size: 0.85em;
  color: #7f8c8d;
}
`;

// Architecture styles
export const architectureStyles = `
.arch-container {
  max-width: 1400px;
  margin: 0 auto;
}
.arch-header {
  margin-bottom: 30px;
}
.arch-nav {
  display: flex;
  gap: 10px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}
.arch-nav-item {
  padding: 10px 20px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  text-decoration: none;
  color: #2c3e50;
  transition: all 0.2s;
}
.arch-nav-item:hover, .arch-nav-item.active {
  background: #3498db;
  color: white;
  border-color: #3498db;
}
.arch-section {
  margin-bottom: 40px;
}
.arch-section-title {
  font-size: 1.5em;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #3498db;
}
.arch-diagram {
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 30px;
  overflow-x: auto;
}
.arch-flowchart {
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
}
.arch-row {
  display: flex;
  gap: 20px;
  justify-content: center;
  flex-wrap: wrap;
}
.arch-box {
  padding: 15px 25px;
  border-radius: 8px;
  text-align: center;
  min-width: 150px;
  font-weight: 500;
}
.arch-box.client {
  background: #3498db;
  color: white;
}
.arch-box.api {
  background: #2ecc71;
  color: white;
}
.arch-box.service {
  background: #9b59b6;
  color: white;
}
.arch-box.data {
  background: #e74c3c;
  color: white;
}
.arch-box.external {
  background: #f39c12;
  color: white;
}
.arch-arrow {
  font-size: 1.5em;
  color: #7f8c8d;
}
.tech-stack {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}
.tech-category {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
}
.tech-category-title {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e0e0e0;
}
.tech-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}
.tech-item:last-child {
  border-bottom: none;
}
.tech-name {
  font-weight: 500;
}
.tech-version {
  color: #7f8c8d;
  font-size: 0.9em;
}
`;

// Coverage styles
export const coverageStyles = `
.coverage-container {
  max-width: 1400px;
  margin: 0 auto;
}
.coverage-header {
  margin-bottom: 30px;
}
.coverage-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}
.coverage-stat {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 25px;
  text-align: center;
}
.coverage-stat.main {
  background: linear-gradient(135deg, #2ecc71, #27ae60);
  color: white;
}
.coverage-stat-value {
  font-size: 2.5em;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 10px;
}
.coverage-stat-label {
  font-size: 0.9em;
  opacity: 0.9;
}
.coverage-section {
  margin-bottom: 30px;
}
.coverage-section-title {
  font-size: 1.3em;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e0e0e0;
}
.coverage-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.coverage-table th {
  background: #f8f9fa;
  padding: 15px;
  text-align: left;
  font-weight: 600;
  color: #2c3e50;
  border-bottom: 2px solid #e0e0e0;
}
.coverage-table td {
  padding: 12px 15px;
  border-bottom: 1px solid #f0f0f0;
}
.coverage-table tr:hover {
  background: #f8f9fa;
}
.coverage-bar {
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}
.coverage-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}
.coverage-bar-fill.high {
  background: #2ecc71;
}
.coverage-bar-fill.medium {
  background: #f39c12;
}
.coverage-bar-fill.low {
  background: #e74c3c;
}
.test-status {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8em;
  font-weight: 600;
}
.test-status.pass {
  background: #d4edda;
  color: #155724;
}
.test-status.fail {
  background: #f8d7da;
  color: #721c24;
}
.test-status.skip {
  background: #fff3cd;
  color: #856404;
}
`;

// Project docs styles
export const projectDocsStyles = `
.project-docs-container {
  max-width: 1200px;
  margin: 0 auto;
}
.docs-nav {
  display: flex;
  gap: 10px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}
.docs-nav-item {
  padding: 10px 20px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  text-decoration: none;
  color: #2c3e50;
  transition: all 0.2s;
}
.docs-nav-item:hover, .docs-nav-item.active {
  background: #3498db;
  color: white;
  border-color: #3498db;
}
.docs-content {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 30px;
}
.docs-content h1 {
  color: #2c3e50;
  margin-bottom: 20px;
}
.docs-content h2 {
  color: #34495e;
  margin-top: 30px;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e0e0e0;
}
.docs-content h3 {
  color: #7f8c8d;
  margin-top: 20px;
  margin-bottom: 10px;
}
.docs-content pre {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  overflow-x: auto;
}
.docs-content code {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
}
.docs-content pre code {
  background: none;
  padding: 0;
}
.docs-content ul, .docs-content ol {
  margin-left: 20px;
  margin-bottom: 15px;
}
.docs-content li {
  margin-bottom: 8px;
}
.docs-content a {
  color: #3498db;
}
.docs-content a:hover {
  text-decoration: underline;
}
.docs-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 15px 0;
}
.docs-content th, .docs-content td {
  border: 1px solid #e0e0e0;
  padding: 10px;
  text-align: left;
}
.docs-content th {
  background: #f8f9fa;
  font-weight: 600;
}
`;
