# Data and expression routing

Expression answers “what medium best carries this meaning?” Geometry answers “where does it go?” Never combine them into names such as `chart-story` or `problem-action`.

Route the complete Page Evidence Bundle, not isolated source atoms. First identify the page's primary proof and supporting roles; then route each module. A dense page may legitimately combine chart, image evidence, metrics, and callouts when they jointly prove one conclusion. Do not force all information into one carrier and do not split solely because different carriers are required.

## Router inputs and output

Use `managementQuestion`, `claim`, `semanticIntent`, computed `dataShape`, exact-lookup need, decision intent, units, targets, time, signs, whole/part status, ordering, process/hierarchy/direction, label length, and data volume. Output `{type, variant, reason, alternatives}`. `reason` and `alternatives` remain internal.

`exactLookup=true` preserves detail but does not automatically force the primary expression to be a table. When the management question asks for change, rank, contribution, target attainment, or comparison, route the primary proof visually and preserve the full table in an appendix or notes. Use a table as the primary expression only when lookup/reconciliation is itself the management purpose.

Every table declares `tableRole`: `primary`, `supporting`, `reference`, or `detail`. Table is a content carrier, never a geometry. Only a primary table may dominate a page; supporting/reference/detail tables obey the page's main expression and cannot force matrix geometry.

The module types are `text`, `metric`, `chart`, `table`, `diagram`, `image`, and `callout`. Semantic roles are `context`, `primaryEvidence`, `supportingEvidence`, `managementConclusion`, `comparison`, `progress`, `risk`, `action`, `decision`, and `boundary`.

## Candidate routes

These are candidates, not mechanical one-to-one mappings. Management intent can select a different valid carrier for the same data.

| Relationship and intent | Preferred candidates | Guardrail |
|---|---|---|
| One value and one conclusion | Hero metric | Do not create a chart for one value |
| Two to four peer metrics | KPI cards, dot plot, dumbbell | Use status cards when attention is the question |
| Value against target | Bullet/target bar, target metric | Target is not an ordinary peer series |
| Category rank, 4–10 categories | Sorted horizontal bar | Long labels require horizontal space |
| Objects by multiple measures | Heatmap, decision matrix, table | Use table when exact lookup dominates |
| Continuous time, more than 7 points | Line | Preserve order and time axis |
| Two periods | Dumbbell, slope, variance cards | Do not imply a continuous trend |
| Three to seven periods | Column, dot, annotated stages | Use line only when continuity matters |
| Additive bridge from start to end | Waterfall | Every contribution must be addable |
| Non-additive positive/negative variance | Diverging variance bar | Do not fake a waterfall |
| Verified part-to-whole, few categories | Doughnut, 100% stacked | Whole must be explicit and complete |
| Many composition categories | 100% stacked, sorted bar | Prefer focus plus “other” only when source supports it |
| Decreasing stages from one population | Funnel/stage bars with conversion labels | Different populations require process/KPI chain |
| Numeric distribution | Histogram, box, dot distribution | Preserve observations and units |
| Two continuous measures, at least 8 observations | Scatter | Fewer observations default to dot/table |
| Interval or confidence range | Interval/error bar | Show bound meaning |
| Cohort by period | Heatmap | Preserve both axes |
| Steps and direction | Process diagram | Not a chart |
| Roles and handoffs | Swimlane/role network | Preserve actors and direction |
| System components and links | Architecture diagram | Preserve node and edge identity |
| Cause and effect | Causal chain | Do not turn into decorative arrows |
| Hierarchy | Tree/pyramid | Preserve parent-child relationships |
| Source screenshot or architecture image | Image evidence | Embed bytes; default to contain |
| Explanation or implication | Text/callout | Do not force visualization |

The same data may route differently. `A=80, B=72, C=55` becomes a sorted bar for rank, target variance for completion, status metrics for attention, or a table for exact reconciliation.

## Implementation fallback

Use native PowerPoint chart first, editable-shape chart second, and table only when precise lookup is genuinely the intended expression. If a selected expression does not fit, try another geometry and compact variant, then split by an independent conclusion. Return to the router only when the expression itself is unreadable; never let the renderer silently replace it.

For multi-dimensional country/product comparisons, use a decision matrix when dimensions are ordinal or qualitative. For scale plus quality measures with incompatible units, use aligned small multiples rather than one axis or a plain table. For a long cost table whose title names key drivers, show the driver ranking/variance first and preserve all rows in an appendix table.

## Semantic color

Actual/current uses Mint; target/budget uses muted gray-blue or a dashed line; two ordinary peers may use blue and orange; positive/completed uses Mint; risk uses Coral; history/baseline uses Neutral. Three to five series use the fixed semantic palette. More than five series should highlight the decision-relevant series or use small multiples. Color cannot be the only differentiator.
