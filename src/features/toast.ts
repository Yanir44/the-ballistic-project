import { createIcons, icons } from 'lucide';

export function showToast(message: string, type: 'info' | 'error' = 'info') {
  const root = document.getElementById('toast-root');
  if (!root) return;
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = type === 'error' ? 'alert-triangle' : 'info';
  
  toast.innerHTML = `
    <i data-lucide="${icon}" class="lucide-icon"></i>
    <span>${message}</span>
  `;
  
  root.appendChild(toast);
  createIcons({ icons });
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.classList.add('toast-fade-out');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 3000);
}
