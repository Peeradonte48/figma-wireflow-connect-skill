// use_figma script: clone a donor CONNECTOR into a Section once per edge and verify by geometry.
// Fill in the ids. Run with ONE edge first (the smoke test), then with the rest.
const PAGE_ID = 'PAGE_OF_THE_SECTION';
const DONOR_ID = 'ANY_CONNECTOR_IN_THE_FILE'; // may live on another page
const SECTION_ID = 'SECTION_ID';
const EDGES = [['FROM_FRAME_ID', 'TO_FRAME_ID', 'trigger label']];
const BLUE = { r: 0.1451, g: 0.3882, b: 0.9216 };

await figma.setCurrentPageAsync(await figma.getNodeByIdAsync(PAGE_ID));
const donor = await figma.getNodeByIdAsync(DONOR_ID);
if (!donor || donor.type !== 'CONNECTOR') throw new Error('donor is not a CONNECTOR');
const sec = await figma.getNodeByIdAsync(SECTION_ID);
const FONT = (await figma.listAvailableFontsAsync()).some((f) => f.fontName.family === 'Noto Looped Thai' && f.fontName.style === 'Medium')
  ? { family: 'Noto Looped Thai', style: 'Medium' } : { family: 'Inter', style: 'Medium' }; // or the Section frames' own family
await figma.loadFontAsync(FONT);

const out = [];
for (const [s, d, label] of EDGES) {
  const S = await figma.getNodeByIdAsync(s), D = await figma.getNodeByIdAsync(d);
  const sb = S.absoluteBoundingBox, db = D.absoluteBoundingBox;
  const dx = db.x + db.width / 2 - (sb.x + sb.width / 2), dy = db.y + db.height / 2 - (sb.y + sb.height / 2);
  const [sm, dm] = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? ['RIGHT', 'LEFT'] : ['LEFT', 'RIGHT']) : (dy > 0 ? ['BOTTOM', 'TOP'] : ['TOP', 'BOTTOM']);
  const c = donor.clone();
  sec.appendChild(c);
  c.connectorStart = { endpointNodeId: s, magnet: sm };
  c.connectorEnd = { endpointNodeId: d, magnet: dm };
  c.set({ name: `${S.name.split(' ')[0]} → ${D.name.split(' ')[0]}`, connectorLineType: 'ELBOWED', strokeWeight: 4 });
  c.strokes = [{ type: 'SOLID', color: BLUE }];
  c.connectorStartStrokeCap = 'NONE';
  c.connectorEndStrokeCap = 'ARROW_LINES';
  if (label) {
    c.text.fontName = FONT;
    c.text.characters = label;
    c.text.fontSize = 28;
    c.text.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    c.textBackground.fills = [{ type: 'SOLID', color: BLUE }];
  }
  // Geometry check: the box must sit next to both frames on the chosen sides.
  const bb = c.absoluteBoundingBox;
  const srcEdge = sm === 'RIGHT' ? sb.x + sb.width : sm === 'LEFT' ? sb.x : sm === 'BOTTOM' ? sb.y + sb.height : sb.y;
  const near = (a, b) => Math.abs(a - b) <= 16;
  const startsAtSource = sm === 'RIGHT' ? near(bb.x, srcEdge) : sm === 'LEFT' ? near(bb.x + bb.width, srcEdge)
    : sm === 'BOTTOM' ? near(bb.y, srcEdge) : near(bb.y + bb.height, srcEdge);
  out.push({ id: c.id, from: s, to: d, startsAtSource, box: [bb.x, bb.y, bb.width, bb.height] });
}
return { createdNodeIds: out.map((o) => o.id), out };
