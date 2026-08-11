/** Premium Smooth Height Animation System — 60fps high-performance transitions without content distortion */

export function flip(element: HTMLElement, callback: () => void): void {
  const card = element.classList.contains('card')
    ? element
    : (element.closest('.card') as HTMLElement || element);

  const cardBody = card.querySelector('.card-body') as HTMLElement | null;

  // Cancel any ongoing animations so we can measure clean state
  const prevAnim = (card as any)._heightAnim as Animation | undefined;
  if (prevAnim) {
    prevAnim.onfinish = null;
    prevAnim.cancel();
  }
  const prevBodyAnim = cardBody ? (cardBody as any)._fadeAnim as Animation | undefined : null;
  if (prevBodyAnim) {
    prevBodyAnim.cancel();
  }

  // Ensure styles are clean before measurement
  card.style.height = '';
  if (cardBody) cardBody.style.opacity = '';

  // 1. Record initial state
  const firstCardRect = card.getBoundingClientRect();
  const wasCollapsed = cardBody ? cardBody.classList.contains('collapsed') : false;

  // 2. Execute DOM modification
  callback();

  // 3. Record final state
  const lastCardRect = card.getBoundingClientRect();
  const isNowCollapsed = cardBody ? cardBody.classList.contains('collapsed') : false;

  const firstH = firstCardRect.height;
  const lastH = lastCardRect.height;
  const heightDelta = lastH - firstH;

  // 4. Handle Card Container Height Animation & Content Fade/Slide
  if (Math.abs(heightDelta) > 1) {
    card.style.overflow = 'hidden';

    if (wasCollapsed === false && isNowCollapsed === true && cardBody) {
      // Collapsing: keep body visible while container collapses, fade out content
      cardBody.classList.remove('collapsed');
      cardBody.style.opacity = '1';

      const fadeOut = cardBody.animate([
        { opacity: 1, transform: 'translateY(0)' },
        { opacity: 0, transform: 'translateY(-12px)' }
      ], {
        duration: 200,
        easing: 'ease-in',
        fill: 'forwards'
      });
      (cardBody as any)._fadeAnim = fadeOut;

      const heightAnim = card.animate([
        { height: `${firstH}px` },
        { height: `${lastH}px` }
      ], {
        duration: 350,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
      });
      (card as any)._heightAnim = heightAnim;

      heightAnim.onfinish = () => {
        cardBody.classList.add('collapsed');
        cardBody.style.opacity = '';
        fadeOut.cancel();
        card.style.overflow = '';
        card.style.height = '';
        (card as any)._heightAnim = null;
      };
    } else if (wasCollapsed === true && isNowCollapsed === false && cardBody) {
      // Opening: height expands + content slides & fades in cleanly without distortion
      const heightAnim = card.animate([
        { height: `${firstH}px` },
        { height: `${lastH}px` }
      ], {
        duration: 350,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
      });
      (card as any)._heightAnim = heightAnim;

      const fadeIn = cardBody.animate([
        { opacity: 0, transform: 'translateY(-12px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], {
        duration: 350,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
      });
      (cardBody as any)._fadeAnim = fadeIn;

      heightAnim.onfinish = () => {
        card.style.overflow = '';
        card.style.height = '';
        (card as any)._heightAnim = null;
      };
    } else {
      // General height change (e.g. results/content rendered inside card)
      const heightAnim = card.animate([
        { height: `${firstH}px` },
        { height: `${lastH}px` }
      ], {
        duration: 350,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
      });
      (card as any)._heightAnim = heightAnim;

      heightAnim.onfinish = () => {
        card.style.overflow = '';
        card.style.height = '';
        (card as any)._heightAnim = null;
      };
    }
  }
}

/** Run FLIP on a list of children — useful for list reordering */
export function flipChildren(parent: HTMLElement, callback: () => void): void {
  const children = Array.from(parent.children) as HTMLElement[];
  const firsts = children.map(el => el.getBoundingClientRect());

  callback();

  const lasts = children.map(el => el.getBoundingClientRect());

  children.forEach((el, i) => {
    const dx = firsts[i].left - lasts[i].left;
    const dy = firsts[i].top  - lasts[i].top;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

    el.animate([
      { transform: `translate(${dx}px, ${dy}px)` },
      { transform: 'translate(0, 0)' }
    ], {
      duration: 300,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
    });
  });
}

/** Removed to prevent layout thrashing and conflicting animations */
export function initCardObserver(): void {
  // No-op
}


