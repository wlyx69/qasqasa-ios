# قصقصه — تطبيق آيفون خاص لتقسيم الفيديو

تطبيق شخصي يقسم مقطع فيديو طويل إلى أجزاء على الجهاز نفسه، بدون سيرفر وبدون رفع. الواجهة صفحة ويب داخل غلاف iOS أصلي بسيط (WKWebView) يعرضها من داخل التطبيق.

**المرحلة الحالية: 1 (الشكل والشاشات).** كل الشاشات شغالة بمقطع تجريبي، والقص الفعلي والحفظ يجون في النسخة 1.

## رابط الـ IPA المباشر (لمتجر التوقيع)

`https://raw.githubusercontent.com/wlyx69/qasqasa-ios/main/dist/Qasqasa-unsigned.ipa`

الرابط ثابت، ينتهي بـ `.ipa` بدون تحويلات، ويتحدث تلقائيًا بعد كل بناء. الملف غير موقّع عمدًا، والتوقيع يصير عندك.

## كيف ينبني

1. أي رفع على `main` (عدا `dist/` و`README.md`) يشغّل البناء على GitHub Actions (ماك سحابي، 5 إلى 10 دقايق).
2. البناء يحط الملف في `dist/Qasqasa-unsigned.ipa` ويسوي إصدار في Releases.
3. تشغيل يدوي: Actions ← Build unsigned IPA ← Run workflow.

## البنية

- `web/`: مصدر الواجهة (`index.src.html` و`app.css` و`app.js`).
- `tools/build_web.py`: يجمع الواجهة في `App/Resources/www` (يحقن الأيقونات من `tools/icons` والشعار). شغّله بعد أي تعديل في `web/`: `python3 tools/build_web.py`
- `App/Resources/www/`: الواجهة المبنية + خط IBM Plex Sans Arabic محلي (يشتغل بدون إنترنت).
- `App/Sources/`: الغلاف: `AppDelegate`، و`WebViewController` (ملء الشاشة، شريط الحالة فاتح)، و`LocalSchemeHandler` (يقدّم `www/` على `app://local/` عشان الحفظ المحلي يثبت)، و`NativeBridge` (فاضي حاليًا، للحفظ في النسخة 1).
- `project.yml`: إعداد XcodeGen (الاسم، المعرّف `sa.qasqasa.app`، الإصدار، أذونات الكاميرا والمايك والصور).

## الإصدار

`MARKETING_VERSION` و`CURRENT_PROJECT_VERSION` في `project.yml`، ونفس الرقم في `VERSION` داخل `web/app.js` (يظهر أسفل القائمة الجانبية). غيّرهم مع كل نسخة.

## ملاحظات

- التوقيع بحساب Apple ID مجاني يعيش 7 أيام، والشهادات الخارجية تعيش لين آبل تسحبها.
- الأيقونات: Phosphor (MIT). الخط: IBM Plex Sans Arabic (OFL).
