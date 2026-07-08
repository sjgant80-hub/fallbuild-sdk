# fallbuild-sdk

`@ai-native-solutions/fallbuild-sdk` — sovereign single-file low-code app builder as a programmatic Node/ESM library.

Extracted verbatim from the fallbuild reference app: 8 widget primitives, 5 starter templates, and a self-contained HTML runtime you can save and open anywhere.

- **8 widgets** — `text`, `form`, `table`, `chart`, `button`, `image`, `container`, `filter`
- **5 templates** — `CRUD app`, `Dashboard`, `Lead capture`, `Pricing calculator`, `Internal tool`
- **3 demo datasets** — `customers`, `orders`, `products`
- **Standalone HTML export** — one file, no build step, no CDN, runs anywhere
- **Zero runtime dependencies** — pure ESM, MIT

## Install

```bash
npm install @ai-native-solutions/fallbuild-sdk
```

## Quick start

```js
import fb from '@ai-native-solutions/fallbuild-sdk';
import { writeFileSync } from 'node:fs';

const app  = fb.applyTemplate('CRUD app');
const html = fb.renderStandaloneHtml(app);
writeFileSync('customers.html', html);

// Or build from scratch
const app2 = fb.createApp('my tool');
fb.addWidget(app2, 0, 'text',   20, 20, 400, 40, { content: '# Hello' });
fb.addWidget(app2, 0, 'button', 20, 80, 140, 36, { label: 'Save', action: 'custom', code: 'alert("hi")' });
```

## API

### Widgets & data

- `WIDGETS` — palette metadata (label, icon, defaultProps, defaultSize) for all 8 primitives.
- `DEMO_DATA` — `customers`, `orders`, `products` sample rows.
- `TEMPLATE_NAMES` — the 5 template identifiers.
- `TEMPLATE_KEYWORDS` — regex table used by `routePrompt` for natural-language routing.

### App construction

- `createApp(name)` — app skeleton with one empty `home` page.
- `addPage(app, name)` — append a page, return it.
- `addWidget(app, pageIdx, type, x, y, w, h, props)` — add a widget to a page.
- `addDataSource(app, ds)` — append `{ name, type: 'demo'|'inline', ... }`.
- `mkWidget(type, x, y, w, h, props)` — build a widget without attaching it.

### Templates

- `applyTemplate(name)` — returns a fully populated app for one of `TEMPLATE_NAMES`.
- `routePrompt(prompt)` — matches free text against `TEMPLATE_KEYWORDS`; returns a template name or `null`.

### Export

- `renderStandaloneHtml(app, { bakeDemoData = true })` — single HTML string, self-contained, no external deps.
- `renderTemplateHtml(name, opts)` — convenience: `renderStandaloneHtml(applyTemplate(name), opts)`.

### Utilities

- `validateApp(app)` — array of error strings (empty = valid).
- `mdToHtml(md)` — tiny markdown subset (`#`, `##`, `###`, `**`, `*`, `` ` ``).
- `esc(s)` — HTML entity escape.

## Playground

Interactive playground at <https://sjgant80-hub.github.io/fallbuild-sdk/>. Pick a template, tweak the app JSON, download portable HTML.

## Companion packages

- [`@ai-native-solutions/fallbuild-mcp`](https://github.com/sjgant80-hub/fallbuild-mcp) — MCP stdio server
- [`@ai-native-solutions/fallbuild-api`](https://github.com/sjgant80-hub/fallbuild-api) — Express HTTP wrapper + Docker

## License

MIT · AI-Native Solutions · <https://ai-nativesolutions.com>
