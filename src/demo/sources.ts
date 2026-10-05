/// <reference types="vite/client" />
// Example sources for the demo's Code view. Each file is a lazy raw import, so
// a source is fetched only when someone opens it and the page stays light.
const raw = import.meta.glob<string>('./examples/*.svelte', { query: '?raw', import: 'default' });

/** The source of `src/demo/examples/<file>.svelte`. */
export function loadSource(file: string): Promise<string> {
  const load = raw[`./examples/${file}.svelte`];
  return load ? load() : Promise.reject(new Error(`No source for ${file}`));
}
