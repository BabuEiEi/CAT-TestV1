#md
# CAT + Item Pool (Front-end + Firebase)

## Run แบบโลคอล
- เปิด `index.html` ด้วยเบราว์เซอร์ได้เลย (แนะนำใช้ extension “Live Server” หรือ http-server ให้ URL เป็น http://localhost เพื่อให้ Storage บางอย่างทำงานครบ)

## Deploy: GitHub Pages
1) สร้างรีโปใหม่ → อัปโหลดไฟล์ทั้งหมด
2) Settings → Pages → Deploy from branch → เลือก main / root
3) รอให้ URL พร้อม → เปิดใช้งาน

## Deploy: Hugging Face Spaces (Static)
1) New Space → Static → อัปโหลดไฟล์ทั้งหมด
2) Spaces จะ build อัตโนมัติ → ได้ URL สาธารณะ

## Firebase Setup
- วางค่าจาก Web App config ใน `firebase.js`
- สร้างผู้ใช้ admin (email whitelist ใน `config.js`) หรือแก้ **ADMIN_EMAIL** เป็นอีเมลของคุณ
- ตั้ง Firestore/Storage Rules ตามตัวอย่าง
