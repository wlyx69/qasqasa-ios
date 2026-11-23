# قصقصه — تطبيق خاص لتقسيم الفيديو (آيفون ولابتوب)

تطبيق شخصي يقسم مقطع فيديو طويل إلى أجزاء على الجهاز نفسه، بدون سيرفر وبدون رفع. الواجهة صفحة ويب: على الآيفون داخل غلاف iOS أصلي بسيط (WKWebView)، وعلى اللابتوب تتثبّت من كروم أو إيدج كتطبيق.

**الحالة: النسخة 1 (القص الفعلي والحفظ وبدون نت).** القرارات ونتائج الاختبارات في `DECISIONS.md`.

## نسخة اللابتوب

`https://wlyx69.github.io/qasqasa-ios/`

1. افتح الرابط في كروم أو إيدج.
2. اضغط «ثبّت» في البطاقة اللي فوق (أو من القائمة ☰ ← «ثبّته على الجهاز»)، وبعدها «تثبيت» في نافذة المتصفح.
3. تطلع أيقونته على سطح المكتب وفي قائمة ابدأ، ويشتغل بدون نت.

ينتشر تلقائيًا مع كل تعديل في `App/Resources/www` (`.github/workflows/pages.yml`)، والتطبيق المثبّت يطلع له شريط «فيه تحديث».

## رابط الـ IPA المباشر (لمتجر التوقيع)

`https://raw.githubusercontent.com/wlyx69/qasqasa-ios/main/dist/Qasqasa-unsigned.ipa`

الرابط ثابت، ينتهي بـ `.ipa` بدون تحويلات، ويتحدث تلقائيًا بعد كل بناء. الملف غير موقّع عمدًا، والتوقيع يصير عندك.

## كيف ينبني

1. أي رفع على `main` (عدا `dist/` و`README.md` و`DECISIONS.md`) يشغّل بناء الـ IPA على GitHub Actions (ماك سحابي، 5 إلى 10 دقايق).
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
