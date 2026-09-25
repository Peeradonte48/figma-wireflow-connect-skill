#!/usr/bin/env node
// Verify a flow board the way a REST reader sees it: list every CONNECTOR in a Section with the
// node at each end. This is the check that matters. A VECTOR arrow looks the same on the canvas
// and does not show up here at all.
//
// Usage (Node 18+):
//   FIGMA_TOKEN=figd_... node 04-verify-rest.mjs <fileKey> <sectionId>
//
//   fileKey    the part after /design/ in the file URL
//   sectionId  the Section's node id, "2210:5530" or "2210-5530"
//
// depth=1 fetches the Section and its direct children only. That is where the skill puts both the
// screens and the connectors, and it keeps the call fast on a big board.
//
// Exit code: 0 when every connector joins two frames of the Section, 1 otherwise.

const [fileKey, rawId] = process.argv.slice(2);
const token = process.env.FIGMA_TOKEN;
if (!fileKey || !rawId || !token) {
  console.error('usage: FIGMA_TOKEN=... node 04-verify-rest.mjs <fileKey> <sectionId>');
  process.exit(2);
}
const sectionId = rawId.replace('-', ':');

const url = `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(sectionId)}&depth=1`;
const res = await fetch(url, { headers: { 'X-Figma-Token': token } });
if (!res.ok) {
  console.error(`Figma REST ${res.status}: ${await res.text()}`);
  process.exit(2);
}
const section = (await res.json()).nodes?.[sectionId]?.document;
if (!section) {
  console.error(`node ${sectionId} not found in ${fileKey}`);
  process.exit(2);
}

const children = section.children ?? [];
const byId = new Map(children.map((n) => [n.id, n]));
const frames = children.filter((n) => n.type === 'FRAME' && !n.name.startsWith('.'));
const connectors = children.filter((n) => n.type === 'CONNECTOR');
const arrowsThatAreNot = children.filter((n) => n.type === 'VECTOR' || n.type === 'LINE');

const nameOf = (id) => (byId.get(id)?.name ?? `(${id}, not a direct child of the Section)`);
let broken = 0;
console.log(`Section "${section.name}": ${frames.length} screen frames, ${connectors.length} connectors\n`);
for (const c of connectors) {
  const from = c.connectorStart?.endpointNodeId;
  const to = c.connectorEnd?.endpointNodeId;
  const ok = from && to && byId.get(from)?.type === 'FRAME' && byId.get(to)?.type === 'FRAME';
  if (!ok) broken++;
  const label = c.characters ? `  "${c.characters}"` : '';
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${nameOf(from)}  ->  ${nameOf(to)}${label}`);
}

const touched = new Set(connectors.flatMap((c) => [c.connectorStart?.endpointNodeId, c.connectorEnd?.endpointNodeId]));
const loose = frames.filter((f) => !touched.has(f.id));
if (loose.length) console.log(`\nframes no connector touches: ${loose.map((f) => f.name).join(', ')}`);
if (arrowsThatAreNot.length) {
  console.log(`\n${arrowsThatAreNot.length} VECTOR/LINE node(s) in the Section: arrows drawn by hand are invisible to a REST reader.`);
}

if (connectors.length === 0 || broken > 0) process.exit(1);
