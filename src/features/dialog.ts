import { createIcons, icons } from 'lucide';

export function showConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const root = document.getElementById('dialog-modal-root')!;
    root.innerHTML = `
      <div class="qr-modal-backdrop" id="dialog-backdrop">
        <div class="qr-modal">
          <h3 style="margin-bottom: 1rem; display:flex; align-items:center; gap:0.5rem; justify-content:center;"><i data-lucide="help-circle" class="lucide-icon"></i> Confirm</h3>
          <p style="margin-bottom: 1.5rem; font-size: 1rem; color: var(--text);">${message}</p>
          <div style="display:flex;gap:0.5rem;justify-content:center;">
            <button class="btn btn-secondary" id="btn-dialog-cancel">Cancel</button>
            <button class="btn btn-primary" id="btn-dialog-ok">OK</button>
          </div>
        </div>
      </div>`;
      
    createIcons({ icons });

    const cleanup = () => { root.innerHTML = ''; };

    document.getElementById('btn-dialog-ok')!.addEventListener('click', () => {
      cleanup();
      resolve(true);
    });
    
    document.getElementById('btn-dialog-cancel')!.addEventListener('click', () => {
      cleanup();
      resolve(false);
    });
    
    document.getElementById('dialog-backdrop')!.addEventListener('click', e => {
      if (e.target === e.currentTarget) {
        cleanup();
        resolve(false);
      }
    });
  });
}

export function showPrompt(message: string, defaultValue: string = ''): Promise<string | null> {
  return new Promise((resolve) => {
    const root = document.getElementById('dialog-modal-root')!;
    root.innerHTML = `
      <div class="qr-modal-backdrop" id="dialog-backdrop">
        <div class="qr-modal" style="min-width: 320px;">
          <h3 style="margin-bottom: 1rem; display:flex; align-items:center; gap:0.5rem;"><i data-lucide="edit-3" class="lucide-icon"></i> Prompt</h3>
          <p style="margin-bottom: 0.5rem; font-size: 0.9rem; text-align: left;">${message}</p>
          <input type="text" id="dialog-input" value="${defaultValue}" class="dialog-input" style="width: 100%; padding: 0.5rem; margin-bottom: 1.5rem; background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: var(--radius-sm);" />
          <div style="display:flex;gap:0.5rem;justify-content:flex-end;">
            <button class="btn btn-secondary" id="btn-dialog-cancel">Cancel</button>
            <button class="btn btn-primary" id="btn-dialog-ok">OK</button>
          </div>
        </div>
      </div>`;
      
    createIcons({ icons });
    
    const input = document.getElementById('dialog-input') as HTMLInputElement;
    input.focus();
    input.select();

    const cleanup = () => { root.innerHTML = ''; };

    document.getElementById('btn-dialog-ok')!.addEventListener('click', () => {
      const val = input.value;
      cleanup();
      resolve(val);
    });
    
    document.getElementById('btn-dialog-cancel')!.addEventListener('click', () => {
      cleanup();
      resolve(null);
    });
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = input.value;
        cleanup();
        resolve(val);
      } else if (e.key === 'Escape') {
        cleanup();
        resolve(null);
      }
    });
    
    document.getElementById('dialog-backdrop')!.addEventListener('click', e => {
      if (e.target === e.currentTarget) {
        cleanup();
        resolve(null);
      }
    });
  });
}
