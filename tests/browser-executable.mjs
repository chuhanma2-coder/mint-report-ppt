import assert from 'node:assert/strict';
import {browserExecutable} from '../scripts/lib/browser-executable.mjs';
const edge = 'D:\\Apps\\Microsoft\\Edge\\Application\\msedge.exe';
assert.equal(browserExecutable({platform:'win32',env:{ProgramFiles:'D:\\Apps'},exists:p=>p===edge}),edge);
const local = 'C:\\Users\\Lead\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe';
assert.equal(browserExecutable({platform:'win32',env:{LOCALAPPDATA:'C:\\Users\\Lead\\AppData\\Local'},exists:p=>p===local}),local);
assert.equal(browserExecutable({platform:'darwin',env:{},bundled:'/runtime/chromium',exists:p=>p==='/runtime/chromium'}),'/runtime/chromium');
assert.throws(()=>browserExecutable({env:{MINT_CHROMIUM_EXECUTABLE:'/missing'},exists:()=>false}),/does not exist/);
console.log('browser executable: Windows custom paths, per-user Chrome and bundled fallback passed');
