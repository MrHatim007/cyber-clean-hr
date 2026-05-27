# 🌐 دليل نشر واستضافة نظام إدارة الموظفين والوثائق
# Employee & Document Management System Deployment Guide

لقد قمنا بتهيئة كود المشروع بالكامل وإضافة إعدادات المسارات النسبية لتتوافق مع أي منصة استضافة مجانية. يمكنك النشر فوراً عبر خيارين سهلين ومجانيين:

We have fully prepared the project config and added relative asset routing so it works on any free hosting platform. You can deploy it instantly using two easy options:

---

## 🚀 الخيار الأول: النشر عبر GitHub Pages (موصى به)
## Option 1: Deploy to GitHub Pages (Recommended)

نظرًا لأن دفع الكود يتطلب صلاحيات حسابك الخاص على GitHub، فقد قمنا بإعداد وتثبيت كافة الأدوات البرمجية اللازمة. كل ما عليك فعله هو اتباع الخطوتين التاليتين:

Since pushing code requires your personal GitHub authentication, we have prepared and installed all local helper dependencies. You just need to run these two commands:

1. **أنشئ مستودعاً جديداً فارغاً** على حسابك في GitHub (مثلاً باسم: `cyber-clean-hr`).
   **Create a new empty repository** on your GitHub account (e.g., named `cyber-clean-hr`).

2. **افتح سطر الأوامر (Terminal) في مجلد المشروع** واكتب الأوامر التالية (استبدل اسم المستخدم واسم المستودع بروابط حسابك):
   **Open Terminal in the project directory** and run the following commands (replace username and repo name with yours):

   ```bash
   # 1. ربط المشروع المحلي بالمستودع على GitHub
   git remote add origin https://github.com/<USERNAME>/<REPO-NAME>.git

   # 2. بناء ونشر المشروع بضغطة زر واحدة تلقائياً
   npm run deploy
   ```

بمجرد تشغيل `npm run deploy`، سيقوم النظام تلقائياً ببناء كود الإنتاج ورفعه وتفعيله على رابط مجاني مثل:
Once you run `npm run deploy`, the system will compile the project and make it live on:
👉 `https://<USERNAME>.github.io/<REPO-NAME>/`

---

## ⚡ الخيار الثاني: النشر عبر استضافة Surge.sh الفورية
## Option 2: Deploy to Surge.sh Instantly

لقد قمنا بتثبيت أداة Surge محلياً لتفادي أي مشاكل في صلاحيات الكاش للمتصفح. للنشر الفوري:
We installed Surge locally. To deploy instantly to a public random URL:

1. **شغّل أمر البناء والتجميع:**
   **Run the build command:**
   ```bash
   npm run build
   ```

2. **شغّل أداة الرفع المحلية:**
   **Run the local surge binary:**
   ```bash
   ./node_modules/.bin/surge ./dist
   ```

3. سيطلب منك البرنامج إدخال **البريد الإلكتروني (Email)** و**كلمة مرور (Password)** (مرة واحدة لإنشاء حساب مجاني)، وسيعطيك رابطاً عاماً فوراً على الويب!
   Surge will ask you to enter an **Email** and **Password** (only once to register a free account), and will immediately output your live URL!
