// Frontend only. Language Schools = 100% English. Government = 100% Arabic.
// Wrong-course ("undefined 'id'") detection is done HERE only — solvers untouched.
const API_BASE = "https://qureosolver-six.vercel.app";

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
  categoryIntro: ['Pick Government for an Arabic portal, Language Schools for an English one. A wrong pick stops the solve instantly.', 'دي أهم خطوة! لو حسابك بالعربي اختار «حكومي»، ولو بالإنجليزي اختار «لغات». الاختيار الغلط بيخلي الحل وقف من أوله.'],
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
  mismatchStatus: ['Wrong course for this account — pick the correct school type and start again.',
