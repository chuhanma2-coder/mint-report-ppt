// Pure, serializable chart geometry used by the canvas and editable-shape compiler.
// Unsupported variants fail explicitly, never masquerade as first-series bars.
export function nativeChartCompatibilityIssue(data, variant) {
  if (variant === 'variance-bar' && data.series.some(s => s.values.some(v => Number(v) < 0))) return 'negative-category-axis-overlap';
  if (variant === 'line' && data.series.length > 1) {
    const values = data.series.flatMap(s => s.values.map(Number));
    const range = Math.max(...values) - Math.min(0, ...values) || 1;
    for (let i = 0; i < data.categories.length; i++) for (let a = 0; a < data.series.length; a++) for (let b = a + 1; b < data.series.length; b++) {
      if (Math.abs(Number(data.series[a].values[i]) - Number(data.series[b].values[i])) / range < .18) return 'close-series-labels';
    }
  }
  return null;
}

export function chartDisplayModel(data, expression, width, colors) {
  const variant = expression.variant, categories = (data.categories || []).map(String);
  const series = data.series || [], values = series.flatMap(s => s.values || []);
  if (!categories.length || !series.length || values.some(v => v == null || !Number.isFinite(Number(v)))) throw new Error('CHART_DATA_INVALID');
  if (series.some(s => s.values.length !== categories.length)) throw new Error('CHART_SERIES_LENGTH');
  if (variant === 'comparison-small-multiples') {
    const panelWidth = series.length <= 2 ? (width - 20) / series.length : width;
    const panels = series.map(s => chartDisplayModel({ ...data, series: [s] }, { ...expression, variant: 'variance-bar' }, panelWidth, colors));
    let offsetY = 0;
    const primitives = panels.flatMap((panel, i) => {
      const x = series.length <= 2 ? i * (panelWidth + 20) : 0, y = series.length <= 2 ? 0 : offsetY;
      offsetY += panel.height + 20;
      return panel.primitives.map(item => ({ ...item, x: item.x + x, y: item.y + y, ...(item.kind === 'line' ? { x2: item.x2 + x, y2: item.y2 + y } : {}) }));
    });
    return { width, height: series.length <= 2 ? Math.max(...panels.map(p => p.height)) : offsetY - 20, primitives, variant, categories, series };
  }
  const p = [], height = Math.max(230, categories.length * (series.length * 30 + 26) + 84);
  const text = (value, x, y, w, h = 30, size = 22) => p.push({ kind: 'text', text: String(value), x, y, width: w, height: h, fontSize: size, color: colors.ink });
  const line = (x, y, x2, y2, color = colors.line) => p.push({ kind: 'line', x, y, x2, y2, color });
  const rect = (x, y, w, h, color) => p.push({ kind: 'rect', x, y, width: w, height: h, color });
  const peers = [colors.blue, colors.orange, colors.mint, colors.purple, colors.gold];
  const palette = series.map((s, i) => /实际|当前|actual|current/i.test(s.name || '') ? colors.mint : /预算|目标|budget|target/i.test(s.name || '') ? colors.muted : peers[i % peers.length]);
  const color = (s, label) => expression.focusCategories?.includes(label) ? colors.orange : palette[s % palette.length];
  const labelWidth = Math.min(width * .32, Math.max(100, ...categories.map(v => v.length * 22)));
  const left = labelWidth + 12, right = width - 140, plotWidth = right - left;
  if (plotWidth < 100) throw new Error('CHART_LABEL_CAPACITY');
  const min = Math.min(0, ...values.map(Number)), max = Math.max(0, ...values.map(Number));
  const scale = value => left + (value - min) / (max - min || 1) * plotWidth;
  let outHeight = height;
  if (['sorted-bar', 'variance-bar', 'diverging-variance-bar', 'dot-plot', 'comparison-small-multiples'].includes(variant)) {
    const rowHeight = series.length * 30 + 26;
    const indexes = categories.map((_, i) => i);
    if (variant === 'sorted-bar') indexes.sort((a, b) => Number(series[0].values[b]) - Number(series[0].values[a]));
    line(scale(0), 42, scale(0), height - 35, colors.muted);
    indexes.forEach((i, row) => {
      const y = 48 + row * rowHeight;
      text(categories[i], 0, y, labelWidth, rowHeight - 4);
      series.forEach((s, k) => {
        const value = Number(s.values[i]), a = scale(0), b = scale(value), barY = y + k * 30;
        if (variant === 'dot-plot') p.push({ kind: 'circle', x: b - 4, y: barY + 4, width: 8, height: 8, color: color(k, categories[i]) });
        else rect(Math.min(a, b), barY + 5, Math.max(1, Math.abs(b - a)), 18, color(k, categories[i]));
        text(`${value}${s.displayUnit || ''}`, right + 12, barY, 125, 28, 22);
      });
    });
  } else if (variant === 'bullet') {
    if (categories.length !== 1 || series.length !== 2) throw new Error('BULLET_ACTUAL_TARGET_REQUIRED');
    const targetIndex = series.findIndex(s => /目标|预算|target|budget/i.test(s.name || ''));
    if (targetIndex < 0) throw new Error('BULLET_TARGET_IDENTITY_REQUIRED');
    const actualIndex = 1 - targetIndex, actual = Number(series[actualIndex].values[0]), target = Number(series[targetIndex].values[0]);
    text(categories[0], 0, 70, labelWidth, 45);
    rect(Math.min(scale(0), scale(actual)), 82, Math.max(1, Math.abs(scale(actual) - scale(0))), 26, colors.mint);
    line(scale(target), 65, scale(target), 125, colors.muted);
    text(`${actual} / ${target}${series[actualIndex].displayUnit || ''}`, left, 135, width - left, 40);
    outHeight = 185;
  } else if (variant === 'percent-stacked') {
    outHeight = 70 + categories.length * 70;
    categories.forEach((label, i) => {
      const total = series.reduce((sum, s) => sum + Number(s.values[i]), 0);
      if (total <= 0 || series.some(s => Number(s.values[i]) < 0) || data.partToWhole !== true) throw new Error('STACKED_WHOLE_REQUIRED');
      const y = 55 + i * 70; let x = left;
      text(label, 0, y, labelWidth, 50);
      series.forEach((s, k) => {
        const value = Number(s.values[i]), w = value / total * plotWidth;
        rect(x, y, w, 22, palette[k]);
        text(`${value}${s.displayUnit || ''}`, x, y + 25, Math.max(40, w), 30, 22); x += w;
      });
    });
  } else if (variant === 'scatter') {
    if (series.length !== 2 || categories.length < 8) throw new Error('SCATTER_PAIRED_OBSERVATIONS_REQUIRED');
    outHeight = 380;
    const xs = series[0].values.map(Number), ys = series[1].values.map(Number);
    const loX = Math.min(...xs), hiX = Math.max(...xs), loY = Math.min(...ys), hiY = Math.max(...ys);
    const sx = v => 65 + (v - loX) / (hiX - loX || 1) * (width - 180), sy = v => 295 - (v - loY) / (hiY - loY || 1) * 220;
    line(65, 60, 65, 300); line(65, 300, width - 80, 300);
    for (let i = 0; i < xs.length; i++) {
      p.push({ kind: 'circle', x: sx(xs[i]) - 4, y: sy(ys[i]) - 4, width: 8, height: 8, color: colors.blue });
      // Keep the complete two-line label inside the plot, above the axis captions.
      text(`${categories[i]} (${xs[i]}, ${ys[i]})`, Math.min(width - 180, sx(xs[i]) + 8), Math.min(246, sy(ys[i]) - 20), 180, 54, 22);
    }
    text(`${series[0].name || 'X'} ${loX}—${hiX} ${series[0].displayUnit || ''}`, 65, 322, width - 90);
    text(`${series[1].name || 'Y'} ${loY}—${hiY} ${series[1].displayUnit || ''}`, 65, 352, width - 90);
  } else if (variant === 'doughnut') {
    if (series.length !== 1 || data.partToWhole !== true || values.some(v => Number(v) < 0)) throw new Error('DOUGHNUT_VERIFIED_WHOLE_REQUIRED');
    const total = values.reduce((a, b) => a + Number(b), 0);
    if (!(total > 0) || (data.whole != null && Math.abs(total - Number(data.whole)) > .01)) throw new Error('DOUGHNUT_WHOLE_MISMATCH');
    outHeight = Math.max(320, categories.length * 45 + 50);
    const cx = Math.min(width * .28, 170), cy = 175, radius = Math.min(width * .22, 115), inner = radius * .58;
    let angle = -Math.PI / 2;
    categories.forEach((label, i) => {
      const value = Number(values[i]), next = angle + value / total * Math.PI * 2;
      if (value > 0) {
        const end = Math.min(next, angle + Math.PI * 2 - .00001), point = (r, a) => `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`, large = end - angle > Math.PI ? 1 : 0;
        const d = `M${point(radius, angle)} A${radius},${radius} 0 ${large},1 ${point(radius, end)} L${point(inner, end)} A${inner},${inner} 0 ${large},0 ${point(inner, angle)} Z`;
        p.push({ kind: 'sector', x: 0, y: 0, width, height: outHeight, path: d, color: peers[i % peers.length] });
      }
      rect(cx + radius + 25, 60 + i * 45, 14, 14, peers[i % peers.length]);
      text(`${label} ${value}${series[0].displayUnit || ''}`, cx + radius + 48, 54 + i * 45, width - cx - radius - 48, 40, 22);
      angle = next;
    });
  } else if (['dumbbell', 'slope'].includes(variant)) {
    if (categories.length !== 2) throw new Error('DUMBBELL_REQUIRES_TWO_PERIODS');
    outHeight = 80 + series.length * 72;
    series.forEach((s, i) => {
      const y = 55 + i * 72, a = scale(Number(s.values[0])), b = scale(Number(s.values[1]));
      text(s.name || '', 0, y, labelWidth, 45);
      line(a, y + 38, b, y + 38, colors.muted);
      for (const [k, x] of [a, b].entries()) p.push({ kind: 'circle', x: x - 5, y: y + 33, width: 10, height: 10, color: palette[k] });
      text(`${categories[0]} ${s.values[0]} → ${categories[1]} ${s.values[1]}${s.displayUnit || ''}`, left, y, width - left, 30);
    });
  } else if (['column', 'line'].includes(variant)) {
    outHeight = 360;
    const plotBottom = 292, plotTop = 60 + series.length * 26, xStep = (width - 100) / categories.length;
    const y = v => plotBottom - (v - min) / (max - min || 1) * (plotBottom - plotTop);
    line(50, y(0), width - 30, y(0), colors.muted);
    categories.forEach((label, i) => {
      const w = Math.min(xStep - 4, Math.max(80, label.length * 22));
      text(label, 50 + (i + .5) * xStep - w / 2, 306, w, 50, 20);
    });
    series.forEach((s, k) => {
      s.values.forEach((raw, i) => {
        const v = Number(raw), x = 50 + (i + .5) * xStep, vy = y(v);
        if (variant === 'line') {
          if (i) line(x - xStep, y(Number(s.values[i - 1])), x, vy, palette[k]);
          p.push({ kind: 'circle', x: x - 4, y: vy - 4, width: 8, height: 8, color: palette[k] });
        } else {
          const bw = xStep * .7 / series.length;
          rect(x - xStep * .35 + k * bw, Math.min(y(0), vy), bw - 3, Math.max(1, Math.abs(y(0) - vy)), palette[k]);
        }
        const label = `${v}${s.displayUnit || ''}`, labelW = Math.min(xStep, Math.max(100, label.length * 22));
        const labelX = variant === 'line' ? x : x - xStep * .35 + (k + .5) * xStep * .7 / series.length;
        text(label, labelX - labelW / 2, vy - 30 - k * 30, labelW, 28, 22);
      });
    });
  } else if (variant === 'waterfall') {
    if (series.length !== 1 || !Number.isFinite(data.start) || !Number.isFinite(data.end)) throw new Error('WATERFALL_ENDPOINTS_REQUIRED');
    const contributions = series[0].values.map(Number), sum = data.start + contributions.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - data.end) > .01) throw new Error('WATERFALL_RECONCILIATION');
    let current = data.start;
    const columns = [{ label: data.startLabel || '起点', a: 0, b: current }];
    contributions.forEach((v, i) => { columns.push({ label: categories[i], a: current, b: current + v, value: v }); current += v; });
    columns.push({ label: data.endLabel || '终点', a: 0, b: data.end });
    const low = Math.min(0, ...columns.flatMap(c => [c.a, c.b])), high = Math.max(0, ...columns.flatMap(c => [c.a, c.b]));
    const y = v => 285 - (v - low) / (high - low || 1) * 220, step = width / columns.length;
    columns.forEach((c, i) => {
      rect(i * step + 10, Math.min(y(c.a), y(c.b)), step - 20, Math.max(1, Math.abs(y(c.a) - y(c.b))), c.value < 0 ? colors.mint : colors.orange);
      text(c.value ?? c.b, i * step + 5, Math.min(y(c.a), y(c.b)) - 30, step - 10);
      text(c.label, i * step + 5, 300, step - 10, 55, 20);
    });
    outHeight = 365;
  } else throw new Error(`CHART_PREVIEW_UNSUPPORTED: ${variant}`);
  const names = variant === 'dumbbell' || variant === 'slope' ? [] : series.map((s, i) => `${s.name || `系列${i + 1}`}${s.displayUnit ? `（${s.displayUnit}）` : ''}`);
  names.forEach((name, i) => { rect(i * width / series.length, 5, 14, 14, palette[i % palette.length]); text(name, i * width / series.length + 22, 0, width / series.length - 22); });
  return { width, height: outHeight, primitives: p, variant, categories, series };
}
