import { t } from '../i18n';
import { useRef } from 'react';
import { useEditor, useEditorState, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import Superscript from '@tiptap/extension-superscript';
import Placeholder from '@tiptap/extension-placeholder';
import { UnclearHighlight, findUnclear } from './editor/UnclearHighlight';

function Tool({ on, active, disabled, label, children, wide }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={on}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={!!active}
      className={`h-10 ${wide ? 'px-3' : 'min-w-10 px-2'} shrink-0 grid place-items-center rounded-[3px] text-sm transition disabled:opacity-25 ${
        active ? 'bg-ink text-paper' : 'hover:bg-ink/10'
      }`}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="w-px h-6 bg-ink/15 mx-1 shrink-0" />;

function Toolbar({ editor, onCite }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h1: e.isActive('heading', { level: 1 }),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      left: e.isActive({ textAlign: 'left' }),
      center: e.isActive({ textAlign: 'center' }),
      right: e.isActive({ textAlign: 'right' }),
      table: e.isActive('table'),
      unclear: findUnclear(e.state.doc),
      undo: e.can().undo(),
      redo: e.can().redo(),
    }),
  });
  const c = () => editor.chain().focus();

  return (
    <div className="sticky top-[calc(env(safe-area-inset-top)+5.25rem)] z-20 bg-paper/95 backdrop-blur border border-ink/15 rounded-[3px] mb-3">
      <div className="flex items-center gap-0.5 p-1 overflow-x-auto font-menu">
        <Tool label="Undo" on={() => c().undo().run()} disabled={!s.undo}>↶</Tool>
        <Tool label="Redo" on={() => c().redo().run()} disabled={!s.redo}>↷</Tool>
        <Sep />
        <Tool label={t("หัวข้อใหญ่")} active={s.h1} on={() => c().toggleHeading({ level: 1 }).run()}><b>H1</b></Tool>
        <Tool label={t("หัวข้อ")} active={s.h2} on={() => c().toggleHeading({ level: 2 }).run()}><b>H2</b></Tool>
        <Tool label={t("หัวข้อย่อย")} active={s.h3} on={() => c().toggleHeading({ level: 3 }).run()}><b>H3</b></Tool>
        <Sep />
        <Tool label={t("ตัวหนา")} active={s.bold} on={() => c().toggleBold().run()}><b>B</b></Tool>
        <Tool label={t("ตัวเอียง")} active={s.italic} on={() => c().toggleItalic().run()}><i className="font-serif">I</i></Tool>
        <Tool label={t("ขีดเส้นใต้")} active={s.underline} on={() => c().toggleUnderline().run()}><u>U</u></Tool>
        <Tool label={t("ขีดฆ่า")} active={s.strike} on={() => c().toggleStrike().run()}><s>S</s></Tool>
        <Sep />
        <Tool label={t("ชิดซ้าย")} active={s.left} on={() => c().setTextAlign('left').run()}>⇤</Tool>
        <Tool label={t("กึ่งกลาง")} active={s.center} on={() => c().setTextAlign('center').run()}>↔</Tool>
        <Tool label={t("ชิดขวา")} active={s.right} on={() => c().setTextAlign('right').run()}>⇥</Tool>
        <Sep />
        <Tool label={t("รายการจุด")} active={s.bullet} on={() => c().toggleBulletList().run()}>•≡</Tool>
        <Tool label={t("รายการตัวเลข")} active={s.ordered} on={() => c().toggleOrderedList().run()}>1≡</Tool>
        <Tool label={t("ข้อความอ้างคำพูด")} active={s.quote} on={() => c().toggleBlockquote().run()}>❝</Tool>
        <Tool label={t("เส้นคั่น")} on={() => c().setHorizontalRule().run()}>—</Tool>
        <Sep />
        <Tool wide label={t("แทรกตาราง")} active={s.table} on={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>{t("⊞ ตาราง")}</Tool>
        {s.table && (
          <>
            <Tool wide label={t("เพิ่มแถว")} on={() => c().addRowAfter().run()}>{t("+แถว")}</Tool>
            <Tool wide label={t("เพิ่มคอลัมน์")} on={() => c().addColumnAfter().run()}>{t("+คอลัมน์")}</Tool>
            <Tool wide label={t("ลบแถว")} on={() => c().deleteRow().run()}>{t("−แถว")}</Tool>
            <Tool wide label={t("ลบคอลัมน์")} on={() => c().deleteColumn().run()}>{t("−คอลัมน์")}</Tool>
            <Tool wide label={t("ลบตาราง")} on={() => c().deleteTable().run()}>{t("✕ตาราง")}</Tool>
          </>
        )}
        <Sep />
        <Tool wide label={t("แทรกอ้างอิง")} on={onCite}>{t("[1] อ้างอิง")}</Tool>
        {s.unclear.length > 0 && (
          <>
            <Sep />
            <Tool
              wide
              label={t("ไปยังจุดที่ไม่ชัดเจนถัดไป")}
              on={() => {
                const sel = editor.state.selection.to;
                const next = s.unclear.find((h) => h.from >= sel) || s.unclear[0];
                editor.chain().focus().setTextSelection(next).scrollIntoView().run();
              }}
            >
              <span className="bg-yellow-300 text-ink px-1.5 rounded-[2px]">{t('ไม่ชัดเจน {n}', { n: s.unclear.length })}</span> ›
            </Tool>
          </>
        )}
      </div>
    </div>
  );
}

const inputCls =
  'w-full bg-transparent outline-none text-xs text-ink/60 placeholder:text-ink/30 py-2 border-b border-dashed border-ink/15 focus:border-ink/40';

// value: { content, header, footer, pageNumbers, references: string[] }
export default function DocEditor({ value, onChange }) {
  const latest = useRef(value);
  latest.current = value;
  const emit = (patch) => {
    latest.current = { ...latest.current, ...patch };
    onChange(latest.current);
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      TableKit.configure({ table: { resizable: false } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Superscript,
      Placeholder.configure({ placeholder: t('เริ่มพิมพ์เอกสารที่นี่...') }),
      UnclearHighlight,
    ],
    content: value.content,
    immediatelyRender: true,
    editorProps: { attributes: { class: 'doc-prose outline-none min-h-[50vh]' } },
    onUpdate: ({ editor: e }) => emit({ content: e.getJSON() }),
  });

  const refs = value.references || [];

  const cite = () => {
    const n = refs.length + 1;
    emit({ references: [...refs, ''] });
    editor.chain().focus().insertContent({ type: 'text', text: `[${n}]`, marks: [{ type: 'superscript' }] }).unsetSuperscript().run();
    setTimeout(() => document.getElementById(`ref-${n - 1}`)?.focus(), 50);
  };

  if (!editor) return null;

  return (
    <div>
      <Toolbar editor={editor} onCite={cite} />

      {/* Paper */}
      <div className="bg-white shadow-[0_1px_0_rgba(0,0,0,.08),0_8px_30px_-12px_rgba(0,0,0,.25)] rounded-[2px] px-5 sm:px-10 md:px-14 py-6 md:py-10">
        <input
          value={value.header || ''}
          onChange={(e) => emit({ header: e.target.value })}
          placeholder={t("หัวกระดาษ (Header) — เช่น ชื่อหน่วยงาน")}
          className={`${inputCls} mb-6`}
        />

        <EditorContent editor={editor} />

        {refs.length > 0 && (
          <div className="mt-10 pt-4 border-t border-ink/15">
            <p className="font-bold text-sm mb-2">{t("เอกสารอ้างอิง")}</p>
            <ol className="space-y-1">
              {refs.map((r, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-ink/50 w-7 shrink-0">[{i + 1}]</span>
                  <input
                    id={`ref-${i}`}
                    value={r}
                    onChange={(e) => emit({ references: refs.map((x, j) => (j === i ? e.target.value : x)) })}
                    placeholder={t("ผู้แต่ง. (ปี). ชื่อเรื่อง. แหล่งที่มา")}
                    className="flex-1 min-w-0 bg-transparent outline-none border-b border-dashed border-ink/15 focus:border-ink/40 py-1"
                  />
                  <button
                    type="button"
                    onClick={() => emit({ references: refs.filter((_, j) => j !== i) })}
                    aria-label={t("ลบอ้างอิง")}
                    className="w-9 h-9 grid place-items-center text-ink/40 hover:text-red-700"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="mt-8 flex items-center gap-3">
          <input
            value={value.footer || ''}
            onChange={(e) => emit({ footer: e.target.value })}
            placeholder={t("ท้ายกระดาษ (Footer)")}
            className={inputCls}
          />
          <label className="flex items-center gap-2 text-xs text-ink/60 whitespace-nowrap cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              checked={value.pageNumbers !== false}
              onChange={(e) => emit({ pageNumbers: e.target.checked })}
              className="w-4 h-4 accent-[#111]"
            />
            {t("เลขหน้า")}
          </label>
        </div>
      </div>
    </div>
  );
}
