# PPT failure-prevention contract

Apply these gates to section and merged decks. Do not weaken the internal HTML compiler to satisfy PowerPoint.

| Observed failure | Required PPT gate |
|---|---|
| Source content disappeared | Source-ledger coverage is complete before section PPT generation; slide count never licenses deletion. |
| AI added unsupported content | Visible slide facts map to supplied source units or explicit human edits. |
| Sparse one-point pages | Page consolidation runs before rendering; unexplained large blank bands block the internal layout. |
| Wrong chart/table route | Shared IR records the semantic expression type; the PPT adapter preserves it or blocks. |
| Multi-series values were independently normalized | Absolute comparisons share one axis; indexed charts must say so visibly. |
| Chart edits contradicted nearby text | Avoid duplicated numeric facts; before final delivery audit declared chart/text dependencies and flag mismatches. |
| Bars and labels were misaligned | Use native PowerPoint charts and render the complete slide after export. |
| Image disappeared | All image relationships are internal and every declared media part exists. |
| Image was cropped unexpectedly | Preserve contain/cover, scale, and focal position; visually inspect crops. |
| HTML card fills disappeared in PPT | Export semantic containers as native shapes before text objects. |
| White text appeared on a light fill | Enforce 4.5:1 normal and 3:1 large-title contrast. |
| Horizontal bars became a table | Preserve `horizontal-bar` in the IR and native chart direction. |
| Relationship diagrams changed meaning | Preserve node identity, directed edges, labels, and authored positions; block unsupported diagrams. |
| Text overlapped or shrank excessively | Render every slide; block out-of-bounds objects and auto-fit below 65%. |
| Audit metadata appeared on slides | Store identity only in custom properties/notes; scan visible slide XML for forbidden labels. |
| Header/footer/page number reappeared | Reject `dt`, `ftr`, and `sldNum` placeholders in delivered slide content. |
| Different Skill versions were mixed | Task card and embedded custom properties must match exactly. |
| PPT edits disappeared in final HTML | Every generated object has a stable binding; supported edits synchronize to the model and unresolved changes block finalization. |
| Embedded sync data was stripped | Sync payload hash and identity are mandatory; Agent edits restore the payload before delivery. |
| PDF was blank | PDF is outside the default chain; the final deliverable is the reviewed offline HTML. |

HTML-only controls such as E editing, navigation dots, scroll/hover states, and animation are deliberately absent from PPTX.
