/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';

// Svelte scopes a component's CSS to the component, not to an element. A class
// used on two kinds of element is matched by every rule for that class. Twice
// this pulled a header cell out of its row: the column-hover overlay and the
// "No rows" overlay are absolutely positioned, and a header carried each one's
// class. This test fails when a rule's subject is a class that sits on more
// than one kind of element and nothing in the rule tells them apart.

// Shared on purpose: every element carrying these is meant to match.
const SHARED: Record<string, string[]> = {
  'Cell.svelte': ['bo-edit'], // the input and the select editor
  'Grid.svelte': ['selhead'], // the lead header cells (numbers, expand, select)
};

// Every component under src/lib, as source text.
const SOURCES = import.meta.glob<string>('../**/*.svelte', { query: '?raw', import: 'default', eager: true });

/** class -> the kinds of element ("tag.firstClass") that carry it. */
function carriers(markup: string): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const add = (c: string, kind: string) => out.set(c, (out.get(c) ?? new Set()).add(kind));
  for (const m of markup.matchAll(/<([a-zA-Z][\w:-]*)(\s[^<>]*?)?\/?>/gs)) {
    const attrs = m[2] ?? '';
    const cls = /\bclass="([^"]*)"/.exec(attrs)?.[1] ?? '';
    const fixed = cls.replace(/\{[^}]*\}/g, ' ').split(/\s+/).filter((c) => /^[\w-]+$/.test(c));
    const kind = m[1] + (fixed[0] ? `.${fixed[0]}` : '');
    for (const c of fixed) add(c, kind);
    for (const d of attrs.matchAll(/\bclass:([\w-]+)/g)) add(d[1], kind);
  }
  return out;
}

function collisions(src: string, shared: string[]): string[] {
  const style = [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
  const markup = src.replace(/<script[^>]*>[\s\S]*?<\/script>|<style[^>]*>[\s\S]*?<\/style>/g, '');
  const by = carriers(markup);
  const found = new Set<string>();
  const css = style.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const rule of css.matchAll(/([^{}]+)\{/g)) {
    for (const raw of rule[1].split(',')) {
      const sel = raw.trim();
      if (!sel || sel.startsWith('@')) continue;
      const subject = sel.split(/\s*[\s>+~]\s*/).pop()!.replace(/:[\w-]+(\([^)]*\))?/g, '');
      const classes = [...subject.matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
      for (const c of classes) {
        const kinds = by.get(c);
        if (!kinds || kinds.size < 2 || shared.includes(c)) continue;
        // Another class in the same compound that only one of those kinds has.
        const narrowed = classes.some((o) => o !== c && [...(by.get(o) ?? [])].filter((k) => kinds.has(k)).length === 1);
        if (!narrowed) found.add(`.${c} in "${sel}" matches ${[...kinds].sort().join(', ')}`);
      }
    }
  }
  return [...found];
}

describe('scoped class collisions', () => {
  // Glob keys are relative to this file: ./Grid.svelte, ../sparkline/….
  const files = Object.entries(SOURCES).map(([path, src]) => [path.replace(/^\.\//, 'grid/').replace(/^\.\.\//, ''), src]);

  it('scans the components', () => {
    expect(files.length).toBeGreaterThan(5);
    expect(files.map(([path]) => path)).toContain('grid/Grid.svelte');
  });

  it.each(files)('%s: no class rule hits two kinds of element', (path, src) => {
    const base = path.split('/').pop()!;
    expect(collisions(src, SHARED[base] ?? [])).toEqual([]);
  });

  it('catches the kind of collision it guards against', () => {
    const src = `<div class="empty">No rows</div><span class="hg" class:empty={x}></span>
      <style>.empty { position: absolute; } .hg.empty { border: 0; }</style>`;
    expect(collisions(src, [])).toEqual(['.empty in ".empty" matches div.empty, span.hg']);
  });
});
