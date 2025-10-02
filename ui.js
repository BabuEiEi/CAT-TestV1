// ui.js
export function showToast(title, icon='success') {
  return Swal.fire({ title, icon, timer: 1800, showConfirmButton: false });
}

export function showConfirm(title, text='') {
  return Swal.fire({ title, text, icon: 'warning', showCancelButton: true, confirmButtonText: 'ยืนยัน', cancelButtonText: 'ยกเลิก' });
}

export function setLoading(on=true) {
  if (on) {
    Swal.fire({ title: 'กำลังดำเนินการ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
  } else {
    Swal.close();
  }
}

export function renderStars(n) {
  const full = '★'.repeat(n);
  const rest = '☆'.repeat(6 - n);
  return `<span class="text-yellow-500">${full}</span><span class="text-gray-300">${rest}</span>`;
}
