---
name: connecting-figma-flow-boards
description: Use when a Figma DESIGN file's Section of screen frames needs real Connectors between frames (a flow tool reads connectorStart/connectorEnd endpointNodeId over REST, e.g. design-check's declare-path refusing "this Section has no usable Connectors"), or when a flow board must be laid out like the team's reference flow boards. Also when figma.createConnector throws in a /design/ file.
---

# Connecting Figma flow boards

## Overview

A `/design/` file cannot CREATE a connector: `figma.createConnector()` is FigJam-only and throws.
It can CLONE one that already exists and re-point it. VECTOR arrows look right but are not
`CONNECTOR` nodes, so a REST reader (design-check's `flow-source.json`) sees zero edges.

## Steps

1. **Load `figma:figma-use`** before any `use_figma` call.
2. **Find a donor CONNECTOR.** Search the file page by page (one page per `use_figma` call, in
   parallel): `page.findAllWithCriteria({ types: ['CONNECTOR'] })`. Flow pages ("Login", "Campaign
   ...") usually have dozens. None anywhere: ask the user to paste one FigJam connector into the
   file and use that.
3. **Read the team's reference board** if the user names one (`get_screenshot` + a read of its
   children, banner frames and one connector's stroke/type/text). Copy its measurements; never
   invent a layout. With no reference, use the house pattern below.
4. **Smoke-test one edge**, then batch the rest (script: `clone-connector.js`). Verify by
   GEOMETRY: the connector's `absoluteBoundingBox` must start about 6px outside the source frame's
   edge on the chosen magnet and end about 6px outside the target's. An endpoint-id read-back alone
   can pass while the start vertex is frozen at the donor's old spot.
5. **Lay out, then re-set magnets** (`RIGHT`/`LEFT` on a left-to-right spine): a magnet set before
   frames move keeps its old side.
6. **Verify over REST**: re-fetch the Section (design-check: `figma --section <id> --run <run>`)
   and check every edge in `flow-source.json`. Without design-check, `examples/04-verify-rest.mjs`
   in this skill's repo lists every Connector of a Section with both endpoints.

## House pattern (measured from a team's POS flow board)

| Element | Spec |
|---|---|
| Section | fill `#444444`, stroke white 10% |
| Title banner | auto-layout frame named `.`, white fill, full board width; inside a `#2563EB` pill (padding 80/20) with "Flow : <name>", Noto Looped Thai Bold 72, near-white |
| Group banner | frame named `.`, white, radius 172, padding 72/28, Noto Looped Thai Bold 60, near-black, spanning its group's frames, 220px above them |
| Spine row | the walk order left to right, 320px gap, 640px between groups |
| Variant rows | hover / empty / mobile states in rows below, under the frame they vary |
| Connector | `#2563EB`, 4px, `ELBOWED`, start cap `NONE`, end cap `ARROW_LINES`, label = the trigger ("กด กำหนดเอง"), white text on a `#2563EB` text background |

Every frame of the Section gets a slot: frames off the connected chain go in a variant row under
the frame they vary, never left where they were. A board with one linear flow has one group
banner and no variant rows; add a group banner or a row only when the board has that group.
Fonts: check `figma.listAvailableFontsAsync()` for Noto Looped Thai; when it is absent, use the
family the Section's frames already use.

Banner frames are named `.` on purpose: design-check skips dot-frames, so a banner is never
mistaken for a Screen. A plain TEXT banner is not skipped by name.

## Common mistakes

| Mistake | Fix |
|---|---|
| `figma.createConnector()` in a design file | Clone a donor |
| VECTOR arrows as the fallback | Not readable as Connectors; get a donor instead |
| Endpoint ids checked, geometry not | Check the bounding box against both frame edges |
| Layout invented (grid wrap, step numbers) | Measure the reference board and copy it |
| Magnets set before moving frames | Re-set magnets after the layout |
| Connector appended to the page | Append to the Section so it travels with the board |
