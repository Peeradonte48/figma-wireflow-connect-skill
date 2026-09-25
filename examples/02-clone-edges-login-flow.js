// Example: connect a four-screen login flow, then a variant, with the skill's clone-connector.js.
// The ids below are made-up examples. Replace them with ids from your file
// (right-click a frame > Copy link, the node-id in the URL is the id with "-" turned into ":").
//
// Board (left to right):
//
//   [Login] --"กด เข้าสู่ระบบ"--> [OTP] --"กรอก OTP ครบ"--> [Choose shop] --"เลือกร้าน"--> [Home]
//      |
//      +--"กด ลืมรหัสผ่าน"--> [Forgot password]   (variant row, under Login)
//
// Run 1 (smoke test): keep only the first edge, check that startsAtSource is true.
// Run 2: put the other edges in and run again.
const PAGE_ID = '120:1';            // the page that holds the Section
const DONOR_ID = '1203:4471';       // any CONNECTOR in the file, from 01-find-donor.js
const SECTION_ID = '2210:5530';     // the Section that holds the screens
const EDGES = [
  ['2210:5601', '2210:5688', 'กด เข้าสู่ระบบ'],   // Login -> OTP
  ['2210:5688', '2210:5742', 'กรอก OTP ครบ'],     // OTP -> Choose shop
  ['2210:5742', '2210:5810', 'เลือกร้าน'],         // Choose shop -> Home
  ['2210:5601', '2210:5903', 'กด ลืมรหัสผ่าน'],   // Login -> Forgot password (goes down: BOTTOM/TOP)
];
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

// Example result:
// {
//   "createdNodeIds": ["2210:6001", "2210:6002", "2210:6003", "2210:6004"],
//   "out": [
//     { "id": "2210:6001", "from": "2210:5601", "to": "2210:5688", "startsAtSource": true, "box": [1446, 380, 326, 120] },
//     ...
//   ]
// }
//
// startsAtSource false: the connector kept the donor's old start point. Delete it,
// check that the source id is a frame (not a group or an instance inside it), and run that edge again.
