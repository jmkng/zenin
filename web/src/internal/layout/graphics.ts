export function hideLoadingScreen() {
    document.body.style.overflow = "auto";
    document.body.style.background = "initial";
    const cover = document.querySelector("#cover") as HTMLDivElement | null;
    if (cover) cover.style.display = "none";
}

export function showLoadingScreen() {
    document.body.style.overflow = "hidden";
    document.body.style.background = "var(--bg);";
    const cover = document.querySelector("#cover") as HTMLDivElement | null;
    if (cover) cover.style.display = "flex";
}

export const MINIMAL_FORMAT = "MINIMAL"

export const FULL_FORMAT = "FULL";

type TimeFormatKind = typeof MINIMAL_FORMAT | typeof FULL_FORMAT;

/** Format a UTC time based on the provided string, and return it in local time. */
export function formatUTCDate(value: string, format: TimeFormatKind = FULL_FORMAT): string {
    const date = new Date(value); 

    const now = new Date();
    const isToday =
        date.getUTCFullYear() === now.getUTCFullYear() &&
        date.getUTCMonth() === now.getUTCMonth() &&
        date.getUTCDate() === now.getUTCDate();

    const formatter = new Intl.DateTimeFormat(undefined, {
        ...(format === MINIMAL_FORMAT && isToday
            ? { hour: "numeric", minute: "numeric" }
            : { day: "2-digit", month: "2-digit", year: "2-digit", hour: "numeric", minute: "numeric" }
        ),
    });

    return formatter.format(date);
}

export function formatTheme(value: string): string {
    return value.replace(/\.[^/.]+$/, "").replace(/[\s_]+/g, "-").toLowerCase();
}

export function formatMS(value: number, suffix?: boolean): string {
    let ts = `${value.toFixed(2)}`
    if (suffix) ts += ` (ms)`
    return ts;
}