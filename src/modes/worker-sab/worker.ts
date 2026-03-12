/// <reference lib="webworker" />

let sab: SharedArrayBuffer;

// Carrega o WASM puro (sem glue code)
WebAssembly.instantiateStreaming(fetch('/dist/worker_bg.wasm'), {})
    .then(async ({ instance }) => {
        const exports = instance.exports as any;
        
        sab = new SharedArrayBuffer(1024 * 1024);
        const sabPtr = new Uint8Array(sab).byteOffset;
        
        exports.set_sab(sabPtr, sab.byteLength);
        exports.run();
        
        self.postMessage({ type: 'ready', sab });
    })
    .catch(error => {
        console.error('❌ Failed to load WASM:', error);
    });
