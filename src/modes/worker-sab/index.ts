import { UIWorkerSAB } from './ui.js';

function showErrorPopup(message: string, details: string): void {
    // Remove any existing popup
    const existing = document.querySelector('.error-popup');
    if (existing) existing.remove();
    
    // Create popup
    const popup = document.createElement('div');
    popup.className = 'error-popup';
    popup.innerHTML = `
        <div class="error-popup-content">
            <h3>⚠️ SAB Mode Error</h3>
            <p>${message}</p>
            <pre>${details}</pre>
            <div class="error-popup-actions">
                <button class="btn" onclick="this.closest('.error-popup').remove()">Dismiss</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(popup);
}

async function main(): Promise<void> {
    const statusEl = document.getElementById('worker-status');
    const sabEl = document.getElementById('sab-status');
    
    console.log('🔍 crossOriginIsolated:', crossOriginIsolated);
    
    if (!crossOriginIsolated) {
        if (statusEl) statusEl.textContent = 'error';
        if (sabEl) sabEl.textContent = 'not isolated';
        
        showErrorPopup(
            'Cross-Origin Isolation Required',
            `SAB mode requires these headers:\n\n` +
            `Cross-Origin-Opener-Policy: same-origin\n` +
            `Cross-Origin-Embedder-Policy: require-corp\n\n` +
            `Run: bun run serve:prod\n\n` +
            `Current: ${location.hostname}:${location.port}\n` +
            `Protocol: ${location.protocol}`
        );
        return;
    }
    
    if (sabEl) sabEl.textContent = 'available';
    window.workerSABUI = new UIWorkerSAB();
}

main();
