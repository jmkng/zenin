export function hideLoadingScreen() {
    document.body.style.overflow = 'auto';
    document.body.style.background = 'initial';
    const cover = document.querySelector('#cover') as HTMLDivElement | null;
    if (cover) cover.style.display = 'none';
}

export function showLoadingScreen() {
    document.body.style.overflow = 'hidden';
    document.body.style.background = 'var(--bg);';
    const cover = document.querySelector('#cover') as HTMLDivElement | null;
    if (cover) cover.style.display = 'flex';
}

export function isOffScreen(rect: DOMRect): boolean {
    return isOffScreenRight(rect) || isOffScreenLeft(rect) || isOffScreenBottom(rect) || isOffScreenTop(rect);
};

export function isOffScreenRight(rect: DOMRect): boolean {
    return rect.right > window.innerWidth;
}

export function isOffScreenLeft(rect: DOMRect): boolean {
    return rect.left < 0;
}

export function isOffScreenBottom(rect: DOMRect): boolean {
    return rect.bottom > window.innerHeight;
}

export function isOffScreenTop(rect: DOMRect): boolean {
    return rect.top < 0;
}

export function isScrolledToBottom(element: HTMLElement): boolean {
    return element.scrollHeight - element.clientHeight <= element.scrollTop + 1;
}

export function adjustPosition(element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    if (isOffScreenTop(rect)) element.classList.add('zenin__h_limit_top');
    if (isOffScreenRight(rect)) element.classList.add('zenin__h_limit_right');
    if (isOffScreenBottom(rect)) element.classList.add('zenin__h_limit_bottom');
    if (isOffScreenLeft(rect)) element.classList.add('zenin__h_limit_left');
}

/** Remove all "limit" classes from an element.
 *
 * ex: zenin_h_limit_xxx (top, bottom, left, right) */
export function unlimit(element: HTMLElement) {
    element.classList.remove('zenin__h_limit_top')
    element.classList.remove('zenin__h_limit_right')
    element.classList.remove('zenin__h_limit_bottom')
    element.classList.remove('zenin__h_limit_left')
};

export function formatDate(value: string): string {
    const date = new Date(value);
    const options = { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
    const formatter = new Intl.DateTimeFormat(undefined, {
        ...options,
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: 'numeric',
        minute: 'numeric',
    });
    return formatter.format(date);
}

export function formatMilliseconds(value: number): string {
    return `${value.toFixed(2)} (ms)`
}
