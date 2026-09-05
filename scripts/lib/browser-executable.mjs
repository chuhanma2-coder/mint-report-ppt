import fs from 'node:fs';
import path from 'node:path';

export function browserExecutable({env = process.env, platform = process.platform, exists = fs.existsSync, bundled = null} = {}) {
  if (env.MINT_CHROMIUM_EXECUTABLE) {
    if (!exists(env.MINT_CHROMIUM_EXECUTABLE)) throw new Error('MINT_CHROMIUM_EXECUTABLE does not exist');
    return env.MINT_CHROMIUM_EXECUTABLE;
  }
  const candidates = platform === 'win32'
    ? [env.ProgramFiles, env['ProgramFiles(x86)'], env.LOCALAPPDATA].filter(Boolean).flatMap(root => [
      path.win32.join(root, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.win32.join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
    ])
    : ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
  const executable = [bundled, ...candidates].find(file => file && exists(file));
  if (!executable) throw new Error('Chrome, Edge or Playwright Chromium is required; set MINT_CHROMIUM_EXECUTABLE');
  return executable;
}
