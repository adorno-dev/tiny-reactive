import { UILegacy } from './ui.js';
import init, { App } from '../../../public/dist/worker.js';

async function main() {
    // init() já é a função assíncrona (default)
    await init();
    
    // App deve estar disponível agora
    const app = new App();
    window.legacyUI = new UILegacy(app);
}

main();
