/// <reference types="bun-types" />

// Import do WASM
import init, { App } from '../public/pkg/worker.js';

console.log('🚀 Tiny reactive initialized');

// interface Console {
//     id: number;
//     name: string;
//     manufacturer: string;
//     year: number;
//     cpu: string;
//     gpu: string;
//     units_sold?: number;
// }

class AppUI {
    private rustApp: any; // Will hold the Rust App instance
    private statusEl: HTMLElement | null;
    private countEl: HTMLElement | null;
    private tableBody: HTMLElement | null;
    private modal: HTMLElement | null;
    private modalTitle: HTMLElement | null;
    private form: HTMLFormElement | null;
    private currentEditId: number | null = null;
    
    constructor() {
        this.statusEl = document.getElementById('system-status');
        this.countEl = document.getElementById('total-consoles');
        this.tableBody = document.getElementById('table-body');
        this.modal = document.getElementById('modal');
        this.modalTitle = document.getElementById('modal-title');
        this.form = document.getElementById('console-form') as HTMLFormElement;
        
        this.initEventListeners();
        this.initWasm();
    }
    
    private async initWasm() {
        this.setStatus('loading wasm...');
        
        try {
            // Initialize WASM
            await init();
            this.rustApp = new App();
            
            this.setStatus('ready');
            this.loadConsoles();
        } catch (error) {
            console.error('Failed to load WASM:', error);
            this.setStatus('error');
        }
    }
    
    private initEventListeners(): void {
        document.getElementById('btn-new')?.addEventListener('click', () => {
            this.openCreateModal();
        });
        
        document.getElementById('btn-cancel')?.addEventListener('click', () => {
            this.closeModal();
        });
        
        this.form?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveConsole();
        });
    }
    
    private loadConsoles(): void {
        if (!this.rustApp) return;
        
        try {
            const consoles = this.rustApp.list();
            this.renderTable(consoles);
            this.updateCount(consoles.length);
        } catch (error) {
            console.error('Failed to load consoles:', error);
        }
    }
    
    private renderTable(consoles: any[]): void {
        if (!this.tableBody) return;
        
        if (!consoles || consoles.length === 0) {
            this.tableBody.innerHTML = '<tr><td colspan="8" class="empty-message">no consoles found. click "new console" to add one.</td></tr>';
            return;
        }
        
        let html = '';
        for (const c of consoles) {
            html += `
                <tr>
                    <td>${c.id}</td>
                    <td>${c.name}</td>
                    <td>${c.manufacturer}</td>
                    <td>${c.year}</td>
                    <td>${c.cpu}</td>
                    <td>${c.gpu}</td>
                    <td>${c.units_sold || '-'}</td>
                    <td>
                        <button class="action-btn" onclick="appUI.editConsole(${c.id})">edit</button>
                        <button class="action-btn" onclick="appUI.deleteConsole(${c.id})">delete</button>
                    </td>
                </tr>
            `;
        }
        
        this.tableBody.innerHTML = html;
    }
    
    private openCreateModal(): void {
        this.currentEditId = null;
        this.modalTitle!.textContent = 'new console';
        this.form!.reset();
        
        // Set default year
        (document.getElementById('year') as HTMLInputElement).value = '2024';
        
        this.modal!.style.display = 'flex';
    }
    
    private openEditModal(id: number): void {
        if (!this.rustApp) return;
        
        try {
            const console = this.rustApp.get(id);
            if (!console) return;
            
            this.currentEditId = id;
            this.modalTitle!.textContent = 'edit console';
            
            // Fill form
            (document.getElementById('console-id') as HTMLInputElement).value = id.toString();
            (document.getElementById('name') as HTMLInputElement).value = console.name;
            (document.getElementById('manufacturer') as HTMLInputElement).value = console.manufacturer;
            (document.getElementById('year') as HTMLInputElement).value = console.year;
            (document.getElementById('cpu') as HTMLInputElement).value = console.cpu;
            (document.getElementById('gpu') as HTMLInputElement).value = console.gpu;
            (document.getElementById('units-sold') as HTMLInputElement).value = console.units_sold || '';
            
            this.modal!.style.display = 'flex';
        } catch (error) {
            console.error('Failed to load console:', error);
        }
    }
    
    private closeModal(): void {
        this.modal!.style.display = 'none';
        this.currentEditId = null;
    }
    
    private saveConsole(): void {
        if (!this.rustApp) return;
        
        // Get form values
        const consoleData = {
            id: this.currentEditId || 0,
            name: (document.getElementById('name') as HTMLInputElement).value,
            manufacturer: (document.getElementById('manufacturer') as HTMLInputElement).value,
            year: parseInt((document.getElementById('year') as HTMLInputElement).value),
            cpu: (document.getElementById('cpu') as HTMLInputElement).value,
            gpu: (document.getElementById('gpu') as HTMLInputElement).value,
            units_sold: (document.getElementById('units-sold') as HTMLInputElement).value 
                ? parseFloat((document.getElementById('units-sold') as HTMLInputElement).value) 
                : null
        };
        
        try {
            if (this.currentEditId) {
                // Update
                this.rustApp.update(this.currentEditId, consoleData);
            } else {
                // Create
                this.rustApp.create(consoleData);
            }
            
            this.closeModal();
            this.loadConsoles(); // Refresh list
        } catch (error) {
            console.error('Failed to save console:', error);
            alert('Error saving console');
        }
    }
    
    // These are called from onclick in the table
    public editConsole(id: number): void {
        this.openEditModal(id);
    }
    
    public deleteConsole(id: number): void {
        if (!this.rustApp) return;
        
        if (confirm('Delete this console?')) {
            try {
                this.rustApp.delete(id);
                this.loadConsoles(); // Refresh list
            } catch (error) {
                console.error('Failed to delete console:', error);
            }
        }
    }
    
    private setStatus(status: string): void {
        if (this.statusEl) {
            this.statusEl.textContent = status;
        }
    }
    
    private updateCount(count: number): void {
        if (this.countEl) {
            this.countEl.textContent = count.toString();
        }
    }
}

// Make appUI global for onclick handlers
declare global {
    interface Window {
        appUI: AppUI;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.appUI = new AppUI();
});
