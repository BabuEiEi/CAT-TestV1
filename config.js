// config.js
export const ADMIN_EMAIL = 'babu555monkeyman@gmail.com';
export const DEFAULT_TARGET_SE = 0.35; // เกณฑ์หยุด SE(θ)
export const DEFAULT_MAX_ITEMS = 10;  // จำนวนข้อสูงสุดต่อรอบ

// การแม็พค่าความยาก → ดาว 1–6
export function difficultyToStar(d) {
  if (d <= -2.0) return 1;
  if (d <= -1.0) return 2;
  if (d <=  0.0) return 3;
  if (d <=  1.0) return 4;
  if (d <=  2.0) return 5;
  return 6;
}
