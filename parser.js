// parser.js
import { db, storage, auth } from './firebase.js';
import { collection, addDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, uploadString, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { difficultyToStar } from './config.js';
import { setLoading, showToast } from './ui.js';

// อัปโหลด dataURL → Storage
async function uploadDataUrl(dataUrl, fileName) {
  const uid = auth.currentUser?.uid || 'anon';
  const path = `items/${uid}/${Date.now()}_${fileName}`;
  const r = ref(storage, path);
  await uploadString(r, dataUrl, 'data_url');
  const url = await getDownloadURL(r);
  return { storagePath: path, downloadURL: url };
}

// พาร์สข้อความรูปแบบข้อสอบจาก HTML (แปลงโดย mammoth)
function parseItemsFromPlainText(text) {
  // สมมติรูปแบบตัวอย่างตามโจทย์
  // 1. (ความยาก: -2.0) 35 + 47 = ?\nก. 72\n*ข. 82\nค. 85\nง. 92
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const items = [];
  let i = 0;
  while (i < lines.length) {
    const head = lines[i];
    const m = head.match(/^(\d+)\.\s*\(ความยาก:\s*([+-]?\d+(?:\.\d+)?)\)\s*(.*)$/);
    if (!m) { i++; continue; }
    const number = parseInt(m[1], 10);
    const diff = parseFloat(m[2]);
    const stem = m[3].trim();
    const options = [];
    let correctIndex = -1;
    let j = i + 1;
    const choiceLabel = ['ก.', 'ข.', 'ค.', 'ง.', 'จ.'];
    while (j < lines.length) {
      const line = lines[j];
      const mm = line.match(/^\*?([กขคงจ])\.\s*(.+)$/);
      if (!mm) break;
      const label = mm[1];
      const text = mm[2].trim();
      const starred = line.startsWith('*');
      options.push(`${label}. ${text}`);
      if (starred) correctIndex = options.length - 1;
      j++;
    }
    items.push({ number, difficultyNumeric: diff, difficultyStar: difficultyToStar(diff), stemHtml: `<p>${stem}</p>`, options, correctIndex, approved: false, images: [], source: { type: 'docx', fileName: 'imported.docx', uploadedAt: Date.now() } });
    i = j;
  }
  return items;
}

// ประมวลผล DOCX: แปลงเป็น HTML string → ดึง plain text + ภาพแบบ dataURL (ถ้ามี)
export async function importDocx(file) {
  setLoading(true);
  try {
    const arrBuf = await file.arrayBuffer();
    const { value } = await window.mammoth.convertToHtml({ arrayBuffer: arrBuf }, { includeDefaultStyleMap: true });

    // แปลง HTML → text สำหรับ parser อย่างง่าย (จะปรับเป็น DOM parser ก็ได้)
    const tmp = document.createElement('div');
    tmp.innerHTML = value;

    // ดึงภาพที่เป็น <img src="data:..."> และอัปโหลดเข้า Storage
    const imgs = tmp.querySelectorAll('img');
    for (const img of imgs) {
      if (img.src.startsWith('data:')) {
        const up = await uploadDataUrl(img.src, 'docximg.png');
        img.src = up.downloadURL;
      }
    }

    const plain = tmp.innerText; // ใช้สำหรับจับแพทเทิร์นแบบง่าย
    const items = parseItemsFromPlainText(plain);

    // บันทึกลง Firestore
    const col = collection(db, 'items');
    for (const it of items) { await addDoc(col, it); }

    showToast(`นำเข้า DOCX สำเร็จ ${items.length} ข้อ`);
    return items;
  } finally { setLoading(false); }
}

// ประมวลผล CSV (header: number,difficulty_numeric,stem_html,option1..4,correct_index)
export async function importCsv(file) {
  setLoading(true);
  try {
    const text = await file.text();
    const [header, ...rows] = text.split(/\r?\n/).filter(Boolean);
    const heads = header.split(',').map(s => s.trim());
    const col = collection(db, 'items');
    let count = 0;
    for (const r of rows) {
      const cells = r.split(',');
      const get = (name) => cells[heads.indexOf(name)]?.trim() ?? '';
      const number = parseInt(get('number') || `${Date.now()%100000}`, 10);
      const diff = parseFloat(get('difficulty_numeric') || '0');
      const stemHtml = get('stem_html') || '<p></p>';
      const options = [get('option1'), get('option2'), get('option3'), get('option4')].filter(Boolean);
      const correctIndex = parseInt(get('correct_index') || '0', 10);
      await addDoc(col, { number, difficultyNumeric: diff, difficultyStar: difficultyToStar(diff), stemHtml, options, correctIndex, images: [], approved: false, source: { type: 'csv', fileName: file.name, uploadedAt: Date.now() } });
      count++;
    }
    showToast(`นำเข้า CSV สำเร็จ ${count} ข้อ`);
  } finally { setLoading(false); }
}
