export function ucFirst(str: string | undefined) {
    if (!str) {
        return '';
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function clone(obj: any) {
    return JSON.parse(JSON.stringify(obj));
}

export function formatNumber(num?: number) {
    if (num === undefined) {
        return '';
    }
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}