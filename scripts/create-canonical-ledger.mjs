#!/usr/bin/env node
import fs from 'node:fs';
import {createCanonicalLedger,inventoryCanonicalInput} from './lib/canonical-source-ledger.mjs';
const [input,output]=process.argv.slice(2);
if(!input||!output) throw new Error('Usage: create-canonical-ledger.mjs raw-inputs.json canonical-ledger.json');
const descriptors=JSON.parse(fs.readFileSync(input,'utf8'));
const ledger=createCanonicalLedger(await Promise.all(descriptors.map(inventoryCanonicalInput)));
fs.writeFileSync(output,JSON.stringify(ledger,null,2),{flag:'wx'});
console.log(JSON.stringify({canonicalFactsTotal:ledger.canonicalFactsTotal,sha256:ledger.sha256,denominatorBasis:ledger.denominatorBasis}));
