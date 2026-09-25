// use_figma script: re-set every connector's magnets in a Section after the frames moved.
//
// A magnet is fixed when it is set. Move the target frame from the right of its source to below
// it and the connector still leaves from RIGHT and bends around the board. Run this after every
// layout pass: each connector gets the side that faces its other end again.
const SECTION_ID = '2210:5530';

const sec = await figma.getNodeByIdAsync(SECTION_ID);
if (!sec || sec.type !== 'SECTION') throw new Error(`${SECTION_ID} is not a Section`);

const out = [];
for (const c of sec.findAllWithCriteria({ types: ['CONNECTOR'] })) {
  const s = c.connectorStart, e = c.connectorEnd;
  if (!('endpointNodeId' in s) || !('endpointNodeId' in e)) {
    out.push({ id: c.id, skipped: 'an end is not attached to a node' });
    continue;
  }
  const S = await figma.getNodeByIdAsync(s.endpointNodeId);
  const D = await figma.getNodeByIdAsync(e.endpointNodeId);
  const sb = S.absoluteBoundingBox, db = D.absoluteBoundingBox;
  const dx = db.x + db.width / 2 - (sb.x + sb.width / 2);
  const dy = db.y + db.height / 2 - (sb.y + sb.height / 2);
  const [sm, dm] = Math.abs(dx) >= Math.abs(dy)
    ? (dx > 0 ? ['RIGHT', 'LEFT'] : ['LEFT', 'RIGHT'])
    : (dy > 0 ? ['BOTTOM', 'TOP'] : ['TOP', 'BOTTOM']);
  const changed = s.magnet !== sm || e.magnet !== dm;
  c.connectorStart = { endpointNodeId: s.endpointNodeId, magnet: sm };
  c.connectorEnd = { endpointNodeId: e.endpointNodeId, magnet: dm };
  out.push({ id: c.id, from: S.name, to: D.name, magnets: `${sm} -> ${dm}`, changed });
}
return { connectors: out.length, changed: out.filter((o) => o.changed).length, out };

// Example result:
// { "connectors": 4, "changed": 1, "out": [
//   { "id": "2210:6004", "from": "Login", "to": "Forgot password", "magnets": "BOTTOM -> TOP", "changed": true },
//   ... ] }
