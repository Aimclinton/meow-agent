import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { UNCLEAR } from '../../utils/structure';

const key = new PluginKey('unclearHighlight');

function build(doc) {
  const decos = [];
  doc.descendants((node, pos) => {
    if (!node.isText) return;
    let i = node.text.indexOf(UNCLEAR);
    while (i !== -1) {
      decos.push(Decoration.inline(pos + i, pos + i + UNCLEAR.length, { class: 'unclear-mark' }));
      i = node.text.indexOf(UNCLEAR, i + UNCLEAR.length);
    }
  });
  return DecorationSet.create(doc, decos);
}

// Paints every "[ไม่ชัดเจน]" yellow so reviewers can spot uncertain text.
export const UnclearHighlight = Extension.create({
  name: 'unclearHighlight',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key,
        state: {
          init: (_, { doc }) => build(doc),
          apply: (tr, old) => (tr.docChanged ? build(tr.doc) : old),
        },
        props: { decorations: (state) => key.getState(state) },
      }),
    ];
  },
});

// Find positions of unclear markers (for "jump to next").
export function findUnclear(doc) {
  const hits = [];
  doc.descendants((node, pos) => {
    if (!node.isText) return;
    let i = node.text.indexOf(UNCLEAR);
    while (i !== -1) {
      hits.push({ from: pos + i, to: pos + i + UNCLEAR.length });
      i = node.text.indexOf(UNCLEAR, i + UNCLEAR.length);
    }
  });
  return hits;
}
