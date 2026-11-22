// Fonts offered for exported files. All support Thai vowels/tone marks
// stacking correctly except Google Sans (Latin only → Thai falls back).
export const TH_FONTS = [
  { name: 'Sarabun', note: 'อ่านง่าย มาตรฐานเอกสารไทย', css: "'Sarabun'" },
  { name: 'Noto Sans Thai', note: 'สะอาด ทันสมัย สระไม่ลอย', css: "'Noto Sans Thai'" },
  { name: 'TH Sarabun New', note: 'ฟอนต์ราชการ (ต้องมีในเครื่อง)', css: "'TH Sarabun New','Sarabun'" },
  { name: 'Google Sans', note: 'ไทยจะใช้ฟอนต์สำรองของเครื่อง', css: "'Google Sans','Noto Sans Thai'" },
];
export const EN_FONTS = [
  { name: 'Google Sans', css: "'Google Sans'" },
  { name: 'Sarabun', css: "'Sarabun'" },
  { name: 'Noto Sans', css: "'Noto Sans'" },
  { name: 'Arial', css: 'Arial' },
];

// TH Sarabun New renders small, so it is set at 16pt (Thai official standard).
export const fontSizeFor = (th) => (th === 'TH Sarabun New' ? 16 : 12);
export const cssFont = (list, name) => list.find((f) => f.name === name)?.css || name;
