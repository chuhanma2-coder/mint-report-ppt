#!/usr/bin/env node
import fs from 'node:fs';
import {extractStylePrior} from './lib/style-prior.mjs';
const [input,output]=process.argv.slice(2);
if(!input||!output) throw new Error('Usage: extract-style-prior.mjs reference.pptx profile.json');
if(fs.existsSync(output)) throw new Error('Output exists; choose a new profile path');
fs.writeFileSync(output,JSON.stringify(await extractStylePrior(input),null,2));
console.log(JSON.stringify({output,status:'review-required',contentSlots:false}));
