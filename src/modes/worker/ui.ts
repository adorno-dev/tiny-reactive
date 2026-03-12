export class UIWorker {
    private worker!: Worker;
    private tableBody: HTMLElement;
    private totalSpan: HTMLElement;
    private statusSpan: HTMLElement;
    private modal: HTMLElement;
    private modalTitle: HTMLElement;
    private form: HTMLFormElement;
    private toast: HTMLElement;
    private confirmModal: HTMLElement;
    private confirmResolve: ((value: boolean) => void) | null = null;
    private currentEditId: number | null = null;
    private nextMessageId = 1;
    private pendingRequests = new Map();
    
    constructor() {
        this.tableBody = document.getElementById('table-body')!;
        this.totalSpan = document.getElementById('total-consoles')!;
        this.statusSpan = document.getElementById('worker-status')!;
        this.modal = document.getElementById('modal')!;
        this.modalTitle = document.getElementById('modal-title')!;
        this.form = document.getElementById('console-form') as HTMLFormElement;
        this.toast = document.getElementById('toast')!;
        this.confirmModal = document.getElementById('confirm-modal')!;
        
        this.initWorker();
        this.initEventListeners();
    }

    private initWorker() {
        this.statusSpan.textContent = 'starting worker...';
        
        this.worker = new Worker(new URL('./worker.js', import.meta.url), {
            type: 'module'
        });
        
        this.worker.addEventListener('message', (e) => {
            const { id, type, success, payload, error } = e.data;
            
            if (type === 'ready') {
                this.statusSpan.textContent = 'ready';
                this.loadConsoles();
                return;
            }
            
            const pending = this.pendingRequests.get(id);
            if (pending) {
                if (success) {
                    pending.resolve(payload);
                } else {
                    pending.reject(new Error(error));
                }
                this.pendingRequests.delete(id);
            }
        });
        
        this.worker.addEventListener('error', (error) => {
            this.statusSpan.textContent = 'error';
            this.showToast('Worker error: ' + error.message, 'error');
        });
    }
    
    private async sendRequest(type: string, payload?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const id = this.nextMessageId++;
            this.pendingRequests.set(id, { resolve, reject });
            this.worker.postMessage({ id, type, payload });
            
            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error('Request timeout'));
                }
            }, 5000);
        });
    }
    
    private initEventListeners() {
        document.getElementById('btn-new')?.addEventListener('click', () => {
            this.openCreateModal();
        });
        
        document.getElementById('btn-cancel')?.addEventListener('click', () => {
            this.closeModal();
        });
        
        document.getElementById('confirm-cancel')?.addEventListener('click', () => {
            if (this.confirmResolve) {
                this.confirmResolve(false);
                this.confirmResolve = null;
                this.confirmModal.style.display = 'none';
            }
        });
        
        document.getElementById('confirm-ok')?.addEventListener('click', () => {
            if (this.confirmResolve) {
                this.confirmResolve(true);
                this.confirmResolve = null;
                this.confirmModal.style.display = 'none';
            }
        });
        
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveConsole();
        });
    }
    
    private async loadConsoles() {
        try {
            const consoles = await this.sendRequest('list');
            this.renderTable(consoles);
            this.totalSpan.textContent = consoles.length.toString();
        } catch (error) {
            this.showToast('Error loading consoles: ' + error, 'error');
        }
    }
    
    private renderTable(consoles: any[]) {
        if (!consoles || consoles.length === 0) {
            this.tableBody.innerHTML = '<tr><td colspan="8" class="empty-message">no consoles found</td></tr>';
            return;
        }
        
        let html = '';
        for (const c of consoles) {
            html += `<tr>
                <td>${c.id}</td>
                <td>${c.name}</td>
                <td>${c.manufacturer}</td>
                <td>${c.year}</td>
                <td>${c.cpu}</td>
                <td>${c.gpu}</td>
                <td>${c.units_sold || '-'}</td>
                <td>
                    <button class="action-btn" onclick="window.workerUI.editConsole(${c.id})">edit</button>
                    <button class="action-btn" onclick="window.workerUI.deleteConsole(${c.id})">delete</button>
                </td>
            </tr>`;
        }
        
        this.tableBody.innerHTML = html;
    }
    
    private openCreateModal() {
        this.currentEditId = null;
        this.modalTitle.textContent = 'new console';
        this.form.reset();
        (document.getElementById('year') as HTMLInputElement).value = '2024';
        this.modal.style.display = 'flex';
    }
    
    private async openEditModal(id: number) {
        try {
            const console = await this.sendRequest('get', { id });
            
            this.currentEditId = id;
            this.modalTitle.textContent = 'edit console';
            
            (document.getElementById('console-id') as HTMLInputElement).value = id.toString();
            (document.getElementById('name') as HTMLInputElement).value = console.name;
            (document.getElementById('manufacturer') as HTMLInputElement).value = console.manufacturer;
            (document.getElementById('year') as HTMLInputElement).value = console.year;
            (document.getElementById('cpu') as HTMLInputElement).value = console.cpu;
            (document.getElementById('gpu') as HTMLInputElement).value = console.gpu;
            (document.getElementById('units-sold') as HTMLInputElement).value = console.units_sold || '';
            
            this.modal.style.display = 'flex';
        } catch (error) {
            this.showToast('Error loading console: ' + error, 'error');
        }
    }
    
    private closeModal() {
        this.modal.style.display = 'none';
        this.currentEditId = null;
    }
    
    private async saveConsole() {
        const name = (document.getElementById('name') as HTMLInputElement).value;
        const manufacturer = (document.getElementById('manufacturer') as HTMLInputElement).value;
        const year = parseInt((document.getElementById('year') as HTMLInputElement).value);
        const cpu = (document.getElementById('cpu') as HTMLInputElement).value;
        const gpu = (document.getElementById('gpu') as HTMLInputElement).value;
        const units_sold_input = (document.getElementById('units-sold') as HTMLInputElement).value;
        const units_sold = units_sold_input ? parseFloat(units_sold_input) : null;
        
        const data = {
            name,
            manufacturer,
            year,
            cpu,
            gpu,
            units_sold
        };
        
        try {
            if (this.currentEditId) {
                await this.sendRequest('update', {
                    id: this.currentEditId,
                    ...data
                });
                this.showToast('Console updated successfully', 'success');
            } else {
                await this.sendRequest('create', data);
                this.showToast('Console created successfully', 'success');
            }
            
            this.closeModal();
            await this.loadConsoles();
        } catch (error) {
            this.showToast('Error saving console: ' + error, 'error');
        }
    }
    
    private async confirm(message: string): Promise<boolean> {
        return new Promise((resolve) => {
            this.confirmResolve = resolve;
            document.getElementById('confirm-message')!.textContent = message;
            this.confirmModal.style.display = 'flex';
        });
    }
    
    private showToast(message: string, type: 'success' | 'error' = 'success') {
        this.toast.textContent = message;
        this.toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 3000);
    }
    
    public async editConsole(id: number) {
        await this.openEditModal(id);
    }
    
    public async deleteConsole(id: number) {
        const confirmed = await this.confirm('Are you sure you want to delete this console?');
        
        if (confirmed) {
            try {
                await this.sendRequest('delete', { id });
                await this.loadConsoles();
                this.showToast('Console deleted successfully', 'success');
            } catch (error) {
                this.showToast('Error deleting console: ' + error, 'error');
            }
        }
    }
}

declare global {
    interface Window {
        workerUI: UIWorker;
    }
}
