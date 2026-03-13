/// <reference lib="webworker" />

const MEMORY_PAGES = 1024; // 1024 páginas * 64KB = 64MB

// Cria a memória compartilhada
const memory = new WebAssembly.Memory({
    initial: MEMORY_PAGES,
    maximum: MEMORY_PAGES,
    shared: true
});

// O SAB é o buffer da memória
const sab = memory.buffer as unknown as SharedArrayBuffer;
const view = new Int32Array(sab);

// Imports que o WASM espera
const imports = {
    env: { memory }
};

// Carrega o WASM com a memória compartilhada
WebAssembly.instantiateStreaming(fetch('/dist/worker_sab_bg.wasm'), imports)  // ← NOME CORRETO!
    .then(({ instance }) => {
        const wasm = instance.exports as any;
        console.log('🟢 Worker: WASM carregado!', Object.keys(wasm));
        
        // AVISA MAIN THREAD ANTES DE INICIAR O RUST!
        self.postMessage({ type: 'READY', sab });
        
        // Inicia o Rust (start não bloqueia)
        if (wasm.start) {
            wasm.start();
        } else if (wasm.run) {
            wasm.run();
        }
        
        // Escuta resultados
        function listen() {
            const wait = Atomics.waitAsync(view, 0, 0);
            if (wait.async) {
                (wait.value as Promise<any>).then(() => {
                    if (view[0] === 2) {
                        self.postMessage({ type: 'RESULT' });
                    }
                    view[0] = 0;
                    listen();
                });
            }
        }
        listen();
    })
    .catch(error => {
        console.error('🔴 Worker: Erro:', error);
        self.postMessage({ type: 'ERROR', error: String(error) });
    });
