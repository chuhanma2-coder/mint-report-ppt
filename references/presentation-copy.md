# Presentation Copy Contract (rc.6)

## Three boundaries, one Planner

Raw Source and its unchanged canonical ledger supply business facts. Execution Brief/Design Requirements supply instructions, never extra business claims. `displayCopy` is the reviewed audience wording. Author it after the design-director brief in the same Agent workflow; no additional Agent. See `design-intent.md` for structured metric parts and priority binding.

Every visible module in IR 1.7/planning 2.7 requires `displayCopy`; root `presentationCopyVersion` is 1. The build rejects absent copy, stale review, unknown copy fields and unmapped nodes/relations. `projectPresentationCopy` is shared by Canvas and native renderer. It never uses module text or node keywords as a copy fallback. Older component fixtures remain testable, but production old IR cannot bypass this contract.

Copy can compress, paraphrase and regroup source facts. Preserve entities, numbers, units/currency, period, actual/forecast, conditions, scope, uncertainty and relationship direction. Review all factual components against unchanged source text; literal full-sentence matching is not the writing objective. One primary carrier per fact continues to apply. Translate terminology only with a source-bound reviewed equivalent; proper names need not be translated.

## Authoring shape

```json
{
  "id": "profile",
  "type": "diagram",
  "data": {"nodes": [{"id": "entity", "entity": true}], "edges": []},
  "displayCopy": {
    "title": "合作方概况",
    "nodes": [{
      "id": "entity",
      "name": "正式名称",
      "headline": "面向本地客户的服务网络",
      "primaryMetrics": ["总资产约100亿元"],
      "summary": "以完整短句说明来源支持的独有特点。",
      "secondaryMetrics": [],
      "status": "已完成沟通"
    }],
    "edges": []
  }
}
```

Numbers above are synthetic. Never copy them into a real report. Entity profiles use name, identity/headline, zero to two available primary metrics, concise summary, optional secondary metrics/status. Do not invent metrics for an entity without numerical evidence. Do not use `|`/`｜` to serialize attributes. Prefer sentence breaks and separate metric objects, not labels repeated around the same fact.

Ordinary text/callout uses `displayCopy.title/text`; a metric uses `value/unit` too. Diagram copy maps every node/edge/lane by its existing ID; topology, time-range endpoints and numeric data remain in the source-bound model. Node copy may include `condition`, `duration`, `timeRangeLabel`. Tables/charts declare `dataMode:"bound-values"` after reviewing all visible headers/labels/cells; this preserves bound data and does not authorize dumping metadata into cells. Source images still require final readable-text review; image pixels are not rewritten by this projection.

Execution Brief records `presentationCopyPolicy` with language, `instructionOnlyPhrases` and `englishExceptions:[{text,reason,justification}]`. Reasons: proper-name, user-request, necessary-term. Chinese reports default Chinese-first. English is not automatically bad; proper names, requested bilingual text and necessary terminology are permitted. Visual hints such as design tone or desired icon styles are not body copy. Do not create an exception just to pass QA.

After actually comparing copy against source and instructions, record `presentationCopyReview:{status:"reviewed",canonicalLedgerHash,copySha256}` using `presentationCopyHash(ir)`. Changing copy invalidates that review. A hash records what was reviewed; it cannot prove semantic correctness.

## Gates and ownership

Deterministic checks run on authored copy and final native PPT text: pipes, Markdown syntax, schema fields, instruction headings and declared instruction-only phrases block. They cannot prove natural language quality or detect all paraphrased instruction leaks. Existing Executive Visual QA must additionally inspect the actual rendered page for all ten dimensions:

- `markdownSchema`, `pipeDensity`, `fieldLeakage`, `instructionLeakage`;
- `languageMix`, `labelStacking`, `sourceColloquialism`, `sentenceLength`;
- `duplicateMetrics`, `hierarchy`.

Each page requires `humanPresentationCopy` with all ten marked `pass` and specific observed evidence. Pending/fail/missing observations block DESIGN acceptance even if Content and Technical pass. Review proper-name exceptions in context, sentences at actual reading scale, and hierarchy across all profile fields. No fixed sentence-length cutoff may delete content. If copy is unnatural, repair Planner/displayCopy, redo source review, remeasure and render; layout issues return to Canvas. Visual QA does not rewrite facts or bypass hard requirements.

The emitted `.presentation-copy.json` is deterministic evidence, not human acceptance. Final delivery audit rechecks actual PPT text and the hash-bound Executive Review. Platform/Windows and whole-suite visual acceptance remain independent.
