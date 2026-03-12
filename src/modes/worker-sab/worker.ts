/// <reference lib="webworker" />

import * as wasm from '../../../public/dist/worker.js';

let rustApp: any;
let sab: SharedArrayBuffer;
let view: Int32Array;

async function initWasm() {
    await wasm.default();
    rustApp = new wasm.App();
    
    sab = new SharedArrayBuffer(1024 * 1024);
    view = new Int32Array(sab);
    
    self.postMessage({ type: 'ready', sab });
    
    // Escuta notificações do Rust
    listenForRust();
}

function listenForRust() {
    Atomics.waitAsync(view, 0, 0).value.then(() => {
        self.postMessage({ type: 'result' });
        listenForRust();
    });
}

initWasm();
