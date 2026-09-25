# figma-wireflow-connect-skill

An agent skill that connects the screen frames of a Figma **design** file with real Connectors, so
a wireflow board is not just a picture of arrows but a graph that tools can read over the Figma
REST API.

It works with Claude Code (and any agent that loads `SKILL.md` skills) through the official Figma
MCP server's `use_figma` tool.

## Why this exists

Three facts about Figma design files that cost real debugging time:

1. **`figma.createConnector()` only works in FigJam.** In a `/design/` file it throws.
2. **Arrows drawn by hand are not Connectors.** A VECTOR or LINE arrow looks right on the canvas,
   but a REST reader sees zero edges between the frames.
3. **A design file can still hold Connectors.** Paste one from FigJam and it stays a real
   `CONNECTOR` node, and `clone()` works on it.

So the skill finds one existing connector (the donor), clones it once per edge, points each clone at
two frames, styles it, and checks the result by geometry and over REST.

## What is in this repo

```
connecting-figma-flow-boards/     the skill: copy this folder into your skills directory
  SKILL.md                          steps, house layout pattern, common mistakes
  clone-connector.js                the use_figma script that clones and re-points the donor
examples/
  01-find-donor.js                  list pages, then find a CONNECTOR to clone
  02-clone-edges-login-flow.js      clone-connector.js filled in for a 4-screen login flow
  03-reset-magnets.js               re-point every connector's sides after moving frames
  04-verify-rest.mjs                Node script: list a Section's connectors over the REST API
```

## Requirements

- **Claude Code** (CLI, desktop app or IDE extension) or another agent that loads Agent Skills.
- **The Figma MCP server** with the `use_figma` tool, and Figma's `figma-use` skill, which the
  skill loads before its first `use_figma` call.
- **Edit access** to the Figma file.
- For `examples/04-verify-rest.mjs` only: **Node 18+** and a Figma personal access token that can
  read the file.

## Install

Clone the repo and copy the skill folder into your personal skills directory:

```bash
git clone https://github.com/Peeradonte48/figma-wireflow-connect-skill.git
```

```bash
cp -R figma-wireflow-connect-skill/connecting-figma-flow-boards ~/.claude/skills/
```

For one project only, copy it into that project's `.claude/skills/` instead. Start a new session
and the skill is listed as `connecting-figma-flow-boards`.

## Usage

Ask for it in plain words, with the Section's link:

> Connect the screens in this Section as a wireflow, left to right in this order: Login, OTP,
> Choose shop, Home. Forgot password hangs under Login.
> https://www.figma.com/design/AbCdEf123/Shop-app?node-id=2210-5530

> Our flow board uses VECTOR arrows and the flow tool says "this Section has no usable
> Connectors". Replace them with real connectors.

> Lay out this Section like our reference board (link) and connect the frames.

The skill also triggers when `figma.createConnector` throws inside a design file.

What the agent does:

1. Loads `figma-use`, then searches the file page by page for a donor `CONNECTOR`. If there is
   none, it asks you to paste one connector from any FigJam board into the file.
2. Reads your reference board, if you name one, and copies its measurements. Without one it uses
   the house pattern in `SKILL.md`.
3. Clones **one** edge as a smoke test and checks its geometry: the connector must start next to
   the source frame's edge and end next to the target's. Then it clones the rest.
4. Lays out the board, then re-sets every magnet (a side chosen before a frame moved stays on the
   old side).
5. Verifies over REST that every edge joins two frames.

## Example: a four-screen login flow

The board we want:

```
[Login] --"กด เข้าสู่ระบบ"--> [OTP] --"กรอก OTP ครบ"--> [Choose shop] --"เลือกร้าน"--> [Home]
   |
   +--"กด ลืมรหัสผ่าน"--> [Forgot password]
```

The ids below are made up. A frame's id is the `node-id` in its link, with `-` turned into `:`.

**1. Find a donor** with [`examples/01-find-donor.js`](examples/01-find-donor.js). Run it once
with `PAGE_ID` empty to list the pages, then once per page:

```json
{ "page": "Login", "count": 23, "sample": [{ "id": "1203:4471", "lineType": "ELBOWED" }] }
```

**2. Clone the edges** with
[`examples/02-clone-edges-login-flow.js`](examples/02-clone-edges-login-flow.js). The only part you
edit is the top:

```js
const PAGE_ID = '120:1';
const DONOR_ID = '1203:4471';
const SECTION_ID = '2210:5530';
const EDGES = [
  ['2210:5601', '2210:5688', 'กด เข้าสู่ระบบ'],   // Login -> OTP
  ['2210:5688', '2210:5742', 'กรอก OTP ครบ'],     // OTP -> Choose shop
  ['2210:5742', '2210:5810', 'เลือกร้าน'],         // Choose shop -> Home
  ['2210:5601', '2210:5903', 'กด ลืมรหัสผ่าน'],   // Login -> Forgot password
];
```

Run it with the first edge only. When that edge comes back with `"startsAtSource": true`, run it
again with the other three.

**3. Move the frames into place**, then run
[`examples/03-reset-magnets.js`](examples/03-reset-magnets.js) so each connector leaves from the
side that faces its target:

```json
{ "connectors": 4, "changed": 1, "out": [
  { "from": "Login", "to": "Forgot password", "magnets": "BOTTOM -> TOP", "changed": true } ] }
```

**4. Verify over REST** with [`examples/04-verify-rest.mjs`](examples/04-verify-rest.mjs):

```bash
FIGMA_TOKEN=figd_xxx node examples/04-verify-rest.mjs AbCdEf123 2210-5530
```

```
Section "Shop app login": 5 screen frames, 4 connectors

ok    Login  ->  OTP  "กด เข้าสู่ระบบ"
ok    OTP  ->  Choose shop  "กรอก OTP ครบ"
ok    Choose shop  ->  Home  "เลือกร้าน"
ok    Login  ->  Forgot password  "กด ลืมรหัสผ่าน"
```

It exits 1 when the Section has no connectors or an edge does not join two of its frames, and it
warns about VECTOR/LINE arrows left in the Section. Frames that sit in variant rows (hover, empty,
mobile states) are listed as "frames no connector touches", which is expected.

## House layout pattern

When no reference board is named, the skill lays the board out like this (full table in
[`SKILL.md`](connecting-figma-flow-boards/SKILL.md)):

- Section fill `#444444`, a white title banner with a blue `#2563EB` "Flow : name" pill.
- The walk order runs left to right on one spine row, 320px between frames.
- Hover, empty and mobile variants sit in rows under the frame they vary.
- Connectors are `#2563EB`, 4px, elbowed, arrow at the end only, and labelled with the trigger
  ("กด กำหนดเอง") in white on blue.
- Banner frames are named `.` so a flow tool that skips dot-frames never mistakes a banner for a
  screen.

Labels use Noto Looped Thai when the file has it, otherwise the font the Section's frames already
use.

## Common mistakes

| Mistake | Fix |
|---|---|
| `figma.createConnector()` in a design file | Clone a donor connector |
| Drawing VECTOR arrows instead | Not readable as Connectors; get a donor |
| Checking endpoint ids only | Check the bounding box against both frame edges |
| Setting magnets, then moving frames | Run `03-reset-magnets.js` after the layout |
| Appending connectors to the page | Append to the Section so they move with the board |

## Works with design-check

The skill was written for [design-check](https://www.npmjs.com/package/design-check), whose walked
run reads a Section's Connectors to build the flow graph. With design-check installed, step 5 is
`design-check figma --section <id> --run <run>` and a check of `flow-source.json`. Without it,
`examples/04-verify-rest.mjs` does the same check.
