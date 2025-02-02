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
