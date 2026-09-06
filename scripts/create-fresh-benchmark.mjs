#!/usr/bin/env node
import fs from 'node:fs';
import {createFreshWorkspace} from './lib/fresh-benchmark.mjs';
const config=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
console.log(JSON.stringify(createFreshWorkspace(config.inputs,config),null,2));
