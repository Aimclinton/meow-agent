// Fonts people commonly use for reports in Thailand. One font is used for
// both Thai and English text. `google` = loadable from Google Fonts for preview.
export const REPORT_FONTS = [
  { name: 'TH Sarabun New', size: 16, css: "'TH Sarabun New','Sarabun'", note: 'ฟอนต์ราชการ มาตรฐานรายงาน', noteEn: 'Thai government standard' },
  { name: 'Sarabun', size: 12, css: "'Sarabun'", google: 'Sarabun:ital,wght@0,400;0,700;1,400', note: 'อ่านง่าย คล้ายสารบรรณ', noteEn: 'Easy to read, Sarabun style' },
  { name: 'Noto Sans Thai', size: 12, css: "'Noto Sans Thai'", google: 'Noto+Sans+Thai:wght@400;700', note: 'สะอาด สระไม่ลอย', noteEn: 'Clean, well-stacked vowels' },
  { name: 'Noto Serif Thai', size: 12, css: "'Noto Serif Thai'", google: 'Noto+Serif+Thai:wght@400;700', note: 'มีหัว ทางการ เหมาะงานวิชาการ', noteEn: 'Looped serif, academic' },
  { name: 'IBM Plex Sans Thai', size: 12, css: "'IBM Plex Sans Thai'", google: 'IBM+Plex+Sans+Thai:wght@400;700', note: 'ทันสมัย อ่านง่ายบนจอ', noteEn: 'Modern, great on screen' },
  { name: 'Prompt', size: 12, css: "'Prompt'", google: 'Prompt:ital,wght@0,400;0,700;1,400', note: 'โมเดิร์น เหมาะทำสไลด์/โปสเตอร์', noteEn: 'Modern, good for slides' },
  { name: 'Kanit', size: 12, css: "'Kanit'", google: 'Kanit:ital,wght@0,400;0,700;1,400', note: 'หัวข้อชัด เป็นที่นิยม', noteEn: 'Bold headings, popular' },
  { name: 'Bai Jamjuree', size: 12, css: "'Bai Jamjuree'", google: 'Bai+Jamjuree:ital,wght@0,400;0,700;1,400', note: 'เรียบ เป็นกันเอง', noteEn: 'Simple and friendly' },
  { name: 'Chakra Petch', size: 12, css: "'Chakra Petch'", google: 'Chakra+Petch:ital,wght@0,400;0,700;1,400', note: 'เหลี่ยม ดูเทค', noteEn: 'Angular, techy' },
  { name: 'Niramit', size: 12, css: "'Niramit'", google: 'Niramit:ital,wght@0,400;0,700;1,400', note: 'นุ่มนวล อ่านสบายตา', noteEn: 'Soft and relaxed' },
  { name: 'Google Sans', size: 12, css: "'Google Sans','Noto Sans Thai'", google: 'Google+Sans:ital,wght@0,400;0,700;1,400', note: 'อังกฤษสวย (ไทยใช้ฟอนต์สำรอง)', noteEn: 'Great for English (Thai falls back)' },
];

export const DEFAULT_FONT = 'Sarabun';
export const fontInfo = (name) => REPORT_FONTS.find((f) => f.name === name) || REPORT_FONTS[1];
// Older documents stored { th, en }; use the Thai one.
export const docFont = (doc) => doc.font || doc.fonts?.th || DEFAULT_FONT;
export const docFontSize = (doc) => doc.fontSize || fontInfo(docFont(doc)).size;

// Load every previewable font once (only on the Export page).
export function loadPreviewFonts() {
  if (typeof document === 'undefined' || document.getElementById('meow-report-fonts')) return;
  const families = REPORT_FONTS.filter((f) => f.google).map((f) => `family=${f.google}`).join('&');
  const link = document.createElement('link');
  link.id = 'meow-report-fonts';
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
  document.head.appendChild(link);
}
