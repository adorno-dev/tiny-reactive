export class UIWorkerSAB {
    private worker!: Worker;
    private tableBody: HTMLElement;
    private totalSpan: HTMLElement;
    private statusSpan: HTMLElement;
    private sabSpan: HTMLElement;
    private modal: HTMLElement;
    private modalTitle: HTMLElement;
    private form: HTMLFormElement;
    private toast: HTMLElement;
    private confirmModal: HTMLElement;
    private confirmResolve: ((value: boolean) => void) | null = null;
    private currentEditId: number | null = null;
    
    private sab: SharedArrayBuffer | null = null;
    private view: Int32Array | null = null;
    private consoles: any[] = [];
    
    constructor() {
        this.tableBody = document.getElementById('table-body')!;
        this.totalSpan = document.getElementById('total-consoles')!;
        this.statusSpan = document.getElementById('worker-status')!;
        this.sabSpan = document.getElementById('sab-status')!;
        this.modal = document.getElementById('modal')!;
        this.modalTitle = document.getElementById('modal-title')!;
        this.form = document.getElementById('console-form') as HTMLFormElement;
        this.toast = document.getElementById('toast')!;
        this.confirmModal = document.getElementById('confirm-modal')!;
        
        this.initWorker();
        this.initEventListeners();
    }
    
    private initWorker() {
        console.log('🔵 SAB: initWorker');
        this.statusSpan.textContent = 'starting worker...';
        
        this.worker = new Worker(new URL('./worker-sab.js', import.meta.url), {
            type: 'module'
        });
        
        this.worker.addEventListener('message', (e) => {
            const { type, sab } = e.data;
            
            if (type === 'ready') {
                console.log('🔵 SAB: worker ready, SAB received');
                this.sab = sab;
                this.view = new Int32Array(sab);
                this.statusSpan.textContent = 'ready';
                this.sabSpan.textContent = 'active';
                this.loadConsoles();
                this.setupMessageListener();
            }
        });
        
        this.worker.addEventListener('error', (error) => {
            console.error('🔴 SAB worker error:', error);
            this.statusSpan.textContent = 'error';
            this.showToast('Worker error: ' + error.message, 'error');
        });
    }
    
    private setupMessageListener() {
        // Escuta mensagens do worker (postMessage normal)
        this.worker.addEventListener('message', (e) => {
            const { type, data } = e.data;
            if (type === 'result') {
                this.consoles = data;
                this.renderTable(this.consoles);
                this.totalSpan.textContent = this.consoles.length.toString();
            }
        });
    }
    
    private sendCommand(op: number, id: number, data: any) {
        // Usa postMessage normal para comandos (mais simples)
        this.worker.postMessage({ op, id, data });
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
    
    private loadConsoles() {
        this.sendCommand(5, 0, {}); // LIST
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
                    <button class="action-btn" onclick="window.workerSABUI.editConsole(${c.id})">edit</button>
                    <button class="action-btn" onclick="window.workerSABUI.deleteConsole(${c.id})">delete</button>
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
    
    private openEditModal(id: number) {
        const console = this.consoles.find(c => c.id === id);
        if (!console) return;
        
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
    }
    
    private closeModal() {
        this.modal.style.display = 'none';
        this.currentEditId = null;
    }
    
    private saveConsole() {
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
        
        if (this.currentEditId) {
            this.sendCommand(3, this.currentEditId, data); // UPDATE
            this.showToast('Console updated successfully', 'success');
        } else {
            this.sendCommand(1, 0, data); // CREATE
            this.showToast('Console created successfully', 'success');
        }
        
        this.closeModal();
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
    
    public editConsole(id: number) {
        this.openEditModal(id);
    }
    
    public deleteConsole(id: number) {
        this.confirm('Are you sure you want to delete this console?').then((confirmed) => {
            if (confirmed) {
                this.sendCommand(4, id, {}); // DELETE
                this.showToast('Console deleted successfully', 'success');
            }
        });
    }
}

declare global {
    interface Window {
        workerSABUI: UIWorkerSAB;
    }
}
