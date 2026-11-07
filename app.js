// Frontend only. Language Schools = 100% English. Government = 100% Arabic.
// Wrong-course ("undefined 'id'") detection is done HERE only — solvers untouched.
const API_BASE = new URLSearchParams(location.search).get('api')
  || localStorage.getItem('qureoApiBase')
  || '';

const adminParams = new URLSearchParams(location.search);
if (adminParams.get('admin')) localStorage.setItem('qureoAdmin', adminParams.get('admin'));
const ADMIN_KEY = localStorage.getItem('qureoAdmin') || '';

let deviceFp = localStorage.getItem('qureoFp');
if (!deviceFp) {
  deviceFp = 'fp-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);
  localStorage.setItem('qureoFp', deviceFp);
}

const form = document.querySelector('#solve-form');
const button = document.querySelector('#start-button');
const statusBox = document.querySelector('#status');
const chaptersBox = document.querySelector('#chapters');
const activityBox = document.querySelector('#activity');
const activityCount = document.querySelector('#activity-count');
const runningBadge = document.querySelector('#running-badge');
const courseCards = document.querySelector('#course-cards');
const stepIndicator = document.querySelector('#step-indicator');
const btnNext = document.querySelector('#btn-next');
const btnBack = document.querySelector('#btn-back');
const joinModal = document.querySelector('#join-modal');
const categoryModal = document.querySelector('#category-modal');
const yearModal = document.querySelector('#year-modal');
const mismatchModal = document.querySelector('#mismatch-modal');
const selectionPill = document.querySelector('#selection-pill');
const confirmNote = document.querySelector('#confirm-note');
const joinedButton = document.querySelector('#joined-button');

let currentUser = localStorage.getItem('qureoUserKey') || '';
let refreshing = false;
let progressFailures = 0;
let lastQueued = false;
let activitySignature = '';
let chaptersSignature = '';
let selectedTrack = sessionStorage.getItem('qureoTrack') || '';
let selectedYear = sessionStorage.getItem('qureoYear') || '';
let selectedCourse = '';
let step = 1;
let solveJustStarted = false;
let solveStartedAt = 0;
let uiLanguage = 'ar';
let mismatchHandled = '';
let lastActivity = [];
let lastChapters = [];

const COURSES_BY_TRACK = {
  government: {
    one: [
      { key: 'js_fast_42', label: 'JavaScript', labelAr: 'جافاسكربت', desc: '42 chapters · Government schools', descAr: '42 فصل · مدارس حكومي' },
    ],
    two: [
      { key: 'js_fast', label: 'JavaScript', labelAr: 'جافاسكربت', desc: '54 chapters · Government schools', descAr: '54 فصل · مدارس حكومي' },
      { key: 'pylangs_fast', label: 'Python', labelAr: 'بايثون', desc: 'Complete course · Government schools', descAr: 'الكورس كامل · مدارس حكومي' },
      { key: 'fin', label: 'Financial Literacy', labelAr: 'ثقافة مالية', desc: 'Complete course · Government schools', descAr: 'الكورس كامل · مدارس حكومي' },
    ],
  },
  language: {
    one: [
      { key: 'jslangs_fast_42', label: 'JavaScript — Language Schools', desc: '42 chapters · First year' },
    ],
    two: [
      { key: 'jslangs_fast', label: 'JavaScript — Language Schools', desc: '54 chapters · Second year' },
      { key: 'pylangs', label: 'Python — Language Schools', desc: 'Complete course · Second year' },
      { key: 'sakafa_langs', label: 'Financial Literacy — Language Schools', desc: 'English course · 134 items' },
    ],
  },
};

const TEXT = {
  brandName: ['QUREO', 'حل كيريو'],
  brandSub: ['SOLVER', 'QUREO'],
  brandFooter: ['QUREO SOLVER', 'حل كيريو'],
  joinKicker: ['ONE QUICK STEP', 'خطوة واحدة سريعة'],
  joinTitle: ['Stay in the loop', 'تابع كل جديد'],
  joinBody: ['Get solver updates and new course releases on Telegram, then continue to the platform.', 'تابع تحديثات الحل والكورسات الجديدة على تيليجرام، وبعدها كمل للمنصة.'],
  joinOpen: ['Open Telegram', 'فتح تيليجرام'],
  joinedButton: ['I’ve joined — continue', 'انضمت — متابعة'],
  categoryKicker: ['MOST IMPORTANT STEP', 'أهم خطوة — ظبطها صح'],
  categoryTitle: ['Is your QUREO account in Arabic or English?', 'حسابك على كيريو بالعربي ولا بالإنجليزي؟'],
  categoryIntro: ['Pick Government for an Arabic portal, Language Schools for an English one. A wrong pick stops the solve instantly.', 'دي أهم خطوة! لو حسابك بالعربي اختار «حكومي»، ولو بالإنجليزي اختار «لغات». الاختيار الغلط بيخلي الحل يقف من أوله.'],
  govCard: ['Government', 'حكومي'],
  govCardDesc: ['Arabic QUREO portal · Year 1 & Year 2', 'حساب كيريو بالعربي — أولى وتانية بكالوريا'],
  langCard: ['Language Schools', 'لغات'],
  langCardDesc: ['English QUREO portal · JavaScript, Python & Financial Literacy', 'حساب كيريو بالإنجليزي — جافاسكربت وبايثون وثقافة مالية'],
  yearTitle: ['Choose your year', 'اختار سنتك'],
  yearBack: ['Back to school type', 'رجوع لنوع المدرسة'],
  yearKickerGov: ['GOVERNMENT SCHOOLS', 'مدارس حكومي'],
  yearKickerLang: ['LANGUAGE SCHOOLS', 'مدارس لغات'],
  yearBodyGov: ['Your year sets the right government course and chapter range.', 'سنتك بتحدد الكورس الحكومي وعدد الفصول الصحيح.'],
  yearBodyLang: ['Your year sets the right language-schools course and chapter range.', 'سنتك بتحدد كورس اللغات وعدد الفصول الصحيح.'],
  yearOne: ['First Year', 'أولى بكالوريا'],
  yearTwo: ['Second Year', 'تانية بكالوريا'],
  yearOneGovDesc: ['JavaScript · 42 chapters · Government', 'جافاسكربت · 42 فصل'],
  yearTwoGovDesc: ['JavaScript (54) · Python · Financial Literacy', 'جافاسكربت (54 فصل) · بايثون · ثقافة مالية'],
  yearOneLangDesc: ['JavaScript · 42 chapters · Language Schools', 'JavaScript · 42 فصل · لغات'],
  yearTwoLangDesc: ['JavaScript (54) · Python · Financial · Language Schools', 'JavaScript (54) وPython وFinancial · لغات'],
  trackGov: ['Government', 'حكومي'],
  trackLang: ['Language Schools', 'لغات'],
  yearShortOne: ['Year 1', 'أولى'],
  yearShortTwo: ['Year 2', 'تانية'],
  pickTrack: ['Pick school type & year ✎', 'اختار نوع مدرستك وسنتك ✎'],
  confirmNote: ['Final check — you are solving: {course} · {track} · {year}', 'تأكيد أخير — هتحل: {course} · {track} · {year}'],
  mismatchKicker: ['WRONG COURSE', 'اختيار غير صحيح'],
  mismatchTitle: ['You picked Language/Government by mistake 😅', 'انت اخترت لغات أو حكومي بالغلط 😅'],
  mismatchBody: ['This account is not enrolled in the selected course, so the solve stopped. Arabic QUREO portal = Government, English portal = Language Schools. Pick again and restart.', 'الحساب ده مش مشترك في الكورس اللي اخترته، عشان كده الحل وقف. راجع نوع مدرستك: حساب كيريو بالعربي = حكومي، بالإنجليزي = لغات. اختار مرة تانية وابدأ من جديد.'],
  mismatchRetry: ['Choose again', 'اختار مرة تانية'],
  mismatchClose: ['Close', 'إغلاق'],
  mismatchStatus: ['Wrong course for this account — pick the correct school type and start again.', 'الكورس اللي اخترته مش بتاع الحساب ده — اختار نوع مدرستك الصح وابدأ تاني.'],
  heroKicker: ['ONE PLATFORM. EVERY COURSE.', 'منصة واحدة. كل الكورسات.'],
  heroLine1: ['Choose it. Solve it.', 'اختارها. حلها.'],
  heroLine2: ['Move forward.', 'وتقدّم للأمام.'],
  heroBody: ['Fast, accurate course completion with a private live feed for every session. No clutter—just the courses that belong to your year.', 'حل سريع ودقيق للكورسات مع نشاط مباشر خاص بكل جلسة. من غير زحمة—بس الكورسات المناسبة لسنتك.'],
  tagActive: ['30 active solvers', '30 حل نشط'],
  tagQueue: ['Smart queue', 'طابور ذكي'],
  tagProgress: ['Live progress', 'تقدم مباشر'],
  startTitle: ['Start a new solve', 'ابدأ حل جديد'],
  startSubtitle: ['Four quick steps. We handle the rest.', 'أربع خطوات سريعة. والباقي علينا.'],
  courseLabel: ['Choose your course', 'اختار الكورس'],
  courseDesc: ['Only courses for your year are shown. Tap the pill above to change school type or year.', 'هتظهر بس الكورسات المناسبة لسنتك. دوس على البطاقة اللي فوق لو عايز تغيّر نوع المدرسة أو السنة.'],
  phoneLabel: ['Phone number', 'رقم الموبايل'],
  phonePlaceholder: ['05xxxxxxxx', '05xxxxxxxx'],
  phoneHint: ['Used only if we need to contact you about your session.', 'هنستخدمه بس لو احتجنا نتواصل معاك بخصوص جلستك.'],
  codeLabel: ['Student ID', 'كود الطالب'],
  codePlaceholder: ['Enter your QUREO student ID', 'اكتب كود الطالب بتاع كيريو'],
  codeHint: ['The student ID assigned to your QUREO account.', 'كود الطالب المخصص لحسابك على كيريو.'],
  passwordLabel: ['Password', 'كلمة السر'],
  passwordPlaceholder: ['Enter your QUREO password', 'اكتب كلمة سر كيريو'],
  passwordHint: ['Your credentials are used only to complete your selected course.', 'بياناتك بتتستخدم بس لإكمال الكورس اللي اخترته.'],
  backButton: ['Back', 'رجوع'],
  nextButton: ['Next', 'التالي'],
  startButton: ['Start solving', 'ابدأ الحل'],
  readyStatus: ['Ready when you are.', 'جاهزين لما تكون جاهز.'],
  privacyNote: ['One active solve per device', 'حل واحد نشط لكل جهاز'],
  progressTitle: ['Live progress', 'التقدم المباشر'],
  progressSubtitle: ['Updates from your current session only.', 'تحديثات من جلستك الحالية بس.'],
  idle: ['Idle', 'متوقف'],
  completedItems: ['Completed items', 'عناصر مكتملة'],
  latestChapter: ['Latest chapter', 'آخر فصل'],
  solverStatus: ['Solver status', 'حالة الحل'],
  activityTitle: ['Activity feed', 'النشاط المباشر'],
  chaptersTitle: ['Chapters', 'الفصول'],
  sessionOnly: ['Your session only', 'جلستك بس'],
  emptyActivity: ['Your session activity will appear here.', 'نشاط جلستك هيظهر هنا.'],
  emptyChapters: ['No progress for this account yet.', 'لسه مفيش تقدم للحساب ده.'],
  footerTagline: ['Less waiting. More learning.', 'انتظار أقل. تعلم أكتر.'],
  stepOf: ['Step {step} of 4', 'الخطوة {step} من 4'],
  courseSelected: ['{course} selected. Click Next to continue.', 'تم اختيار {course}. دوس التالي عشان تكمل.'],
  chooseCourse: ['Choose a course to continue.', 'اختار كورس عشان تكمل.'],
  phoneRequired: ['Enter your phone number first.', 'اكتب رقم موبايلك الأول.'],
  codeRequired: ['Enter your student ID first.', 'اكتب كود الطالب الأول.'],
  passwordRequired: ['Enter your password first.', 'اكتب كلمة السر الأول.'],
  goBackCourse: ['Go back and choose a course first.', 'ارجع واختار الكورس الأول.'],
  joinedSuccess: ['You’re all set. Continue below.', 'تم التفعيل. كمل من تحت.'],
  starting: ['Starting your solve…', 'جارٍ بدء الحل…'],
  started: ['Your solve has started. Watch the live activity below.', 'بدأ الحل. تابع النشاط المباشر تحت.'],
  queueFirst: ['You are number 1 in queue — your solve starts as soon as any request finishes.', 'انت دورك رقم: 1 — هيبدأ الحل أول ما أي طلب يخلص.'],
  queueLater: ['You are number {position} in queue — your solve starts after {remaining} requests.', 'انت دورك رقم: {position} — هيبدأ الحل بعد {remaining} طلبات قبلك.'],
  queueStatus: ['Queue #{position}', 'دورك رقم {position}'],
  solvingNow: ['Solving now', 'يعمل الآن'],
  invalidCredentials: ['Invalid login credentials.', 'بيانات الدخول غير صحيحة.'],
  connectionSlow: ['Connection is slow — retrying automatically.', 'الاتصال بطيء — بنعيد المحاولة تلقائيًا.'],
  readProgressError: ['Unable to read progress.', 'تعذر قراءة التقدم.'],
  startError: ['Unable to start the solve.', 'تعذر بدء الحل.'],
  serverBusy: ['The server is busy — please try again in a few seconds.', 'السيرفر مشغول — حاول تاني بعد ثواني.'],
  events: ['events', 'أحداث'],
  chapter: ['Chapter', 'الفصل'],
  solved: ['solved', 'تم حله'],
};

function t(key, values = {}) {
  let value = TEXT[key]?.[uiLanguage === 'en' ? 0 : 1] ?? key;
  for (const [name, replacement] of Object.entries(values)) value = value.replaceAll(`{${name}}`, replacement);
  return value;
}

function applyLanguage(forceLang) {
  uiLanguage = forceLang || (selectedTrack === 'language' ? 'en' : 'ar');
  document.documentElement.lang = uiLanguage;
  document.documentElement.dir = uiLanguage === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  });
  // re-render dynamic (non data-i18n) content in the new language too
  activitySignature = '';
  chaptersSignature = '';
  renderActivity(lastActivity);
  renderChapters(lastChapters);
  updatePill();
  updateConfirm();
}

function hasValidSelection() {
  return Boolean(COURSES_BY_TRACK[selectedTrack]?.[selectedYear]);
}

function setStatus(message, type = '') {
  statusBox.textContent = message;
  statusBox.className = `status ${type}`;
}

function trackLabel() { return t(selectedTrack === 'language' ? 'trackLang' : 'trackGov'); }
function yearLabel() { return t(selectedYear === 'one' ? 'yearShortOne' : 'yearShortTwo'); }

function updatePill() {
  selectionPill.textContent = hasValidSelection()
    ? `${trackLabel()} · ${yearLabel()} ✎`
    : t('pickTrack');
}

function courseLabelOf(key) {
  for (const track of Object.values(COURSES_BY_TRACK)) {
    for (const year of Object.values(track)) {
      const found = year.find((c) => c.key === key);
      if (found) return found.label;
    }
  }
  return key;
}

function updateConfirm() {
  confirmNote.textContent = (hasValidSelection() && selectedCourse)
    ? t('confirmNote', { course: courseLabelOf(selectedCourse), track: trackLabel(), year: yearLabel() })
    : '';
}

function showStep(n) {
  step = Math.min(Math.max(n, 1), 4);
  document.querySelectorAll('.wizard-step').forEach((el) => {
    el.classList.toggle('active', Number(el.dataset.step) === step);
  });
  stepIndicator.textContent = t('stepOf', { step });
  btnBack.style.display = step === 1 ? 'none' : '';
  btnNext.style.display = step === 4 ? 'none' : '';
  button.style.display = step === 4 ? '' : 'none';
  updateConfirm();
}

function courseIcon(key) {
  if (uiLanguage === 'ar') {
    if (key.startsWith('js')) return 'ج';
    if (key.startsWith('py')) return 'ب';
    return 'ث';
  }
  if (key.startsWith('js')) return 'JS';
  if (key.startsWith('py')) return 'PY';
  return 'FI';
}

function renderCourses() {
  const list = COURSES_BY_TRACK[selectedTrack]?.[selectedYear] || [];
  courseCards.replaceChildren();
  selectedCourse = '';
  for (const course of list) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'course-card';
    card.dataset.course = course.key;
    const icon = document.createElement('span');
    icon.className = 'course-icon';
    icon.textContent = courseIcon(course.key);
    const text = document.createElement('span');
    const title = document.createElement('strong');
    title.textContent = uiLanguage === 'ar' ? (course.labelAr || course.label) : course.label;
    const desc = document.createElement('small');
    desc.textContent = uiLanguage === 'ar' ? (course.descAr || course.desc) : course.desc;
    text.append(title, desc);
    card.append(icon, text);
    card.addEventListener('click', () => {
      courseCards.querySelectorAll('.course-card').forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedCourse = course.key;
      setStatus(t('courseSelected', { course: course.label }), 'success');
      updateConfirm();
    });
    courseCards.appendChild(card);
  }
  updateConfirm();
}

function configureYearModal() {
  const gov = selectedTrack === 'government';
  document.querySelector('#year-kicker').textContent = t(gov ? 'yearKickerGov' : 'yearKickerLang');
  document.querySelector('#year-body').textContent = t(gov ? 'yearBodyGov' : 'yearBodyLang');
  document.querySelector('#year-one-title').textContent = t('yearOne');
  document.querySelector('#year-two-title').textContent = t('yearTwo');
  document.querySelector('#year-one-desc').textContent = t(gov ? 'yearOneGovDesc' : 'yearOneLangDesc');
  document.querySelector('#year-two-desc').textContent = t(gov ? 'yearTwoGovDesc' : 'yearTwoLangDesc');
}

function showSelection() {
  applyLanguage();
  if (hasValidSelection()) {
    categoryModal.classList.add('hidden');
    yearModal.classList.add('hidden');
    renderCourses();
  } else if (!selectedTrack) {
    yearModal.classList.add('hidden');
    categoryModal.classList.remove('hidden');
  } else {
    categoryModal.classList.add('hidden');
    configureYearModal();
    yearModal.classList.remove('hidden');
  }
  updatePill();
  updateConfirm();
}

function persistSelection() {
  sessionStorage.setItem('qureoTrack', selectedTrack);
  sessionStorage.setItem('qureoYear', selectedYear);
}

function chooseCategory(track) {
  selectedTrack = track;
  selectedYear = '';
  selectedCourse = '';
  persistSelection();
  showSelection();
}

function chooseYear(year) {
  selectedYear = year;
  selectedCourse = '';
  persistSelection();
  showSelection();
  showStep(1);
}

document.querySelector('#category-government').addEventListener('click', () => chooseCategory('government'));
document.querySelector('#category-language').addEventListener('click', () => chooseCategory('language'));
document.querySelector('#year-one').addEventListener('click', () => chooseYear('one'));
document.querySelector('#year-two').addEventListener('click', () => chooseYear('two'));
document.querySelector('#year-back').addEventListener('click', () => {
  selectedTrack = '';
  selectedYear = '';
  persistSelection();
  showSelection();
});
selectionPill.addEventListener('click', () => categoryModal.classList.remove('hidden'));

btnNext.addEventListener('click', () => {
  if (step === 1) {
    if (!selectedCourse) return setStatus(t('chooseCourse'), 'error');
  } else if (step === 2) {
    if (!document.querySelector('#phone').value.trim()) return setStatus(t('phoneRequired'), 'error');
  } else if (step === 3) {
    if (!document.querySelector('#code').value.trim()) return setStatus(t('codeRequired'), 'error');
  }
  setStatus('');
  showStep(step + 1);
});
btnBack.addEventListener('click', () => showStep(step - 1));

if (sessionStorage.getItem('qureoJoined') === 'true') {
  joinModal.classList.add('hidden');
  button.disabled = false;
  showSelection();
} else {
  applyLanguage();
}
joinedButton.addEventListener('click', () => {
  sessionStorage.setItem('qureoJoined', 'true');
  joinModal.classList.add('hidden');
  button.disabled = false;
  showSelection();
  setStatus(t('joinedSuccess'), 'success');
});

function localizeActivityText(rawText) {
  if (uiLanguage !== 'ar') return rawText.replaceAll('المعلومات خاطئة', 'Invalid login credentials');
  let text = rawText.replaceAll('المعلومات خاطئة', 'بيانات الدخول غير صحيحة').replaceAll('Invalid login credentials', 'بيانات الدخول غير صحيحة');
  text = text.replace(/You are number (\d+) in queue — your solve starts after (\d+) requests/, 'انت دورك رقم: $1 — هيبدأ الحل بعد $2 طلبات قبلك');
  text = text.replace('You are number 1 in queue — your solve starts as soon as any request finishes', 'انت دورك رقم: 1 — هيبدأ الحل أول ما أي طلب يخلص');
  return text;
}

function localizeError(message) {
  if (uiLanguage !== 'ar') return message;
  if (message.includes('already have a solve in progress')) return 'عندك حل شغال بالفعل، استنى لما يخلص.';
  if (message.includes('This account already has a solve in progress')) return 'الحساب ده عنده حل شغال بالفعل.';
  if (message.includes('Unable to start')) return t('startError');
  if (message.includes('required')) return 'بيانات ناقصة أو غير صحيحة.';
  return message;
}

function renderActivity(lines) {
  const signature = JSON.stringify(lines);
  activityCount.textContent = `${lines.length} ${t('events')}`;
  if (signature === activitySignature) return;

  const stickToBottom = !activitySignature || activityBox.scrollHeight - activityBox.scrollTop - activityBox.clientHeight < 45;
  activitySignature = signature;
  activityBox.replaceChildren();

  if (!lines.length) {
    const empty = document.createElement('div');
    empty.className = 'empty compact';
    empty.textContent = t('emptyActivity');
    activityBox.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const rawText of lines) {
    const text = localizeActivityText(rawText);
    const row = document.createElement('div');
    const lower = text.toLowerCase();
    row.className = 'activity-line';
    if (/done|answered|completed|clear|perfect/.test(lower)) row.classList.add('success');
    if (/error|failed|skipped|exception|traceback|خطأ|خاطئة/.test(lower)) row.classList.add('error');
    if (/^(lesson|chapter|course|review)/.test(lower)) row.classList.add('current');
    row.textContent = text;
    fragment.appendChild(row);
  }
  activityBox.appendChild(fragment);
  if (stickToBottom) activityBox.scrollTop = activityBox.scrollHeight;
}

function renderChapters(chapters) {
  const signature = JSON.stringify(chapters);
  if (signature === chaptersSignature) return;
  chaptersSignature = signature;
  chaptersBox.replaceChildren();

  if (!chapters.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = t('emptyChapters');
    chaptersBox.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const item of chapters) {
    const card = document.createElement('div');
    card.className = 'chapter';
    const text = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = `${t('chapter')} ${item.chapter}`;
    const detail = document.createElement('small');
    detail.textContent = item.lessons.join(' · ');
    detail.title = item.lessons.join(' · ');
    text.append(title, detail);
    const count = document.createElement('span');
    count.textContent = `${item.lessons.length} ${t('solved')}`;
    card.append(text, count);
    fragment.appendChild(card);
  }
  chaptersBox.appendChild(fragment);
}

/* Wrong-course popup: the solvers crash with "Cannot read properties of
   undefined (reading 'id')" when the account is not enrolled in the selected
   course (langs vs government mixup). Catch that signature in the live feed. */
function detectCourseMismatch(activity) {
  const start = Math.max(0, activity.length - 60);
  for (let i = activity.length - 1; i >= start; i--) {
    const line = String(activity[i] || '');
    if (line.includes('COURSE_MISMATCH') || line.includes("reading 'id'") || line.includes('basic_section')) {
      if (mismatchHandled === line) return;
      mismatchHandled = line;
      solveJustStarted = false;
      mismatchModal.classList.remove('hidden');
      setStatus(t('mismatchStatus'), 'error');
      return;
    }
  }
}

document.querySelector('#mismatch-retry').addEventListener('click', () => {
  mismatchModal.classList.add('hidden');
  mismatchHandled = '';
  currentUser = '';
  localStorage.removeItem('qureoUserKey');
  activitySignature = '';
  chaptersSignature = '';
  selectedCourse = '';
  selectedTrack = '';
  selectedYear = '';
  persistSelection();
  setStatus('');
  showStep(1);
  showSelection();
  refreshProgress();
});
document.querySelector('#mismatch-close').addEventListener('click', () => mismatchModal.classList.add('hidden'));

async function refreshProgress() {
  if (refreshing) return;
  if (!currentUser) {
    document.querySelector('#completed-count').textContent = '0';
    document.querySelector('#last-chapter').textContent = '—';
    document.querySelector('#running').textContent = t('idle');
    runningBadge.textContent = t('idle');
    runningBadge.classList.remove('active');
    lastActivity = [];
    lastChapters = [];
    renderActivity(lastActivity);
    renderChapters(lastChapters);
    return;
  }

  refreshing = true;
  try {
    const response = await fetch(`${API_BASE}/api/progress?user=${encodeURIComponent(currentUser)}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || t('readProgressError'));
    if (progressFailures >= 10) setStatus('');
    progressFailures = 0;
    document.querySelector('#completed-count').textContent = data.completed_count;
    document.querySelector('#last-chapter').textContent = data.last_chapter || '—';
    const queued = Boolean(data.queued);
    lastQueued = queued;
    const queuePosition = data.queue_position || 0;
    document.querySelector('#running').textContent = queued ? t('queueStatus', { position: queuePosition }) : data.running ? t('solvingNow') : t('idle');
    runningBadge.textContent = queued ? `● ${t('queueStatus', { position: queuePosition })}` : data.running ? (uiLanguage === 'ar' ? '● مباشر' : '● Live') : t('idle');
    runningBadge.classList.toggle('active', data.running || queued);
    const activity = Array.isArray(data.activity) ? data.activity : [];
    lastActivity = activity;
    lastChapters = Array.isArray(data.chapters) ? data.chapters : [];
    renderActivity(activity);
    detectCourseMismatch(activity);
    const latestActivity = activity[activity.length - 1] || '';
    if (solveJustStarted && latestActivity.includes('المعلومات خاطئة')) {
      setStatus(t('invalidCredentials'), 'error');
      solveJustStarted = false;
    }
    if (solveJustStarted && Date.now() - solveStartedAt > 120000) solveJustStarted = false;
    renderChapters(Array.isArray(data.chapters) ? data.chapters : []);
  } catch (error) {
    progressFailures += 1;
    if (progressFailures >= 10) setStatus(t('connectionSlow'), 'error');
  } finally {
    refreshing = false;
  }
}

async function postSolve(payload) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(`${API_BASE}/api/solve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000),
      });
      const data = await response.json();
      if ((response.status === 409 || response.status === 429) && data.user_key) {
        return { data, already: true };
      }
      if (!response.ok) throw new Error(data.error || t('startError'));
      return { data, already: false };
    } catch (error) {
      lastError = error;
      if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 750));
    }
  }
  throw lastError;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!selectedCourse) return setStatus(t('goBackCourse'), 'error');
  if (!document.querySelector('#password').value) return setStatus(t('passwordRequired'), 'error');
  button.disabled = true;
  setStatus(t('starting'));
  const payload = {
    phone: document.querySelector('#phone').value.trim(),
    code: document.querySelector('#code').value.trim(),
    password: document.querySelector('#password').value,
    course: selectedCourse,
    chapter: null,
    admin_key: ADMIN_KEY,
    fingerprint: deviceFp,
  };
  try {
    const { data, already } = await postSolve(payload);
    currentUser = data.user_key;
    localStorage.setItem('qureoUserKey', currentUser);
    activitySignature = '';
    mismatchHandled = '';
    mismatchModal.classList.add('hidden');
    solveJustStarted = true;
    solveStartedAt = Date.now();
    lastQueued = Boolean(data.queued);
    document.querySelector('#running').textContent = lastQueued ? t('queueStatus', { position: data.queue_position || 1 }) : t('solvingNow');
    runningBadge.textContent = lastQueued ? `● ${t('queueStatus', { position: data.queue_position || 1 })}` : (uiLanguage === 'ar' ? '● مباشر' : '● Live');
    runningBadge.classList.add('active');
    if (already) {
      setStatus(uiLanguage === 'ar' ? 'عندك حل شغال بالفعل — بنتابع نفس الجلسة.' : 'A solve is already running — following the same session.', 'success');
    } else if (data.queued) {
      setStatus(data.queue_position > 1 ? t('queueLater', { position: data.queue_position, remaining: data.queue_position - 1 }) : t('queueFirst'), 'success');
    } else {
      setStatus(t('started'), 'success');
    }
    refreshProgress();
  } catch (error) {
    setStatus(error.name === 'AbortError' ? t('serverBusy') : localizeError(error.message), 'error');
  } finally {
    button.disabled = false;
  }
});

async function progressLoop() {
  await refreshProgress();
  setTimeout(progressLoop, lastQueued ? 10000 : 3000);
}

showStep(1);
progressLoop();
