const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createHmac, webcrypto} = require('node:crypto');
const root = path.join(__dirname, '../patches/photoshop/files');
const fixtureToken = 'test-only-local-bridge-token';
const serverId = 'test-server';

// UXP 27.10 runtime probe: crypto.getRandomValues exists; subtle and TextEncoder do not.
function loadBridge(options = {}) {
  const storage = {getToken: async()=>fixtureToken,getServer:()=>({serverId,port:38456}),setServer(){}};
  const context = vm.createContext({
    module:{exports:{}}, Uint8Array, ArrayBuffer, DataView,
    crypto:{getRandomValues:a=>webcrypto.getRandomValues(a)},
    setTimeout,clearTimeout,AbortController,
    btoa:s=>Buffer.from(s,'binary').toString('base64'),
    fetch: async url => {
      const parsed = new URL(url);
      if(parsed.port !== '38456') throw new Error('fixture port closed');
      const challenge = parsed.searchParams.get('challenge');
      const payload = ['ps-mcp-bridge/3',serverId,'38456','0',challenge].join('\n');
      let proof = createHmac('sha256',fixtureToken).update(payload).digest('base64url');
      if(options.tamper) proof = 'A'.repeat(proof.length);
      return {ok:true,text:async()=>JSON.stringify({protocol:'ps-mcp-bridge/3',serverId,port:38456,secretGeneration:0,proof})};
    },
    require(name) {
      if(name === './storage') return storage;
      if(name === './errors') return require('./fixtures/photoshop-errors.cjs');
      if(name === './hmac-compat') {
        const mod = {exports:{}};
        vm.runInNewContext(fs.readFileSync(path.join(root,'lib/hmac-compat.js'),'utf8'),{module:mod,exports:mod.exports,Uint8Array,ArrayBuffer,DataView});
        return mod.exports;
      }
      if(name.startsWith('./')) return require(path.join(root,'lib',name));
      throw new Error('Unexpected dependency: '+name);
    }
  });
  vm.runInContext(fs.readFileSync(path.join(root,'lib/bridge.js'),'utf8'),context);
  return context.module.exports;
}

test('authenticates a valid discovered bridge without SubtleCrypto or TextEncoder',async()=>{
  const servers = await loadBridge().discoverAll();
  assert.equal(servers.length,1);
  assert.equal(servers[0].serverId,serverId);
});

test('rejects a tampered discovery proof',async()=>{
  assert.equal((await loadBridge({tamper:true}).discoverAll()).length,0);
});

test('produces the same discovery HMAC as the Node server',async()=>{
  const args = [fixtureToken,'ps-mcp-bridge/3','test-server',38456,12,'test-only-challenge'];
  const expected = createHmac('sha256',fixtureToken).update(args.slice(1).join('\n')).digest('base64url');
  assert.equal(await loadBridge().discoveryProof(...args),expected);
});

test('cancelling a folder picker preserves the selected export folder without an error',async()=>{
  const nodes = new Map();
  const getNode = id => {
    if(!nodes.has(id)) nodes.set(id,{textContent:'',value:'',classList:{add(){},remove(){}},addEventListener(event,handler){this[event]=handler;}});
    return nodes.get(id);
  };
  let entry;
  class StubClient {async start(){} async reconnect(){}}
  const context = vm.createContext({
    document:{getElementById:getNode,body:{classList:{add(){},remove(){}}}},
    require(name){
      if(name === 'uxp') return {entrypoints:{setup:e=>{entry=e;}}};
      if(name === './lib/bridge') return {BridgeClient:StubClient,discover:async()=>null};
      if(name === './lib/commands') return {onApprovalRequest(){}};
      if(name === './lib/storage') return {chooseExportFolder:async()=>null,getExportFolder:async()=>({name:'existing-folder'})};
      throw new Error(name);
    }
  });
  vm.runInContext(fs.readFileSync(path.join(root,'main.js'),'utf8'),context);
  entry.panels.photoshopFullMcpPanel.show();
  await new Promise(setImmediate);
  await getNode('chooseExportFolderButton').click();
  assert.equal(getNode('exportFolderDetail').textContent,'선택됨: existing-folder');
  assert.doesNotMatch(getNode('activity').textContent,/Cannot read|실패/);
});
