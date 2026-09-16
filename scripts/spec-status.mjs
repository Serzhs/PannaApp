import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Renders every spec's requirements and acceptance criteria into one HTML page, so
 * what is done and what is not can be followed without opening six markdown files.
 * Regenerate with `pnpm specs:status`; the page is derived, never edited.
 */
const specsDir = resolve(import.meta.dirname, '../specs');
const out = join(specsDir, 'status.html');

function escape(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Just enough markdown: code, bold, italics, links. The specs use nothing else inline. */
function inline(text) {
  return escape(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function parseSpec(file) {
  const lines = readFileSync(join(specsDir, file), 'utf8').split('\n');
  const spec = { file, title: '', status: '', goal: '', sections: [], criteria: [], open: [] };
  let section = null;
  for (const line of lines) {
    if (line.startsWith('# ')) {
      spec.title = line.slice(2).trim();
      continue;
    }
    const status = /^\*\*Status:\*\*\s*(.+)$/.exec(line);
    if (status) {
      spec.status = status[1].trim();
      continue;
    }
    if (line.startsWith('## ')) {
      section = { name: line.slice(3).trim(), lines: [] };
      spec.sections.push(section);
      continue;
    }
    if (section) section.lines.push(line);
  }
  const goal = spec.sections.find((s) => s.name === 'Goal');
  spec.goal = goal ? goal.lines.join(' ').trim() : '';
  const criteria = spec.sections.find((s) => s.name === 'Acceptance criteria');
  for (const line of criteria ? criteria.lines : []) {
    const item = /^- \[( |x)\] (.*)$/.exec(line);
    if (item) spec.criteria.push({ done: item[1] === 'x', text: item[2] });
  }
  const open = spec.sections.find((s) => s.name === 'Open questions');
  spec.open = open
    ? open.lines.filter((l) => /^\d+\. /.test(l)).map((l) => l.replace(/^\d+\. /, ''))
    : [];
  return spec;
}

function readIndex() {
  const readme = readFileSync(join(specsDir, 'README.md'), 'utf8');
  const rows = [];
  for (const line of readme.split('\n')) {
    const row =
      /^\|\s*(?:\[(\d{4})\]\([^)]+\)|(\d{4}))\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/.exec(
        line,
      );
    if (row) rows.push({ number: row[1] ?? row[2], title: row[3], status: row[4], goal: row[5] });
  }
  return rows;
}

const specs = readdirSync(specsDir)
  .filter((f) => /^\d{4}-.*\.md$/.test(f))
  .sort()
  .map(parseSpec);
const index = readIndex();

const totalDone = specs.reduce((n, s) => n + s.criteria.filter((c) => c.done).length, 0);
const totalAll = specs.reduce((n, s) => n + s.criteria.length, 0);

const statusClass = (status) => status.toLowerCase().replace(/\s+/g, '-');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Panna spec status</title>
<style>
  :root { --ink: #1c1917; --muted: #57534e; --line: #e7e5e4; --paper: #fafaf9; --ok: #24654a; --todo: #b03027; --accent: #4a6d8c; }
  body { margin: 0; font: 16px/1.5 -apple-system, system-ui, sans-serif; color: var(--ink); background: var(--paper); }
  main { max-width: 900px; margin: 0 auto; padding: 32px 20px 64px; }
  h1 { font-size: 28px; margin: 0 0 4px; }
  h2 { font-size: 22px; margin: 40px 0 8px; }
  h3 { font-size: 16px; margin: 24px 0 8px; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; }
  .summary { color: var(--muted); margin: 0 0 24px; }
  .bar { height: 8px; background: var(--line); border-radius: 4px; overflow: hidden; margin: 8px 0 16px; }
  .bar > div { height: 100%; background: var(--ok); }
  table { border-collapse: collapse; width: 100%; font-size: 15px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
  th { color: var(--muted); font-weight: 600; }
  .status { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 13px; font-weight: 600; border: 1px solid var(--line); }
  .status.done { color: var(--ok); border-color: var(--ok); }
  .status.approved, .status.in-progress { color: var(--accent); border-color: var(--accent); }
  .status.draft, .status.not-written { color: var(--muted); }
  ul.criteria { list-style: none; padding: 0; margin: 0; }
  ul.criteria li { padding: 8px 0 8px 32px; border-bottom: 1px solid var(--line); position: relative; }
  ul.criteria li::before { content: "○"; position: absolute; left: 6px; color: var(--todo); font-weight: 700; }
  ul.criteria li.done::before { content: "✓"; color: var(--ok); }
  ul.criteria li em { color: var(--muted); }
  code { font: 13px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; background: #f0efed; padding: 1px 4px; border-radius: 3px; }
  .goal { margin: 0 0 8px; }
  .open { padding-left: 20px; }
  details { margin: 8px 0; }
  summary { cursor: pointer; color: var(--accent); }
  .generated { color: var(--muted); font-size: 13px; margin-top: 48px; }
</style>
</head>
<body>
<main>
<h1>Panna spec status</h1>
<p class="summary">${totalDone} of ${totalAll} acceptance criteria verified across ${specs.length} written specs.</p>
<div class="bar"><div style="width: ${totalAll ? Math.round((100 * totalDone) / totalAll) : 0}%"></div></div>

<h2>All specs</h2>
<table>
<thead><tr><th>#</th><th>Title</th><th>Status</th><th>Criteria</th><th>Goal</th></tr></thead>
<tbody>
${index
  .map((row) => {
    const spec = specs.find((s) => s.file.startsWith(row.number));
    const done = spec ? spec.criteria.filter((c) => c.done).length : 0;
    const all = spec ? spec.criteria.length : 0;
    const link = spec ? `<a href="#spec-${row.number}">${row.number}</a>` : row.number;
    return `<tr><td>${link}</td><td>${inline(row.title)}</td><td><span class="status ${statusClass(row.status)}">${inline(row.status)}</span></td><td>${spec ? `${done} / ${all}` : '–'}</td><td>${inline(row.goal)}</td></tr>`;
  })
  .join('\n')}
</tbody>
</table>

${specs
  .map((spec) => {
    const number = spec.file.slice(0, 4);
    const done = spec.criteria.filter((c) => c.done).length;
    const requirements = spec.sections.filter((s) =>
      [
        'Goal',
        'Out of scope',
        'Data model',
        'API contract',
        'UI',
        'Components',
        'Translation',
        'Units',
      ].includes(s.name),
    );
    return `
<section id="spec-${number}">
<h2>${inline(spec.title)} <span class="status ${statusClass(spec.status)}">${inline(spec.status)}</span></h2>
<p class="goal">${inline(spec.goal)}</p>
<p class="summary">${done} of ${spec.criteria.length} acceptance criteria verified.</p>
<div class="bar"><div style="width: ${spec.criteria.length ? Math.round((100 * done) / spec.criteria.length) : 0}%"></div></div>

<h3>Acceptance criteria</h3>
<ul class="criteria">
${spec.criteria.map((c) => `<li class="${c.done ? 'done' : 'todo'}">${inline(c.text)}</li>`).join('\n')}
</ul>
${
  spec.open.length
    ? `<h3>Open questions</h3><ol class="open">${spec.open.map((q) => `<li>${inline(q)}</li>`).join('')}</ol>`
    : ''
}
<details><summary>Requirements, as written in the spec</summary>
${requirements
  .map(
    (s) =>
      `<h3>${inline(s.name)}</h3>${s.lines
        .filter((l) => l.trim() !== '')
        .map((l) => (l.startsWith('- ') ? `<li>${inline(l.slice(2))}</li>` : `<p>${inline(l)}</p>`))
        .join('\n')}`,
  )
  .join('\n')}
</details>
</section>`;
  })
  .join('\n')}

<p class="generated">Generated from <code>specs/*.md</code> by <code>pnpm specs:status</code> on ${new Date().toISOString().slice(0, 10)}. Edit the specs, not this page.</p>
</main>
</body>
</html>
`;

writeFileSync(out, html);
console.log(`wrote ${out}: ${totalDone}/${totalAll} criteria verified`);
