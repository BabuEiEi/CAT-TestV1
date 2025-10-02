// stats.js
import { db, auth } from './firebase.js';
import { collection, query, where, orderBy, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let thetaChart;

async function renderMyProgress() {
  const user = auth.currentUser; if (!user) return;
  const q = query(collection(db, 'attempts'), where('userId','==', user.uid), orderBy('endAt','asc'));
  const snap = await getDocs(q);

  const labels = [], thetas = [], ses = [], rows = [];
  snap.forEach(d => { const a = d.data(); labels.push(new Date(a.endAt).toLocaleDateString()); thetas.push(Number(a.thetaFinal ?? 0)); ses.push(Number(a.seFinal ?? 0)); rows.push({ id: d.id, ...a }); });

  const ctx = document.getElementById('thetaChart');
  if (thetaChart) thetaChart.destroy();
  thetaChart = new Chart(ctx, { type: 'line', data: { labels, datasets: [ { label:'θ', data: thetas }, { label:'SE(θ)', data: ses } ] }, options: { responsive:true, plugins:{ legend:{ position:'bottom' } }, scales:{ y:{ title:{ display:true, text:'ค่า θ / SE' } } } } });

  const list = document.getElementById('attemptList');
  list.innerHTML = rows.map((a,i)=>`<div class="border-b py-2">
    <div class="font-medium">ครั้งที่ ${i+1} — ${new Date(a.endAt).toLocaleString()}</div>
    <div class="text-sm text-gray-600">โหมด: ${a.mode} | ข้อ: ${a.itemIds?.length ?? 0} | θ: ${(a.thetaFinal??'–').toFixed?.(3) ?? a.thetaFinal} | SE: ${(a.seFinal??'–').toFixed?.(3) ?? a.seFinal}</div>
  </div>`).join('');
}

async function exportMyReportPDF() {
  const { jsPDF } = window.jspdf;
  const user = auth.currentUser; const displayName = user?.displayName || user?.email || 'ผู้ใช้งาน';
  const chartCanvas = document.getElementById('thetaChart');
  const chartImg = chartCanvas.toDataURL('image/png', 1.0);
  const latestRow = document.querySelector('#attemptList .border-b:last-child');
  const latestText = latestRow ? latestRow.innerText : 'ยังไม่มีข้อมูล';

  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();

  pdf.setFont('Helvetica', 'bold'); pdf.setFontSize(16);
  pdf.text('รายงานพัฒนาการทำแบบทดสอบ (CAT/Practice)', 40, 50);
  pdf.setFont('Helvetica', 'normal'); pdf.setFontSize(11);
  pdf.text(`ผู้ใช้: ${displayName}`, 40, 75);
  pdf.text(`วันที่ออกรายงาน: ${new Date().toLocaleString()}`, 40, 92);

  const imgW = pageW - 80; const imgH = imgW * 0.45;
  pdf.addImage(chartImg, 'PNG', 40, 120, imgW, imgH);
  pdf.setFontSize(12); pdf.setFont('Helvetica', 'bold'); pdf.text('สรุปการทดสอบล่าสุด', 40, 130 + imgH);
  pdf.setFont('Helvetica', 'normal');
  const split = pdf.splitTextToSize(latestText, pageW - 80);
  pdf.text(split, 40, 150 + imgH);

  pdf.save('CAT-progress-report.pdf');
}

// Bind
window.addEventListener('hashchange', () => { if (location.hash === '#stats') renderMyProgress(); });
window.addEventListener('load', () => { if (location.hash === '#stats') renderMyProgress(); });

document.getElementById('btnExportPDF')?.addEventListener('click', exportMyReportPDF);
