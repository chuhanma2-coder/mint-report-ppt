// The measurer is a browser-backed dependency; no estimated point budget is used.
export async function planOutlinePages(slides, measure, { maxAutomaticParts = 3, pageApprovals = [], designRequirements = [], decisionSystems = [], requireMeasuredProof=false } = {}) {
  const groups = new Map(), output = [], measurements = [];
  const fail=message=>{const error=new Error(message);error.capacityAttempts=measurements;throw error;};
  for (const slide of slides) {
    // Only adjacent, explicitly shared decisions may cross outline boundaries.
    // Missing decision intent retains the safe legacy outline grouping.
    const previous = [...groups.values()].at(-1)?.at(-1);
    const sameDecision = slide.decisionUnit && previous?.decisionUnit === slide.decisionUnit && previous?.sectionId === slide.sectionId && previous?.role === 'content';
    if(decisionSystems.length && slide.role==='content' && !decisionSystems.some(d=>d.id===slide.decisionUnit)) throw new Error(`DECISION_SYSTEM_UNKNOWN: ${slide.id}`);
    if(sameDecision && slide.independentDecision) throw new Error(`DECISION_SYSTEM_SPLIT_CONFLICT: ${slide.id}`);
    const key = slide.role === 'content' ? sameDecision ? [...groups.keys()].at(-1) : decisionSystems.length ? `${slide.sectionId}:${slide.decisionUnit}:${groups.size}` : `${slide.sectionId || ''}:${slide.outlineItem}${slide.independentDecision ? ':'+slide.id : ''}` : `standalone:${slide.id}`;
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
    let phase='complete';
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
      page.semanticObligationRefs=[...new Set(chosen.flatMap(b=>b.slide.semanticObligationRefs||[]))];
      if(page.scenePlan) {
        const regions=page.scenePlan.regions.map(r=>({...r,moduleIds:r.moduleIds.flatMap(id=>identities.has(id)?[id]:chosen.filter(b=>b.originalModuleId===id).flatMap(b=>b.modules.map(m=>m.id)))})).filter(r=>r.moduleIds.length);
        page.scenePlan={...page.scenePlan,regions,readingOrder:page.scenePlan.readingOrder.filter(id=>regions.some(r=>r.id===id)),adjacency:(page.scenePlan.adjacency||[]).filter(a=>identities.has(a.object)&&identities.has(a.near))};
        if(modules.some(m=>!regions.some(r=>r.moduleIds.includes(m.id)))) throw new Error('DECISION_SYSTEM_SCENE_INCOMPLETE: plan the complete decision system before pagination');
      }
      if (start !== 0) {
        // Capacity repair cannot invent an unreviewed replacement claim. Keep
        // the supported decision claim; group headings remain visible in modules.
        page.narrative = {...first.narrative, outlineClaim:first.claim, previous:start ? blocks[start-1].key : null, next:end < blocks.length ? blocks[end].key : null};
      }
      // Do not drop different authored conclusions during consolidation.
      for (const claim of new Set(chosen.map(block => block.slide.claim))) if (claim && claim !== page.claim && blocks.findIndex(block => block.slide.claim === claim) >= start && !modules.some(module => `${module.title || ''} ${module.text || ''}`.includes(claim))) {
        page.modules = [...page.modules, { id: `${first.id}-claim-${page.modules.length}`, type: 'text', semanticRole: 'managementConclusion', text: claim, evidenceRefs: [], visibleFacts: [] }];
      }
      let fitted = null;
      let bestScore = -Infinity;
      // Safe repairs retain module identities and every unique fact. Containers
      // and proximity are controlled by the semantic scene, never copied text.
      const repeated=page.modules.filter(m=>m.text&&m.text===m.title).map(m=>m.id);
      page.capacityRepairs=[{step:'deduplicate',status:repeated.length?'applied':'not-applicable',changedModuleIds:repeated,operation:'remove exact duplicate body, retain title and all unique facts'}];
      page.modules=page.modules.map(m=>m.text&&m.text===m.title?{...m,text:''}:m);
      const variants = page.scenePlan ? ['scene-plan','content-first'] : page.compositionClassification?.narrativeAccepted ? ['narrative-flow','primary-above','primary-rail'] : ['story-bands', 'balanced', 'primary-rail', 'primary-above', 'single'];
      for (const density of ['standard', 'compact']) {
        for (const variant of variants) {
        const candidate = { ...page, measuredComposition: page.scenePlan?'scene-plan':variant, measuredDensity: density,measuredSceneVariant:variant==='content-first'?'content-first':'authored' };
        let result;
        try {result=await measure(candidate);} catch(error) {result={passed:false,issues:[error.message],slides:[]};}
        const evidence=capacityEvidence(result.slides?.[0]);
        if(requireMeasuredProof && evidence.failedObjects.length) result={...result,passed:false,issues:[...(result.issues||[]),...evidence.failedObjects.map(o=>`CAPACITY_OBJECT_FAILURE: ${o.id||o.kind}; ${o.reason||o.kind}`)]};
        const layoutSignature=JSON.stringify([evidence.moduleBounds,evidence.objectSizes]);
        const duplicate=measurements.find(m=>m.outlineItem===outline&&m.start===start&&m.end===end&&m.layoutSignature===layoutSignature);
        measurements.push({ attemptId:`capacity-${measurements.length+1}`,phase,outlineItem: outline,decisionSystem:page.decisionUnit, start, end, variant, density, passed: result.passed, issues: result.issues || [],
          layoutSignature,equivalentTo:duplicate?.attemptId || null,effectiveRepair:evidence.measured&&!duplicate,
          objectRepairs:result.slides?.[0]?.repairOperations || [],
          candidate:structuredClone(candidate),evidenceGroups:chosen.map(b=>b.key),
          ...evidence,visualOccupancy:result.slides?.[0]?.visualOccupancy??null,localOverflowOnly:result.issues?.length>0&&result.issues.every(i=>/module|text/i.test(i)),
          repairSteps:[...page.capacityRepairs,{step:'containers',status:variant==='content-first'?'applied':'not-applicable',operation:variant==='content-first'?'reduce wrapper padding; flatten adjacent narrative surfaces':'preserve authored containers'},
            {step:'proximity',status:variant==='content-first'&&page.scenePlan?.adjacency?.length?'applied':'not-applicable',pairs:page.scenePlan?.adjacency||[]},
            {step:'object-internals',status:evidence.measured?'measured':'unavailable',objects:evidence.objectSizes},
            {step:'region-shares',status:'measured-candidate',variant,moduleBounds:evidence.moduleBounds}] });
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
      const fullAttempts=measurements.filter(m=>m.outlineItem===outline&&m.phase==='complete');
      if(requireMeasuredProof&&fullAttempts.some(a=>!a.measured)) fail(`CAPACITY_MEASUREMENT_MISSING: ${outline}; cannot justify splitting without complete browser candidates`);
      if (designRequirements.some(r=>r.strength==='hard'&&r.type==='single-page'&&(r.scope==='report'||input.some(s=>s.id===r.slideId)))) fail(`HARD_SINGLE_PAGE_CAPACITY: ${outline}; cannot split, drop facts, or shrink below floors`);
      // Expand only explicit business row groups, and only after the original
      // complete outline fails. Preserve every row, qualifier and source map.
      blocks = blocks.flatMap(block => block.modules.length === 1 ? splitTableBlock(block) : [block]);
      phase='continuation';
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
      if (!selected) fail(`OUTLINE_CAPACITY_BLOCKED: ${outline}; an atomic evidence group cannot fit. ${measurements.filter(item => item.outlineItem === outline).at(-1)?.issues.join('; ')}. Name a smaller natural source boundary; do not shrink or delete facts`);
      const approval=pageApprovals.find(a=>String(a.outlineItem)===String(input[0].outlineItem) && a.approved===true && a.reason?.trim());
      if (selected.length > Math.max(maxAutomaticParts,Number(approval?.maxParts)||0)) fail(`OUTLINE_PAGE_APPROVAL_REQUIRED: ${outline} requires ${selected.length} measured readable pages`);
    }
    selected.forEach((page, index) => {
      page.id = input.length === 1 && selected.length === 1 ? input[0].id : `${input[0].id}-part-${index + 1}`;
      page.outlinePart = index + 1;
      page.capacityProof = { measured: true, fullOutlineFits: !!full, pageApproval:pageApprovals.find(a=>String(a.outlineItem)===outline)||null, attempts: measurements.filter(item => item.outlineItem === outline) };
      if (index) page.outlineSplit = { reason: 'All complete decision-system candidates failed browser measurement', naturalBoundary: page.modules[0]?.evidenceGroup || page.claim, continuationOf: selected[index - 1].id,
        decisionSystem:page.decisionUnit,managementQuestion:page.managementQuestion,fullCandidateAttempts:measurements.filter(m=>m.outlineItem===outline&&m.phase==='complete'),
        remainingSpace:measurements.filter(m=>m.outlineItem===outline&&m.phase==='complete').map(m=>({attemptId:m.attemptId,...m.remainingSpace})),
        boundaryEvidence:{previousModuleIds:selected[index-1].modules.map(m=>m.id),nextModuleIds:page.modules.map(m=>m.id),beforeGroup:selected[index-1].modules.at(-1)?.evidenceGroup,afterGroup:page.modules[0]?.evidenceGroup},
        whyReflowFailed:'Every bounded complete candidate and local repair was measured; per-candidate failedObjects and free rectangles are retained. Free area alone is not proof of readable fit.' };
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

// A diagnostic of measured rectangles, not a second placement engine. Empty
// rectangles describe available space; they never establish that text fits it.
export function capacityEvidence(layout) {
  const area=layout?.mainBounds;
  if(!area||![area.left,area.top,area.width,area.height].every(Number.isFinite)) return {measured:false,remainingSpace:null,failedObjects:[],objectSizes:[],moduleBounds:[]};
  const intersect=(a,b)=>{const left=Math.max(a.left,b.left),top=Math.max(a.top,b.top),width=Math.min(a.left+a.width,b.left+b.width)-left,height=Math.min(a.top+a.height,b.top+b.height)-top;return width>0&&height>0?{left,top,width,height}:null;};
  let free=[area];
  const failedObjects=[],objectSizes=[],moduleBounds=[];
  for(const m of layout.modules||[]) {
    moduleBounds.push({id:m.id,rect:m.rect,contentBounds:m.contentBounds});
    const obstruction=intersect(area,m.rect);
    if(obstruction) free=free.flatMap(r=>{
      const hit=intersect(r,obstruction);if(!hit)return [r];
      return [{left:r.left,top:r.top,width:r.width,height:hit.top-r.top},
        {left:r.left,top:hit.top+hit.height,width:r.width,height:r.top+r.height-hit.top-hit.height},
        {left:r.left,top:hit.top,width:hit.left-r.left,height:hit.height},
        {left:hit.left+hit.width,top:hit.top,width:r.left+r.width-hit.left-hit.width,height:hit.height}].filter(x=>x.width>1&&x.height>1);
    });
    const within=r=>r.left>=area.left-1&&r.top>=area.top-1&&r.left+r.width<=area.left+area.width+1&&r.top+r.height<=area.top+area.height+1;
    if(m.overflow||!within(m.rect)) failedObjects.push({id:m.id,kind:'module',rect:m.rect,reason:m.overflow?'internal-overflow':'outside-body',scrollWidth:m.scrollWidth,scrollHeight:m.scrollHeight,clientWidth:m.clientWidth,clientHeight:m.clientHeight});
    for(const [i,t] of (m.textObjects||[]).entries()) {
      objectSizes.push({moduleId:m.id,id:t.nodeId||`${m.id}-text-${i}`,rect:t.contentRect||t.rect,fontSizePx:t.fontSizePx,text:t.text});
      if(t.overflow||!within(t.rect)) failedObjects.push({id:`${m.id}-text-${i}`,kind:'text',rect:t.rect,text:t.text,reason:t.overflow?'text-overflow':'outside-body'});
    }
    if(m.table) objectSizes.push({moduleId:m.id,kind:'table',rect:m.table.rect,rows:m.table.rows});
    if(m.image) objectSizes.push({moduleId:m.id,kind:'image',...m.image});
  }
  const all=(layout.modules||[]).flatMap(m=>(m.textObjects||[]).filter(t=>t.text?.trim()).map(t=>({moduleId:m.id,text:t.text,rect:t.contentRect||t.rect})));
  for(let i=0;i<all.length;i++) for(let j=i+1;j<all.length;j++) {
    const hit=intersect(all[i].rect,all[j].rect);
    if(hit&&hit.width>2&&hit.height>2) failedObjects.push({kind:'text-collision',objects:[all[i],all[j]],intersection:hit});
  }
  free.sort((a,b)=>b.width*b.height-a.width*a.height);
  return {measured:true,bodyBounds:area,moduleBounds,objectSizes,failedObjects,remainingSpace:{freeRectangles:free,freeAreaPx2:free.reduce((s,r)=>s+r.width*r.height,0),largestFreeRectangle:free[0]||null,basis:'allocated module bounds clipped to measured body; not a readability or fit certificate'}};
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
    return {key:group.label,slide:block.slide,modules:[part],originalModuleId:module.id};
  });
}
