import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { tempDir, solidImage } from './helpers.mjs';

function run(args, cwd) {
  return new Promise((resolve) => { const child=spawn(process.execPath,args,{cwd}); let stdout='',stderr=''; child.stdout.on('data',d=>stdout+=d); child.stderr.on('data',d=>stderr+=d); child.on('close',code=>resolve({code,stdout,stderr})); });
}

test('CLI help lists all commands', async () => {
  const r = await run(['scripts/magic-image.mjs','--help'], process.cwd());
  assert.equal(r.code,0); for (const command of ['layers','pair','inspect','demo']) assert.match(r.stdout,new RegExp(command));
});

test('CLI sanitizes output name against path traversal', async () => {
  const root=await tempDir(); const fg=await solidImage(path.join(root,'fg.png'),1,1,3,{r:100,g:100,b:100}); const h=await solidImage(path.join(root,'h.png'),1,1,3,{r:255,g:255,b:255});
  const r=await run(['scripts/magic-image.mjs','layers','--foreground',fg,'--hidden',h,'--out-dir',path.join(root,'out'),'--name','../escape'],process.cwd());
  assert.notEqual(r.code,0); assert.match(r.stderr,/invalid.*name/i);
});
