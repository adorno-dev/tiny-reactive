import init, { App } from '../../../public/dist/worker.js';
import { UILegacy } from './ui.js';

async function main() {
    await init();
    const app = new App();
    window.legacyUI = new UILegacy(app);
}

main();
