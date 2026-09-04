import assert from "node:assert/strict";
import { fitText, measureWrappedText } from "../scripts/lib/text-layout.mjs";

const short = fitText("人力与IT是主要压降项", { width: 800, height: 100 }, { fontFamily: "Microsoft YaHei", preferredPt: 30, minPt: 24, maxLines: 2, bold: true });
assert.equal(short.overflow, false);
assert.ok(short.fontSizePt >= 24);
const long = fitText("这是一个无法在极小文本框内完整显示的非常长的标题内容，需要布局系统阻断而不是继续缩小字号", { width: 80, height: 20 }, { fontFamily: "Microsoft YaHei", preferredPt: 30, minPt: 24, maxLines: 2, bold: true });
assert.equal(long.overflow, true);
assert.ok(measureWrappedText("中文ABC", { fontFamily: "Microsoft YaHei", fontSizePt: 16, maxWidth: 500 }).width > 0);
console.log(JSON.stringify({ passed: true, tests: 4 }));
