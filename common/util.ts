export function ucFirst(str: string | undefined) {
    if (!str) {
        return '';
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function clone(obj: any) {
    return JSON.parse(JSON.stringify(obj));
}
