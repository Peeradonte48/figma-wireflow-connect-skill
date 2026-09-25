// use_figma script: find a donor CONNECTOR to clone.
//
// Step A: leave PAGE_ID empty and run it once. It returns every page of the file.
// Step B: run it again once per page (in parallel, one page per call) with PAGE_ID set.
//         Pick any connector id from a page whose count is above zero. That id is DONOR_ID.
//
// A design file loads pages lazily, so the page is loaded before it is searched.
const PAGE_ID = '';

if (!PAGE_ID) {
  return { pages: figma.root.children.map((p) => ({ id: p.id, name: p.name })) };
}

const page = await figma.getNodeByIdAsync(PAGE_ID);
if (!page || page.type !== 'PAGE') throw new Error(`${PAGE_ID} is not a page`);
await page.loadAsync();

const connectors = page.findAllWithCriteria({ types: ['CONNECTOR'] });
return {
  page: page.name,
  count: connectors.length,
  sample: connectors.slice(0, 5).map((c) => ({
    id: c.id,
    name: c.name,
    lineType: c.connectorLineType,
  })),
};

// Example result (Step B):
// {
//   "page": "Login",
//   "count": 23,
//   "sample": [
//     { "id": "1203:4471", "name": "Connector line", "lineType": "ELBOWED" },
//     ...
//   ]
// }
//
// Every page returns count 0? A design file cannot create a connector from nothing.
// Ask the designer to copy ONE connector from any FigJam board and paste it into the file,
// then run Step B again on the page it landed on.
