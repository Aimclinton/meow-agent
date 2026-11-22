// Gemini call that returns the structured layout of one document page.

const RUN = {
  type: 'OBJECT',
  properties: {
    text: { type: 'STRING' },
    bold: { type: 'BOOLEAN' },
    italic: { type: 'BOOLEAN' },
    underline: { type: 'BOOLEAN' },
  },
  required: ['text'],
};
const RUNS = { type: 'ARRAY', items: RUN };

export const PAGE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    header: { type: 'STRING', description: 'Running header text at the top of the page, empty if none' },
    footer: { type: 'STRING', description: 'Running footer text (e.g. page number, document name), empty if none' },
    blocks: {
      type: 'ARRAY',
      description: 'Body content in reading order',
      items: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING', enum: ['heading', 'paragraph', 'list', 'table'] },
          level: { type: 'INTEGER', description: 'Heading level 1-3 (1 = main title)' },
          align: { type: 'STRING', enum: ['left', 'center', 'right', 'justify'] },
          runs: { ...RUNS, description: 'Text runs for heading/paragraph with inline formatting' },
          ordered: { type: 'BOOLEAN', description: 'For lists: numbered (true) or bulleted (false)' },
          items: {
            type: 'ARRAY',
            description: 'For lists: one entry per list item',
            items: { type: 'OBJECT', properties: { runs: RUNS }, required: ['runs'] },
          },
          rows: {
            type: 'ARRAY',
            description: 'For tables: rows top to bottom. Omit cells covered by a merged cell.',
            items: {
              type: 'OBJECT',
              properties: {
                cells: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      runs: RUNS,
                      colspan: { type: 'INTEGER' },
                      rowspan: { type: 'INTEGER' },
                      header: { type: 'BOOLEAN' },
                    },
                    required: ['runs'],
                  },
                },
              },
              required: ['cells'],
            },
          },
        },
        required: ['type'],
      },
    },
    references: {
      type: 'ARRAY',
      description: 'Reference list / bibliography / footnote entries, one per item, without the leading number',
      items: { type: 'STRING' },
    },
  },
  required: ['blocks'],
};

export const PROMPT = `You are a precise document transcription engine. Transcribe the page in the image into the JSON schema.

Rules:
- Transcribe ONLY text that is actually visible. Never guess, complete, summarise, correct or translate.
- If a word or cell is unreadable, write exactly [ไม่ชัดเจน] in its place.
- Keep the original language (Thai and/or English) and spelling exactly as written, including numbers and units.
- Keep reading order. Put running headers in "header" and running footers / page numbers in "footer" (not in blocks).
- Headings: use level 1 for the document title, 2 for section headings, 3 for sub-headings.
- Mark bold, italic and underline per run only when clearly visible. Set "align" when text is centred or right-aligned.
- Bullet or numbered lists become "list" blocks (do not include the bullet symbol or number in the text).
- Tables become "table" blocks with every row and cell; use colspan/rowspan for merged cells and omit the covered cells; mark header cells with header=true.
- Footnotes, endnotes and reference/bibliography entries go into "references".
- Handwriting is common (e.g. dental/medical notes): transcribe carefully, abbreviations as written.`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class GeminiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function callModel(model, apiKey, image, mimeType) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ inline_data: { mime_type: mimeType, data: image } }, { text: PROMPT }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: PAGE_SCHEMA,
      },
    }),
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    throw new GeminiError(r.status, `${model}: ${r.status} ${detail.slice(0, 300)}`);
  }
  const data = await r.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  if (!text) throw new GeminiError(502, `${model}: empty response (${data?.candidates?.[0]?.finishReason || 'unknown'})`);
  return JSON.parse(text);
}

// Try models in order; on 429/503 wait ~3.5s and retry once before moving on.
// Stops before the function's time budget runs out.
export async function transcribePage({ image, mimeType = 'image/jpeg', apiKey, models, deadline, onAttempt }) {
  let lastErr;
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (Date.now() > deadline - 8000) throw lastErr || new GeminiError(504, 'time budget exhausted');
      try {
        onAttempt?.(model, attempt);
        const page = await callModel(model, apiKey, image, mimeType);
        return { page, model };
      } catch (err) {
        lastErr = err;
        const retryable = err.status === 429 || err.status === 503 || err.status === 500 || err instanceof SyntaxError;
        if (!retryable) {
          if (err.status === 404 || err.status === 400) break; // model unavailable → next model
          throw err;
        }
        if (attempt === 0) await sleep(3500);
      }
    }
  }
  throw lastErr || new GeminiError(503, 'all models failed');
}
