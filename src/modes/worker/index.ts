import { UIWorker } from './ui.js';

async function main() {
    window.workerUI = new UIWorker();
}

main();
