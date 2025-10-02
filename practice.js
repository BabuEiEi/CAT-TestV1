// practice.js
import { db, auth } from './firebase.js';
import { collection, query, where, getDocs, addDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { DEFAULT_MAX_ITEMS, DEFAULT_TARGET_SE } from './config.js';
import { renderStars, showToast } from './ui.js';

const practiceArea = document.getElementById('practiceArea');
const btnStartPractice = document.getElementById('btnStartPractice');
const modeSelect = document.getElementById('modeSelect');
const numItemsInput = document.getElementById('numItems');
const minStar = document.getElementById('minStar');
const maxStar = document.getElementById('maxStar');
const minStarVal = document.getElementById('minStarVal');
const maxStarVal = document.getElementById('maxStarVal');
const catOnly = document.getElementById('catOnly');
const targetSEInput = document.getElementById('targetSE');

function syncStarUI() {
  minStarVal.textContent = minStar.value; maxStarVal.textContent = maxStar.value;
}
[minStar, maxStar].forEach(el => el.addEventListener('input', syncStarUI));
modeSelect.addEventListener('change', () => { catOnly.classList.toggle('hidden', modeSelect.value !== 'cat'); });

function logisticP(theta, b) { const z = theta - b; return 1 / (1 + Math.exp(-z)); }
function itemInfo(theta, b) { const p = logisticP(theta, b); return p * (1 - p); }

function pickClosestDifficulty(pool, theta, usedSet) {
  const candidates = pool.filter(it => !usedSet.has(it.id));
  if (!candidates.length) return null;
  candidates.sort((a,b) => Math.abs(a.difficultyNumeric-theta) - Math.abs(b.difficultyNumeric-theta));
  return candidates[0];
}

function renderItem(it) {
  const opts = it.options.map((t, idx) => `<label class="block p-2 border rounded hover:bg-gray-50"><input type="radio" name="opt" value="${idx}" class="mr-2">${t}</label>`).join('');
  practiceArea.innerHTML = `
    <div class="border rounded p-4">
      <div class="text-sm text-gray-500 mb-1">ข้อ ${it.number ?? '-'} | ระดับ ${renderStars(it.difficultyStar)}</div>
      <div class="prose max-w-none">${it.stemHtml}</div>
      <div class="mt-3 space-y-2">${opts}</div>
      <div class="mt-4 flex gap-2">
        <button id="btnNext" class="px-3 py-2 bg-indigo-600 text-white rounded">ยืนยันคำตอบ</button>
      </div>
    </div>`;
}

function getSelectedIndex() {
  const el = practiceArea.querySelector('input[name="opt"]:checked');
  return el ? parseInt(el.value, 10) : -1;
}

async function saveAttempt(docData) {
  const user = auth.currentUser; if (!user) return;
  await addDoc(collection(db, 'attempts'), { userId: user.uid, startAt: docData.startAt, endAt: docData.endAt, mode: docData.mode, itemIds: docData.itemIds, responses: docData.responses, thetaHistory: docData.thetaHistory, seHistory: docData.seHistory, thetaFinal: docData.thetaFinal, seFinal: docData.seFinal });
}

async function fetchApprovedItems(starMin, starMax) {
  // Firestore ไม่รองรับ range สองข้างในฟิลด์เดียวพร้อมกัน → ดึงทั้งหมดแล้วกรองในฝั่ง client (เดโม)
  const snap = await getDocs(collection(db, 'items'));
  const items = [];
  snap.forEach(d => { const it = d.data(); items.push({ id: d.id, ...it }); });
  return items.filter(it => it.approved && it.difficultyStar >= starMin && it.difficultyStar <= starMax);
}

async function runFixed(items, N) {
  const pool = [...items]; pool.sort(() => Math.random() - 0.5);
  const chosen = pool.slice(0, Math.min(N, pool.length));
  const used = []; const startAt = Date.now();
  for (const it of chosen) {
    renderItem(it);
    await new Promise(resolve => practiceArea.querySelector('#btnNext').addEventListener('click', resolve, { once: true }));
    const idx = getSelectedIndex();
    const isCorrect = (idx === it.correctIndex);
    used.push({ itemId: it.id, isCorrect, timeSpentMs: 0 });
  }
  const correct = used.filter(u => u.isCorrect).length;
  const endAt = Date.now();
  await saveAttempt({ mode: 'fixed', startAt, endAt, itemIds: chosen.map(c => c.id), responses: used, thetaHistory: [], seHistory: [], thetaFinal: null, seFinal: null });
  practiceArea.innerHTML = `<div class="p-4">จบชุด Fixed — คะแนน: ${correct}/${chosen.length}</div>`;
}

async function runCAT(items, maxItems, targetSE) {
  let theta = 0; const used = []; const usedSet = new Set();
  const thetaHistory = []; const seHistory = [];
  const startAt = Date.now();

  for (let k=0; k<maxItems; k++) {
    const next = pickClosestDifficulty(items, theta, usedSet);
    if (!next) break;
    renderItem(next);
    await new Promise(resolve => practiceArea.querySelector('#btnNext').addEventListener('click', resolve, { once: true }));
    const idx = getSelectedIndex();
    const isCorrect = (idx === next.correctIndex);

    used.push({ itemId: next.id, difficultyNumeric: next.difficultyNumeric, isCorrect, timeSpentMs: 0 });
    usedSet.add(next.id);

    // อัปเดต theta แบบ Newton–Raphson เบื้องต้น 1PL
    let score = 0, info = 0;
    for (const u of used) { const p = logisticP(theta, u.difficultyNumeric); score += (u.isCorrect?1:0) - p; info += p*(1-p); }
    if (info > 1e-6) theta = theta + score / info;

    // คำนวณ SE ปัจจุบันจาก info รวม ณ theta ปัจจุบัน
    let infoNow = 0; for (const u of used) infoNow += itemInfo(theta, u.difficultyNumeric);
    const se = 1 / Math.sqrt(Math.max(infoNow, 1e-8));

    thetaHistory.push(theta); seHistory.push(se);
    if (se <= targetSE) break; // หยุดตามเกณฑ์
  }

  const endAt = Date.now();
  await saveAttempt({ mode: 'CAT', startAt, endAt, itemIds: used.map(u => u.itemId), responses: used.map(u => ({ itemId: u.itemId, isCorrect: u.isCorrect, timeSpentMs: u.timeSpentMs })), thetaHistory, seHistory, thetaFinal: theta, seFinal: seHistory[seHistory.length-1] ?? null });

  practiceArea.innerHTML = `<div class="p-4 space-y-2">
    <div>จบชุด CAT — ใช้ข้อจริง: ${used.length}</div>
    <div>θ สุดท้าย: ${theta.toFixed(3)} | SE: ${(seHistory[seHistory.length-1] ?? 0).toFixed(3)}</div>
  </div>`;
}

btnStartPractice?.addEventListener('click', async () => {
  const N = parseInt(numItemsInput.value || DEFAULT_MAX_ITEMS, 10);
  const starMin = Math.min(parseInt(minStar.value,10), parseInt(maxStar.value,10));
  const starMax = Math.max(parseInt(minStar.value,10), parseInt(maxStar.value,10));
  const mode = modeSelect.value;
  const targetSE = parseFloat(targetSEInput.value || DEFAULT_TARGET_SE);

  const pool = await fetchApprovedItems(starMin, starMax);
  if (!pool.length) return showToast('ยังไม่มีข้อสอบที่อนุมัติในช่วงดาวนี้', 'info');

  if (mode === 'fixed') await runFixed(pool, N); else await runCAT(pool, N, targetSE);
});

syncStarUI();
