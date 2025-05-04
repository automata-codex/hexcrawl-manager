import { writable } from 'svelte/store';

export const selectedHex = writable<string | null>(null);
