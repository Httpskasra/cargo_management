# Cargo Manager

نرم‌افزار لوکال مدیریت راکب، رانشیت و بارکد برای Windows.

## امکانات
- داشبورد آمار روزانه
- مدیریت راکب‌ها: افزودن، ویرایش، فعال/غیرفعال
- رانشیت NDX و SAPA Post
- ثبت مرسوله با Barcode Scanner به‌صورت Keyboard Wedge
- Auto Focus پس از هر اسکن
- جلوگیری از ثبت بارکد تکراری
- مرسوله عادی و برگشتی + تغییر وضعیت
- تاریخ و ساعت خودکار با نمایش شمسی
- جستجوی ترکیبی بارکد، راکب، نوع، وضعیت و بازه تاریخ
- Backup / Restore دیتابیس SQLite
- Electron برای خروجی Windows

## اجرای اولیه
```bash
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```
سپس: http://localhost:3000

## اجرای Desktop در حالت توسعه
```bash
npm run electron:dev
```

## ساخت فایل Windows
در Windows اجرا کنید:
```bash
npm install
npx prisma generate
npx prisma db push
npm run electron:build
```
خروجی داخل `dist-electron` ساخته می‌شود و شامل Installer و Portable خواهد بود.

## بارکدخوان
بارکدخوان USB را روی حالت Keyboard/HID قرار دهید و suffix آن را Enter تنظیم کنید. در صفحه داشبورد یا رانشیت، رانشیت فعال را انتخاب کنید و اسکن کنید.

## دیتابیس
در اجرای توسعه فایل دیتابیس در `prisma/cargo.db` قرار می‌گیرد. در نسخه Electron فایل واقعی دیتابیس به پوشه User Data ویندوز منتقل می‌شود تا با آپدیت برنامه حذف نشود.

## نکته Backup
نسخه‌های پشتیبان در پوشه `backups` پروژه ساخته می‌شوند. برای نسخه نهایی سازمانی بهتر است مسیر Backup نیز به Documents یا مسیر انتخابی کاربر منتقل شود.
