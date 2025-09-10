export function announce(message: string) {
  const live = document.getElementById('aria-live');
  if (live) {
    live.textContent = '';
    // Small delay to retrigger announcement
    setTimeout(() => {
      live.textContent = message;
    }, 10);
  }
}

export function setupKeyboardShortcuts(onSave: () => void, onExport: () => void) {
  window.addEventListener('keydown', (e) => {
    if (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      if (e.code === 'KeyS') {
        e.preventDefault();
        onSave();
      }
      if (e.code === 'KeyE') {
        e.preventDefault();
        onExport();
      }
    }
  });
}

export function focusVisiblePolyfill() {
  // Basic :focus-visible polyfill behavior
  let hadKeyboardEvent = true;
  const keyboardMod = () => (hadKeyboardEvent = true);
  const pointerMod = () => (hadKeyboardEvent = false);
  document.addEventListener('keydown', keyboardMod, true);
  document.addEventListener('mousedown', pointerMod, true);
  document.addEventListener('pointerdown', pointerMod, true);
  document.addEventListener('touchstart', pointerMod, true);
  document.body.addEventListener(
    'focus',
    (e) => {
      if (hadKeyboardEvent) (e.target as HTMLElement).classList.add('focus-visible');
    },
    true
  );
  document.body.addEventListener(
    'blur',
    (e) => {
      (e.target as HTMLElement).classList.remove('focus-visible');
    },
    true
  );
}

