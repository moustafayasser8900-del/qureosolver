// Qureosolver - Fixed Wizard & Navigation Logic
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
let selectedTrack = sessionStorage.getItem('qureoTrack') || 'government';
let selectedYear = sessionStorage.getItem('qureoYear') || 'one';
let selectedCourse = 'js_fast_42';
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
  stepOf: ['Step {step} of 4', 'الخطوة {step} من 4'],
  courseSelected: ['{course} selected. Click Next to continue.', 'تم اختيار {course}. دوس التالي عشان تكمل.'],
  chooseCourse: ['Choose a course to continue.', 'اختار كورس عشان تكمل.'],
  phoneRequired: ['Enter your phone number first.', 'اكتب رقم موبايلك الأول.'],
  codeRequired: ['Enter your student ID first.', 'اكتب كود الطالب الأول.'],
  passwordRequired: ['Enter your password first.', 'اكتب كلمة السر الأول.'],
  joinedSuccess: ['You’re all set. Continue below.', 'تم التفعيل. كمل من تحت.'],
  starting: ['Starting your solve…', 'جارٍ بدء الحل…'],
  started: ['Your solve has started. Watch the live activity below.', 'بدأ الحل. تابع النشاط المباشر تحت.'],
  idle: ['Idle', 'متوقف'],
  solvingNow: ['Solving now', 'يعمل الآن'],
  events: ['events', 'أحداث'],
  chapter: ['Chapter', 'الفصل'],
  solved: ['solved', 'تم حله'],
  emptyActivity: ['Your session activity will appear here.', 'نشاط جلستك هيظهر هنا.'],
  emptyChapters: ['No progress for this account yet.', 'لسه مفيش تقدم للحساب ده.'],
};

function t(key, values = {}) {
  let value = TEXT[key]?.[uiLanguage === 'en' ? 0 : 1] ?? key;
  for (const [name, replacement] of Object.entries(values)) value = value.replaceAll(`{${name}}`, replacement);
  return value;
}

function setStatus(message, type = '') {
  if (!statusBox) return;
  statusBox.textContent = message;
  statusBox.className = `status ${type}`;
}

function updatePill() {
  if (selectionPill) {
    selectionPill.textContent = `${selectedTrack === 'language' ? 'Language' : 'حكومي'} · ${selectedYear === 'one' ? 'أولى' : 'تانية'} ✎`;
  }
}

function showStep(n) {
  step = Math.min(Math.max(n, 1), 4);
  document.querySelectorAll('.wizard-step').forEach((el) => {
    el.classList.toggle('active', Number(el.dataset.step) === step);
  });
  if (stepIndicator) stepIndicator.textContent = t('stepOf', { step });
  if (btnBack) btnBack.style.display = step === 1 ? 'none' : '';
  if (btnNext) btnNext.style.display = step === 4 ? 'none' : '';
  if (button) button.style.display = step === 4 ? '' : 'none';
}

function renderCourses() {
  if (!courseCards) return;
  const list = COURSES_BY_TRACK[selectedTrack]?.[selectedYear] || [];
  courseCards.replaceChildren();
  for (const course of list) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'course-card';
    if (course.key === selectedCourse) card.classList.add('selected');
    card.textContent = uiLanguage === 'ar' ? (course.labelAr ||
