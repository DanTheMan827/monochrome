import type { NavigateFunction } from 'react-router-dom';

let _navigate: NavigateFunction | null = null;

export function setNavigateFunction(fn: NavigateFunction): void {
    _navigate = fn;
}

export function getNavigateFunction(): NavigateFunction | null {
    return _navigate;
}
