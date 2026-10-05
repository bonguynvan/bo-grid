import { describe, it, expect } from 'vitest';
import { highlight } from './highlight';

describe('highlight (demo code view)', () => {
  it('escapes HTML so the source shows as text', () => {
    const out = highlight('<Grid {rows} />');
    expect(out).not.toContain('<Grid');
    expect(out).toContain('&lt;');
    expect(out).toContain('Grid');
  });

  it('marks keywords, strings, comments and numbers', () => {
    const out = highlight("const n = 42; // answer\nlet s = 'hi';");
    expect(out).toContain('<span class="k">const</span>');
    expect(out).toContain('<span class="n">42</span>');
    expect(out).toContain('<span class="c">// answer</span>');
    expect(out).toContain('<span class="s">&#39;hi&#39;</span>');
  });

  it('marks markup tags and Svelte blocks', () => {
    const out = highlight('{#if ok}<span class="x">hi</span>{/if}');
    expect(out).toContain('<span class="t">&lt;span</span>');
    expect(out).toContain('<span class="b">{#if</span>');
    expect(out).toContain('<span class="b">{/if}</span>');
  });

  it('does not highlight keywords inside strings or comments', () => {
    const out = highlight("'const' /* let */");
    expect(out).not.toContain('<span class="k">');
  });

  it('keeps every character, in order', () => {
    const src = "<script lang=\"ts\">\n  const a = `x${1}`;\n</script>\n<!-- note -->\n";
    const text = highlight(src)
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
    expect(text).toBe(src);
  });
});
