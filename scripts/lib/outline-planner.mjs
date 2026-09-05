// The measurer is a browser-backed dependency; no estimated point budget is used.
export async function planOutlinePages(slides, measure, { maxAutomaticParts = 3, pageApprovals = [], designRequirements = [] } = {}) {
  const groups = new Map(), output = [], measurements = [];
  for (const slide of slides) {
    // Only adjacent, explicitly shared decisions may cross outline boundaries.
    // Missing decision intent retains the safe legacy outline grouping.
    const previous = [...groups.values()].at(-1)?.at(-1);
    const sameDecision = slide.decisionUnit && previous?.decisionUnit === slide.decisionUnit && previous?.sectionId === slide.sectionId && previous?.role === 'content' && !slide.independentDecision;
    const key = slide.role === 'content' ? sameDecision ? [...groups.keys()].at(-1) : `${slide.sectionId || ''}:${slide.outlineItem}${slide.independentDecision ? ':'+slide.id : ''}` : `standalone:${slide.id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(slide);
  }
  for (const [outline, input] of groups) {
    let blocks = input.flatMap(slide => {
      const grouped = new Map();
      for (const module of slide.modules || []) {
        // Named evidence groups are atomic. Never separate a chart from its
        // required explanation just because the two use different carriers.
        const key = module.evidenceGroup || slide.id;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(module);
      }
      return [...grouped].map(([key, modules]) => ({ key, modules, slide }));
    });
    const cache = new Map();
    async function attempt(start, end) {
      const key = `${start}:${end}`;
      if (cache.has(key)) return cache.get(key);
      const chosen = blocks.slice(start, end), first = chosen[0].slide;
      const modules = chosen.flatMap(block => block.modules), identities = new Set();
      for (const module of modules) {
        if (!module.id || identities.has(module.id)) throw new Error(`OUTLINE_MODULE_ID: ${outline} needs unique stable module IDs`);
        identities.add(module.id);
      }
      const bundle = {};
      for (const block of chosen) for (const [field, values] of Object.entries(block.slide.evidenceBundle || {})) {
        if (Array.isArray(values)) bundle[field] = [...new Set([...(bundle[field] || []), ...values])];
      }
      const refs = new Set(modules.flatMap(module => module.evidenceRefs || []));
      for (const field of Object.keys(bundle)) bundle[field] = bundle[field].filter(ref => refs.has(ref));
      const page = { ...first, modules, originSlideIds:[...new Set(chosen.map(b=>b.slide.id))], outlineItems:[...new Set(chosen.flatMap(b=>b.slide.outlineItems || [b.slide.outlineItem]))], sourceEvidence:[...new Map(chosen.flatMap(b=>b.slide.sourceEvidence || []).map(e=>[e.id,e])).values()], designRequirementRefs:[...new Set(chosen.flatMap(b=>b.slide.designRequirementRefs || []))], evidenceRefs: [...refs], evidenceBundle: bundle, outlinePart: undefined, outlineSplit: undefined };
      if (start !== 0) {
        // Measured continuation titles name the actual evidence groups on this
        // page. Preserve the chapter-level claim as internal narrative context.
        const titles = [...new Set(modules.map(m=>m.title).filter(Boolean))];
        if (titles.length) page.claim = titles.join('、');
        page.narrative = {...first.narrative, outlineClaim:first.claim, previous:start ? blocks[start-1].key : null, next:end < blocks.length ? blocks[end].key : null};
      }
      // Do not drop different authored conclusions during consolidation.
      for (const claim of new Set(chosen.map(block => block.slide.claim))) if (claim && claim !== page.claim && blocks.findIndex(block => block.slide.claim === claim) >= start && !modules.some(module => `${module.title || ''} ${module.text || ''}`.includes(claim))) {
        page.modules = [...page.modules, { id: `${first.id}-claim-${page.modules.length}`, type: 'text', semanticRole: 'managementConclusion', text: claim, evidenceRefs: [], visibleFacts: [] }];
      }
      let fitted = null;
      let bestScore = -Infinity;
      const variants = page.compositionClassification?.narrativeAccepted ? ['narrative-flow','primary-above','primary-rail'] : ['story-bands', 'balanced', 'primary-rail', 'primary-above', 'single'];
      for (const density of ['standard', 'compact']) {
        for (const variant of variants) {
        const candidate = { ...page, measuredComposition: variant, measuredDensity: density };
        const result = await measure(candidate);
        measurements.push({ outlineItem: outline, start, end, variant, density, passed: result.passed, issues: result.issues || [] });
        const layout=result.slides?.[0], desired=page.visualNarrative?.readingOrder || [];
        const reading=layout?.modules ? [...layout.modules].sort((a,b)=>Math.abs(a.rect.top-b.rect.top)>8?a.rect.top-b.rect.top:a.rect.left-b.rect.left).map(m=>m.id) : [];
        const rank=desired.filter(id=>reading.includes(id)).map(id=>reading.indexOf(id));
        const inversions=rank.reduce((sum,v,i)=>sum+rank.slice(i+1).filter(n=>n<v).length,0);
        const score=(layout?.compositionScore ?? 0)-inversions*4-(density==='compact'?.5:0);
        if (result.passed && score > bestScore) {
          bestScore = score;
          fitted = candidate;
        }
        }
        if (fitted && !page.compositionClassification?.narrativeAccepted) break;
      }
      cache.set(key, fitted); return fitted;
    }
    const full = await attempt(0, blocks.length);
    let selected;
    if (full) selected = [full];
    else {
      if (designRequirements.some(r=>r.strength==='hard'&&r.type==='single-page'&&(r.scope==='report'||input.some(s=>s.id===r.slideId)))) throw new Error(`HARD_SINGLE_PAGE_CAPACITY: ${outline}; cannot split, drop facts, or shrink below floors`);
      // Expand only explicit business row groups, and only after the original
      // complete outline fails. Preserve every row, qualifier and source map.
      blocks = blocks.flatMap(block => block.modules.length === 1 ? splitTableBlock(block) : [block]);
      cache.clear();
      // Contiguous partitioning keeps source order and minimizes page count.
      const best = Array(blocks.length + 1).fill(null); best[0] = { pages: [], ends: [] };
      for (let end = 1; end <= blocks.length; end++) for (let start = 0; start < end; start++) {
        if (!best[start]) continue;
        const ends = [...best[start].ends, end], count = best[start].pages.length + 1;
        // Equal page counts must not retain the first-found partition: that
        // stranded a short introduction before a readable summary table.
        // Prefer later natural breaks, after readability has been measured.
        const firstDifference = best[end] && ends.findIndex((value, i) => value !== best[end].ends[i]);
        if (best[end] && (count > best[end].pages.length || (count === best[end].pages.length && (firstDifference < 0 || ends[firstDifference] < best[end].ends[firstDifference])))) continue;
        const candidate = await attempt(start, end);
        if (candidate) best[end] = { pages: [...best[start].pages, candidate], ends };
      }
      selected = best[blocks.length]?.pages;
      if (!selected) throw new Error(`OUTLINE_CAPACITY_BLOCKED: ${outline}; an atomic evidence group cannot fit. ${measurements.filter(item => item.outlineItem === outline).at(-1)?.issues.join('; ')}. Name a smaller natural source boundary; do not shrink or delete facts`);
      const approval=pageApprovals.find(a=>String(a.outlineItem)===String(input[0].outlineItem) && a.approved===true && a.reason?.trim());
      if (selected.length > Math.max(maxAutomaticParts,Number(approval?.maxParts)||0)) throw new Error(`OUTLINE_PAGE_APPROVAL_REQUIRED: ${outline} requires ${selected.length} measured readable pages`);
    }
    selected.forEach((page, index) => {
      page.id = input.length === 1 && selected.length === 1 ? input[0].id : `${input[0].id}-part-${index + 1}`;
      page.outlinePart = index + 1;
      page.capacityProof = { measured: true, fullOutlineFits: !!full, pageApproval:pageApprovals.find(a=>String(a.outlineItem)===outline)||null, attempts: measurements.filter(item => item.outlineItem === outline) };
      if (index) page.outlineSplit = { reason: 'Full-outline browser measurement failed', naturalBoundary: page.modules[0]?.evidenceGroup || page.claim, continuationOf: selected[index - 1].id };
      output.push(page);
    });
  }
  const prior=new Map();
  for(const page of output) {
    page.outlineProvenance=(page.outlineItems || [page.outlineItem]).map(outlineItem=>{
      const key=`${page.sectionId || ''}:${outlineItem}`,previous=prior.get(key),part=(previous?.part || 0)+1;
      const item={sectionId:page.sectionId,outlineItem,part,continuationOf:previous?.id || null};prior.set(key,{part,id:page.id});return item;
    });
    const first=page.outlineProvenance[0];page.outlinePart=first.part;
    if(first.continuationOf && !page.outlineSplit) page.outlineSplit={reason:'Explicit independent management story',naturalBoundary:page.decisionUnit || page.claim,continuationOf:first.continuationOf};
  }
  return { slides: output, measurements };
}

function splitTableBlock(block) {
  const module=block.modules[0], groups=module.data?.rowGroups, refs=module.data?.rowEvidenceRefs;
  if (module.type!=='table' || !groups?.length || !refs) return [block];
  const indexes=groups.flatMap(g=>Array.from({length:g.end-g.start},(_,i)=>g.start+i));
  if (indexes.join(',')!==module.data.rows.map((_,i)=>i).join(',')) throw new Error('TABLE_BOUNDARY_COVERAGE: row groups must cover every row once in order');
  return groups.map((group,i)=>{
    const rowRefs=refs.slice(group.start,group.end).flat(), nonRowRefs=(module.evidenceRefs||[]).filter(ref=>!refs.flat().includes(ref));
    const evidenceRefs=[...rowRefs,...(i===groups.length-1?nonRowRefs:[])];
    const reconciliationNotes=(module.reconciliationNotes||[]).filter(n=>n.row>=group.start&&n.row<group.end).map(n=>({...n,row:n.row-group.start}));
    let remainder=module.text||'';for(const n of module.reconciliationNotes||[]) remainder=remainder.replace(n.text,'');
    const text=[...reconciliationNotes.map(n=>n.text),...(i===groups.length-1?[remainder.trim()]:[])].filter(Boolean).join('\n');
    const part={...module,id:`${module.id}-group-${i+1}`,evidenceGroup:group.label,title:group.label,text,evidenceRefs,visibleFacts:(module.visibleFacts||[]).filter(f=>evidenceRefs.includes(f.sourceUnitId)),reconciliationNotes,data:{...module.data,rows:module.data.rows.slice(group.start,group.end),rowGroups:undefined,rowEvidenceRefs:undefined}};
    return {key:group.label,slide:block.slide,modules:[part]};
  });
}
