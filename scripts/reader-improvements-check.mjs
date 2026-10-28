// Regresiones del lector: navegación, caché, lectura continua y áreas táctiles.
// QA local gratuita: node scripts/reader-improvements-check.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { adjacentChapter, mergeChapterMetadata } from '../src/reader-navigation.js';

const a = { id: 'a', num: 1, vol: 1, updated_at: 'v1', title: 'Uno' };
const b = { id: 'b', num: 2, vol: 1, updated_at: 'v1', title: 'Dos' };
const c = { id: 'c', num: 3, vol: 2, updated_at: 'v1', title: 'Tres' };
const original = [a, b, c];
assert.equal(adjacentChapter(original, a, 1), b);
assert.equal(adjacentChapter(original, b, -1), a);
assert.equal(adjacentChapter(original, c, 1), null);
assert.equal(adjacentChapter(original, a, -1), null);
assert.equal(adjacentChapter(original, { ...b }, 1), c, 'La navegación no depende de identidad referencial');
assert.equal(adjacentChapter(original, { id: 'ausente' }, 1), null, 'Un capítulo revocado no regresa al primer capítulo');
assert.equal(adjacentChapter(original, null, 1), null);

const bodies = new Map([['a', ['cap-a']], ['b', ['cap-b']], ['c', ['cap-c']]]);
const versions = new Map([['a', 'v1'], ['b', 'v1'], ['c', 'v1']]);
const incoming = [
  { ...a, title: 'Uno corregido', updated_at: 'v1' },
  { ...b, title: 'Dos actualizado', updated_at: 'v2' },
  { id: 'd', num: 4, vol: 2, updated_at: 'v1', title: 'Cuatro' }
];
const merged = mergeChapterMetadata(original, incoming, bodies, versions);
assert.equal(merged.chapters[0], a, 'Conserva la referencia del primer capítulo');
assert.equal(merged.chapters[1], b, 'Conserva la referencia del capítulo activo');
assert.equal(merged.chapters[1].title, 'Dos actualizado');
assert.equal(merged.chapters[1].updated_at, 'v2');
assert.equal(adjacentChapter(merged.chapters, b, 1).id, 'd');
assert.deepEqual([...merged.changed].sort(), ['b', 'c']);
assert.equal(bodies.has('a'), true, 'Conserva texto de revisión idéntica');
assert.equal(bodies.has('b'), false, 'Revocar contenido anterior al refresco');
assert.equal(bodies.has('c'), false, 'Revocar contenido que dejó de estar publicado');
assert.equal(versions.has('b'), false);
assert.equal(versions.has('c'), false);
assert.equal(adjacentChapter(merged.chapters, c, 1), null);
assert.equal(merged.chapters.length, 3);

const reader = readFileSync('src/reader.js', 'utf8');
const css = readFileSync('src/reader-a11y.css', 'utf8');
assert.match(reader, /mergeChapterMetadata\(S\.chapters, n\.chapters, S\.bodies, S\.bodyVersions\)/);
assert.match(reader, /const nextOf = ch => adjacentChapter\(S\.chapters, ch, 1\)/);
assert.match(reader, /const prevOf = ch => adjacentChapter\(S\.chapters, ch, -1\)/);
assert.doesNotMatch(reader, /S\.chapters\.indexOf\(ch\)/);
assert.match(reader, /S\.creditsFresh = attachPublicCredits\(sb, \[s\]\)\.then\(/);
assert.doesNotMatch(reader, /await attachPublicCredits\(sb, \[/);
assert.match(reader, /if \(!stillOpening\(\)\) return;/);
assert.match(reader, /openingId !== S\.openId \|\| !flow\.isConnected/);
assert.match(reader, /S\.bodyVersions\.get\(ch\.id\) === rev/);
assert.match(reader, /aria-pressed=/);
assert.match(reader, /--swatch:\$\{c\}/);
assert.match(css, /\.rd-panel\[data-kind="toc"\] a\s*\{[^}]*min-height:44px/s);
assert.match(css, /\.rd-pop \.sw\s*\{[^}]*width:44px;height:44px/s);
assert.match(css, /\.rd-pop\{max-width:calc\(100vw - 16px\);flex-wrap:wrap\}/);
console.log('QA lector: referencias estables, invalidación, guardas asíncronas, créditos no bloqueantes y tacto OK');
