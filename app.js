if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const phone = document.querySelector('#phone')?.value.trim() || '';
      const code = document.querySelector('#code')?.value.trim() || '';
      const password = document.querySelector('#password')?.value || '';

      // التعبير المنتظم (RegEx) للتحقق من رقم الهاتف 
      // (هذا المثال مخصص للأرقام المصرية: يبدأ بـ 01 ويتبعه 0 أو 1 أو 2 أو 5 و 8 أرقام أخرى، بإجمالي 11 رقماً)
      const phoneRegex = /^01[0125][0-9]{8}$/;

      // التحقق من صحة رقم الهاتف
      if (!phone || !phoneRegex.test(phone)) {
        setStatus('يرجى إدخال رقم هاتف صحيح (مثلاً: 01012345678)', 'error');
        return;
      }

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
    };
}
