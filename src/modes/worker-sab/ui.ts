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
    private dataView: Uint8Array | null = null;
    private consoles: any[] = [];
    private ready = false;
    
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
        console.log('🔵 UI: Iniciando worker...');
        this.statusSpan.textContent = 'starting worker...';
        
        this.worker = new Worker(new URL('./worker-sab.js', import.meta.url), {
            type: 'module'
        });
        
        this.worker.addEventListener('message', (e) => {
            console.log('🔵 UI: Mensagem do worker:', e.data);
            
            const { type, sab, error } = e.data;
            
            if (type === 'READY') {
                console.log('🔵 UI: Worker READY! SAB recebido');
                this.sab = sab;
                this.view = new Int32Array(sab);
                this.dataView = new Uint8Array(sab);
                this.ready = true;
                this.statusSpan.textContent = 'ready';
                this.sabSpan.textContent = 'active';
                
                this.loadConsoles();
                this.waitForResults();
            }
            
            if (type === 'RESULT') {
                console.log('🔵 UI: Worker notificou RESULT');
                this.readResult();
            }
            
            if (type === 'ERROR') {
                console.error('🔴 UI: Erro no worker:', error);
                this.statusSpan.textContent = 'error';
                this.showToast('Worker error: ' + error, 'error');
            }
        });
        
        this.worker.addEventListener('error', (error) => {
            console.error('🔴 UI: Worker error event:', error);
            this.statusSpan.textContent = 'error';
            this.showToast('Worker error: ' + error.message, 'error');
        });
    }
    
    private async waitForResults() {
        if (!this.view) return;
        console.log('👂 UI: Aguardando resultados...');
        
        const listen = async () => {
            const wait = Atomics.waitAsync(this.view!, 0, 0);
            
            if (wait.async) {
                await wait.value;
                console.log('🔔 UI: Acordou! view[0]=', this.view![0]);
                
                const cmd = this.view![0];
                if (cmd === 2) {
                    const dataLen = this.view![1];
                    console.log('📦 UI: Resultado pronto, len=', dataLen);
                    
                    if (dataLen > 0 && this.dataView && this.sab) {
                        const resultBytes = this.dataView.slice(16, 16 + dataLen);
                        const resultStr = new TextDecoder().decode(resultBytes);
                        
                        try {
                            this.consoles = JSON.parse(resultStr);
                            console.log('✅ UI: Dados recebidos:', this.consoles.length);
                            this.renderTable(this.consoles);
                            this.totalSpan.textContent = this.consoles.length.toString();
                        } catch (e) {
                            console.error('🔴 UI: Erro ao parsear resultado:', e);
                        }
                    }
                    this.view![0] = 0;
                }
                listen();
            }
        };
        
        listen();
    }
    
    private sendCommand(op: number, data: any = {}) {
        if (!this.ready || !this.view || !this.dataView || !this.sab) {
            console.log('⏳ UI: Worker não pronto, comando enfileirado');
            setTimeout(() => this.sendCommand(op, data), 100);
            return;
        }
        
        const encoder = new TextEncoder();
        const dataBytes = encoder.encode(JSON.stringify(data));
        
        // 🔥 LOG CRUCIAL: ver data_len
        console.log('📤 UI: Enviando comando', op, 'data_len=', dataBytes.length, 'dados:', data);
        
        // Escreve comando no SAB
        this.view[1] = op;
        this.view[2] = dataBytes.length;
        
        if (dataBytes.length > 0) {
            this.dataView.set(dataBytes, 16);
        }
        
        // Sinaliza worker
        this.view[0] = 1;
        Atomics.notify(this.view, 0, 1);
        console.log('✅ UI: Comando enviado, notificação enviada');
    }
    
    private readResult() {
        if (!this.view || !this.dataView || !this.sab) return;
        
        const dataLen = this.view[1];
        console.log('📦 UI: Lendo resultado, data_len=', dataLen);
        
        if (dataLen > 0) {
            const resultBytes = this.dataView.slice(16, 16 + dataLen);
            const resultStr = new TextDecoder().decode(resultBytes);
            
            try {
                this.consoles = JSON.parse(resultStr);
                console.log('✅ UI: Dados parseados:', this.consoles.length);
                this.renderTable(this.consoles);
                this.totalSpan.textContent = this.consoles.length.toString();
            } catch (e) {
                console.error('🔴 UI: Erro ao parsear resultado:', e);
            }
        }
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
        console.log('📥 UI: Carregando consoles...');
        this.sendCommand(5); // LIST
    }
    
    private renderTable(consoles: any[]) {
        console.log('🎨 UI: Renderizando tabela com', consoles.length, 'itens');
        
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
            console.log('📝 UI: Atualizando console', this.currentEditId, data);
            this.sendCommand(3, { id: this.currentEditId, ...data });
            this.showToast('Console updated successfully', 'success');
        } else {
            console.log('➕ UI: Criando console', data);
            this.sendCommand(1, data);
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
                console.log('🗑️ UI: Deletando console', id);
                this.sendCommand(4, { id });
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
