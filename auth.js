// auth.js
import { auth, db } from './firebase.js';
import { ADMIN_EMAIL } from './config.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { showToast } from './ui.js';

const userBox = document.getElementById('userBox');
const btnLogin = document.getElementById('btnLogin');
const btnLogout = document.getElementById('btnLogout');
const navAdmin = document.getElementById('navAdmin');
const adminSection = document.getElementById('admin');

function isAdminEmail(email) { return email === ADMIN_EMAIL; }

function renderAuthUI(user) {
  if (user) {
    userBox.textContent = user.email;
    btnLogin.classList.add('hidden');
    btnLogout.classList.remove('hidden');
    if (isAdminEmail(user.email)) {
      navAdmin.classList.remove('hidden');
      adminSection.classList.remove('hidden');
    } else {
      navAdmin.classList.add('hidden');
      adminSection.classList.add('hidden');
    }
  } else {
    userBox.textContent = '';
    btnLogin.classList.remove('hidden');
    btnLogout.classList.add('hidden');
    navAdmin.classList.add('hidden');
    adminSection.classList.add('hidden');
  }
}

btnLogin?.addEventListener('click', async () => {
  // dialog สมัคร/ล็อกอินอย่างง่าย
  const { value: mode } = await Swal.fire({
    title: 'เข้าสู่ระบบ/สมัครสมาชิก',
    input: 'radio',
    inputOptions: { login: 'เข้าสู่ระบบ', register: 'สมัครสมาชิก' },
    inputValidator: v => !v && 'เลือกโหมดก่อน',
    confirmButtonText: 'ถัดไป'
  });
  if (!mode) return;

  if (mode === 'login') {
    const { value: form } = await Swal.fire({
      title: 'เข้าสู่ระบบ',
      html: `
        <input id="em" class="swal2-input" placeholder="Email">
        <input id="pw" type="password" class="swal2-input" placeholder="Password">`,
      preConfirm: () => ({ email: document.getElementById('em').value, password: document.getElementById('pw').value })
    });
    if (!form) return;
    await signInWithEmailAndPassword(auth, form.email, form.password);
    showToast('ยินดีต้อนรับ');
  } else {
    const { value: form } = await Swal.fire({
      title: 'สมัครสมาชิก',
      html: `
        <input id="fn" class="swal2-input" placeholder="ชื่อ-นามสกุล">
        <input id="gr" class="swal2-input" placeholder="ระดับชั้น (ป.4–ม.3)">
        <input id="sc" class="swal2-input" placeholder="ชื่อโรงเรียน">
        <input id="em" class="swal2-input" placeholder="Email">
        <input id="pw" type="password" class="swal2-input" placeholder="Password (6+)" />
        <input id="cf" type="password" class="swal2-input" placeholder="ยืนยัน Password" />`,
      preConfirm: () => ({
        fullName: document.getElementById('fn').value,
        gradeLevel: document.getElementById('gr').value,
        schoolName: document.getElementById('sc').value,
        email: document.getElementById('em').value,
        password: document.getElementById('pw').value,
        confirm: document.getElementById('cf').value
      })
    });
    if (!form) return;
    if (form.password !== form.confirm) return Swal.fire('รหัสผ่านไม่ตรงกัน', '', 'error');
    const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
    await updateProfile(cred.user, { displayName: form.fullName });
    await setDoc(doc(db, 'users', cred.user.uid), {
      fullName: form.fullName,
      gradeLevel: form.gradeLevel,
      schoolName: form.schoolName,
      email: form.email,
      role: isAdminEmail(form.email) ? 'admin' : 'user',
      createdAt: Date.now()
    });
    showToast('สมัครสำเร็จ');
  }
});

btnLogout?.addEventListener('click', async () => {
  await signOut(auth);
  showToast('ออกจากระบบแล้ว', 'info');
});

onAuthStateChanged(auth, async (user) => { renderAuthUI(user); });
