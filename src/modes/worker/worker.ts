/// <reference lib="webworker" />

let rustApp: any;

async function initRust() {
    // Importa o módulo WASM
    const wasm = await import('../../../public/dist/worker.js');
    
    // Inicializa
    await wasm.default();
    
    // Cria instância do App
    rustApp = new wasm.App();
    
    // Avisa que está pronto
    self.postMessage({ type: 'ready' });
}

initRust();

// Processa mensagens da UI
self.addEventListener('message', (e) => {
    const { id, type, payload } = e.data;
    
    try {
        let result;
        
        switch (type) {
            case 'list':
                result = rustApp.list();
                break;
                
            case 'get':
                result = rustApp.get(payload.id);
                break;
                
            case 'create':
                result = rustApp.create(
                    payload.name,
                    payload.manufacturer,
                    payload.year,
                    payload.cpu,
                    payload.gpu,
                    payload.units_sold
                );
                break;
                
            case 'update':
                result = rustApp.update(
                    payload.id,
                    payload.name,
                    payload.manufacturer,
                    payload.year,
                    payload.cpu,
                    payload.gpu,
                    payload.units_sold
                );
                break;
                
            case 'delete':
                result = rustApp.delete(payload.id);
                break;
                
            default:
                throw new Error(`Unknown type: ${type}`);
        }
        
        self.postMessage({ id, type, success: true, payload: result });
        
    } catch (error) {
        self.postMessage({
            id,
            type,
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
