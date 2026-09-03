#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { readPptxMetadata, readPptxSyncPayload, writePptxMetadata, writePptxSyncPayload } from "./lib/pptx-metadata.mjs";

const source = path.resolve(process.argv[2] || ""), edited = path.resolve(process.argv[3] || "");
if (![source, edited].every(fs.existsSync)) { console.error("Usage: preserve-sync-payload.mjs source-current.pptx edited-current.pptx"); process.exit(2); }
try {
  const metadata = await readPptxMetadata(source), sync = await readPptxSyncPayload(source), written = await writePptxSyncPayload(edited, sync.payload);
  await writePptxMetadata(edited, { ...metadata, MintSyncPayloadHash: written.hash, MintAuthority: "ppt-review-carrier", MintLastAgentEditAt: new Date().toISOString() });
  console.log(JSON.stringify({ passed: true, edited, syncPayloadHash: written.hash }, null, 2));
} catch (error) { console.error(JSON.stringify({ passed: false, error: error.message }, null, 2)); process.exit(1); }
