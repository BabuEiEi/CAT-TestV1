// admin.js
import { auth, db } from './firebase.js';
import { collection, getDocs, updateDoc, deleteDoc, doc, addDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { importDocx, importCsv } from './parser.js';
import { showConfirm, showToast, setLoading, renderStars } from './ui.js';
import { ADMIN_EMAIL } from './config.js';

const docxInput = document.getElementById('docxInput');
const csvInput = document.getElementById('csvInput');
const btnApproveAll = document.getElementById('btnApproveAll');
const btnClearAll = document.getElementById('btnClearAll');
const adminList = document.getElementById('adminList');

function assertAdmin() {
  const email = auth.currentUser?.email;
  if (email !== ADMIN_EMAIL) throw new Error('ต้องเป็นผู้ดูแลระบบเท่านั้น');
}

async function refreshAdminList() {
  assertAdmin();
  const snap = await getDocs(collection(db, 'items'));
  const rows = [];
  snap.forEach(d => {
    const it = d.data();
    rows.push(`<tr class="border-b">
      <td class="p-2">${it.number ?? '-'}</td>
      <td class="p-2">${renderStars(it.difficultyStar || 3)}</td>
      <td class="p-2">${it.approved ? '<span class="text-green-600">✔</span>' : '<span class="text-gray-400">—</span>'}</td>
      <td class="p-2">${it.stemHtml?.slice(0, 80) ?? ''}...</td>
      <td class="p-2">
        <button data-id="${d.id}" class="btn-approve px-2 py-1 bg-indigo-600 text-white rounded text-xs">อนุมัติ</button>
        <button data-id="${d.id}" class="btn-del px-2 py-1 bg-red-600 text-white rounded text-xs">ลบ</button>
      </td></tr>`);
  });
  adminList.innerHTML = `<table class="w-full text-sm"><thead><tr class="bg-gray-100">
    <th class="p-2">ข้อ</th><th class="p-2">ดาว</th><th class="p-2">สถานะ</th><th class="p-2">โจทย์</th><th class="p-2">จัดการ</th>
  </tr></thead><tbody>${rows.join('')}</tbody></table>`;

  adminList.querySelectorAll('.btn-approve').forEach(btn => btn.addEventListener('click', async () => {
    assertAdmin();
    await updateDoc(doc(db, 'items', btn.dataset.id), { approved: true });
    showToast('อนุมัติแล้ว');
    refreshAdminList();
  }));

  adminList.querySelectorAll('.btn-del').forEach(btn => btn.addEventListener('click', async () => {
    assertAdmin();
    const ok = await showConfirm('ลบข้อนี้?', 'ยืนยันการลบ');
    if (ok.isConfirmed) {
      await deleteDoc(doc(db, 'items', btn.dataset.id));
      showToast('ลบแล้ว');
      refreshAdminList();
    }
  }));
}

// events

docxInput?.addEventListener('change', async (e) => {
  try { assertAdmin(); const f = e.target.files[0]; if (!f) return; await importDocx(f); refreshAdminList(); } catch (err) { Swal.fire('ผิดพลาด', err.message, 'error'); }
});

csvInput?.addEventListener('change', async (e) => {
  try { assertAdmin(); const f = e.target.files[0]; if (!f) return; await importCsv(f); refreshAdminList(); } catch (err) { Swal.fire('ผิดพลาด', err.message, 'error'); }
});

btnApproveAll?.addEventListener('click', async () => {
  try {
    assertAdmin();
    const ok = await showConfirm('อนุมัติทั้งหมด?', 'จะตั้ง approved=true กับทุกข้อ');
    if (!ok.isConfirmed) return;
    setLoading(true);
    const snap = await getDocs(collection(db, 'items'));
    const tasks = [];
    snap.forEach(d => tasks.push(updateDoc(doc(db, 'items', d.id), { approved: true })));
    await Promise.all(tasks);
    showToast('อนุมัติทั้งหมดแล้ว');
    refreshAdminList();
  } finally { setLoading(false); }
});

btnClearAll?.addEventListener('click', async () => {
  try {
    assertAdmin();
    const ok = await showConfirm('ล้างคลังข้อสอบทั้งหมด?', 'การกระทำนี้ย้อนกลับไม่ได้');
    if (!ok.isConfirmed) return;
    setLoading(true);
    const snap = await getDocs(collection(db, 'items'));
    const tasks = [];
    snap.forEach(d => tasks.push(deleteDoc(doc(db, 'items', d.id))));
    await Promise.all(tasks);
    showToast('ล้างข้อมูลแล้ว');
    refreshAdminList();
  } finally { setLoading(false); }
});

// auto refresh เมื่อเข้าหน้า admin ถ้าเป็นแอดมินแล้ว
window.addEventListener('hashchange', () => { if (location.hash === '#admin' && auth.currentUser?.email === ADMIN_EMAIL) refreshAdminList(); });