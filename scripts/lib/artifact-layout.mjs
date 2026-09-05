const intersection = (a, b) => ({ width: Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]), height: Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]) });

export function artifactLayoutIssues(layout) {
  const issues = [], elements = layout.elements || [];
  // Compare actual text carriers, not decorative panels containing those carriers.
  const texts = elements.flatMap(element => element.kind === 'table'
    ? (element.cells || []).map(cell => ({ ...cell, name: `${element.id}:cell:${cell.row}:${cell.column}`, tableCell: true }))
    : element.text ? [element] : []);
  for (let i = 0; i < texts.length; i++) {
    const a = texts[i];
    if (!a.text?.trim() || !a.bbox) continue;
    for (let j = i + 1; j < texts.length; j++) {
      const b = texts[j]; if (!b.text?.trim() || !b.bbox) continue;
      const overlap = intersection(a.bbox, b.bbox);
      if (overlap.width > 2 && overlap.height > 2) issues.push(`TEXT_COLLISION: ${a.name || a.id} overlaps ${b.name || b.id}`);
    }
    const sizes = (a.paragraphs || []).flatMap(p => (p.runs || []).map(run => run.fontSize).filter(Number.isFinite));
    const floorPt = a.tableCell ? 14 : /caption/.test(a.name || '') ? 10 : /edge-label/.test(a.name || '') ? 13 : /chart.*label|diagram-node|diagram-isolated-node|role:(context|supportingEvidence|boundary)/.test(a.name || '') ? 15 : 16;
    if (sizes.some(px => px * 72 / 96 < floorPt - .05)) issues.push(`ARTIFACT_FONT_FLOOR: ${a.name || a.id} is below ${floorPt}pt`);
    if (a.textLayout?.lineCount && sizes.length && a.textLayout.lineCount * Math.max(...sizes) > a.bbox[3] + 2) issues.push(`ARTIFACT_TEXT_HEIGHT: ${a.name || a.id} has more rendered lines than its frame can contain`);
    for (const other of elements) {
      if (!other.bbox || other === a || other.text || other.kind === 'table') continue;
      const [x,y,w,h] = other.bbox, [tx,ty,tw,th] = a.bbox;
      if (other.geometry === 'line' || other.geometry === 'connector') {
        // Native horizontal/vertical relation lanes. Diagonal paths still
        // require rendered inspection; their bounding box is not their ink.
        if ((Math.abs(h) < 2 && y > ty + 2 && y < ty + th - 2 && x < tx + tw - 2 && x + w > tx + 2) ||
            (Math.abs(w) < 2 && x > tx + 2 && x < tx + tw - 2 && y < ty + th - 2 && y + h > ty + 2)) issues.push(`CONNECTOR_TEXT_COLLISION: ${other.name || other.id} crosses ${a.name || a.id}`);
      } else if (Number.isFinite(other.order) && other.order > a.order && (other.kind === 'image' || other.fillColor?.startsWith('#'))) {
        const overlap = intersection(a.bbox, other.bbox);
        if (overlap.width > 2 && overlap.height > 2) issues.push(`TEXT_OCCLUDED: ${a.name || a.id} is covered by ${other.name || other.id}`);
      }
    }
  }
  return issues;
}
