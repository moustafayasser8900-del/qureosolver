// Qureo Solver - Fixed Navigation & Button Handlers
const API_BASE = "https://qureosolver-six.vercel.app";

const adminParams = new URLSearchParams(location.search);
if (adminParams.get('admin')) localStorage.setItem('qureoAdmin', adminParams.get('admin'));
const ADMIN_KEY = localStorage.getItem('qureoAdmin') || '';

let deviceFp = localStorage.getItem('qureoFp');
if (!deviceFp) {
  deviceFp = 'fp-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);
  localStorage.setItem('qureoFp', deviceFp);
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#solve-form');
  const button = document.querySelector('#start-button');
  const statusBox = document.querySelector('#status');
  const courseCards = document.querySelector('#course-cards');
  const stepIndicator = document.querySelector('#step-indicator');
  const btnNext = document.querySelector('#btn-next');
  const btnBack = document.querySelector('#btn-back');
  const joinModal = document.querySelector('#join-modal');
  const categoryModal = document.querySelector('#category-modal');
  const yearModal = document.querySelector('#year-modal');
  const mismatchModal = document.querySelector('#mismatch-modal');
  const selectionPill = document.querySelector('#selection-pill');
  const joinedButton = document.querySelector('#joined-button');

  let selectedTrack = 'government';
  let selectedYear = 'one';
  let selectedCourse = 'js_fast_42';
  let step = 1;

  const COURSES = {
    government: {
      one: [{ key: 'js_fast_42', label: 'جافاسكربت (42 فصل)' }],
      two: [
        { key: 'js_fast', label: 'جافاسكربت (54 فصل)' },
        { key: 'pylangs_fast', label: 'بايثون' },
        { key: 'fin', label: 'ثقافة مالية' }
      ]
    },
    language: {
      one: [{ key: 'jslangs_fast_42', label: 'JavaScript (42 Chapters)' }],
      two: [
        { key: 'jslangs_fast', label: 'JavaScript' },
        { key: 'pylangs', label: 'Python' },
        { key: 'sakafa_langs', label: 'Financial Literacy' }
      ]
    }
  };

  function setStatus(msg, type = '') {
    if (statusBox) {
      statusBox.textContent = msg;
      statusBox.className = `status ${type}`;
    }
  }

  function showStep(n) {
    step = Math.min(Math.max(n, 1), 4);
    document.querySelectorAll('.wizard-step').forEach((el) => {
      el.classList.toggle('active', Number(el.dataset.step) === step);
    });
    if (stepIndicator) stepIndicator.textContent = `الخطوة ${step} من 4`;
    if (btnBack) btnBack.style.display = step === 1 ? 'none' : 'inline-block';
    if (btnNext) btnNext.style.display = step === 4 ? 'none' : 'inline-block';
    if (button) button.style.display = step === 4 ? 'inline-block' : 'none';
  }

  function renderCourses() {
    if (!courseCards) return;
    courseCards.innerHTML = '';
    const list = COURSES[selectedTrack]?.[selectedYear] || COURSES.government.one;

    if (!list.some((c) => c.key === selectedCourse)) {
      selectedCourse = list[0]?.key || '';
    }

    list.forEach((c) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `course-card ${c.key === selectedCourse ? 'selected' : ''}`;
      btn.textContent = c.label;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.course-card').forEach((el) => el.classList.remove('selected'));
        btn.classList.add('selected');
        selectedCourse = c.key;
      });
      courseCards.appendChild(btn);
    });
  }

  // إغلاق كافة النوافذ المنسدلة عند البدء
  [joinModal, categoryModal, yearModal, mismatchModal].forEach((m) => {
    if (m) m.classList.add('hidden');
  });

  if (joinedButton) {
    joinedButton.addEventListener('click', (e) => {
      e.preventDefault();
      if (joinModal) joinModal.classList.add('hidden');
    });
  }

  if (btnNext) {
    btnNext.addEventListener('click', (e) => {
      e.preventDefault();
      setStatus('');
      showStep(step + 1);
    });
  }

  if (btnBack) {
    btnBack.addEventListener('click', (e) => {
      e.preventDefault();
      showStep(step - 1);
    });
  }

  if (selectionPill) {
    selectionPill.addEventListener('click', (e) => {
      e.preventDefault();
      if (categoryModal) categoryModal.classList.remove('hidden');
    });
  }

  // ربط أزرار اختيار المسار (حكومي / لغات)
  const categoryBtns = document.querySelectorAll('#category-government, #category-language');
  categoryBtns.forEach((b) => {
    b.addEventListener('click', (e) => {
      e.preventDefault();
      selectedTrack = b.id.includes('language') ? 'language' : 'government';
      if (categoryModal) categoryModal.classList.add('hidden');
      if (yearModal) yearModal.classList.remove('hidden');
    });
  });

  // ربط أزرار اختيار السنة (الأولى / الثانية)
  const yearBtns = document.querySelectorAll('#year-one, #year-two');
  yearBtns.forEach((b) => {
    b.addEventListener('click', (e) => {
      e.preventDefault();
      selectedYear = b.id.includes('one') ? 'one' : 'two';
      if (yearModal) yearModal.classList.add('hidden');
      renderCourses();
    });
  });

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const phone = document.querySelector('#phone')?.value || '';
      const code = document.querySelector('#code')?.value || '';
      const password = document.querySelector('#password')?.value || '';

      if (!password) {
        setStatus('يرجى إدخال كلمة السر', 'error');
        return;
      }

      setStatus('جارٍ بدء الحل...');
      try {
        const res = await fetch(`${API_BASE}/api/solve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone, code, password,
            course: selectedCourse,
            admin_key: ADMIN_KEY,
            fingerprint: deviceFp
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'تعذر بدء الحل');
        setStatus('بدأ الحل بنجاح!', 'success');
      } catch (err) {
        setStatus(err.message, 'error');
      }
    });
  }

  renderCourses();
  showStep(1);
});
