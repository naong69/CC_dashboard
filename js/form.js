document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('surveyForm');
  if (!form) return;

  const panes = Array.from(form.querySelectorAll('.tab-pane'));
  const steps = Array.from(document.querySelectorAll('#stepIndicator .step'));
  const backBtn = document.getElementById('backBtn');
  const nextBtn = document.getElementById('nextBtn');
  const finishBtn = document.getElementById('finishBtn');
  const totalSteps = panes.length;
  let current = 1;

  function showStep(n) {
    current = n;

    panes.forEach(p => {
      const isTarget = Number(p.dataset.stepPane) === n;
      p.classList.toggle('show', isTarget);
      p.classList.toggle('active', isTarget);
    });

    steps.forEach(s => {
      const stepNum = Number(s.dataset.step);
      s.classList.toggle('active', stepNum === n);
      s.classList.toggle('completed', stepNum < n);
    });

    backBtn.disabled = n === 1;
    nextBtn.classList.toggle('d-none', n === totalSteps);
    finishBtn.classList.toggle('d-none', n !== totalSteps);

    if (n === totalSteps) buildReviewSummary();

    document.getElementById('form-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Checkbox groups (same name) can't use native "at least one required" —
  // toggle `required` on every checkbox in the group based on whether any is checked,
  // so reportValidity() only complains when the whole group is empty.
  function setupRequiredCheckboxGroups() {
    const groupNames = new Set();
    form.querySelectorAll('input[type="checkbox"][required]').forEach(cb => groupNames.add(cb.name));

    groupNames.forEach(name => {
      const boxes = Array.from(form.querySelectorAll(`input[type="checkbox"][name="${name}"]`));
      const sync = () => {
        const anyChecked = boxes.some(b => b.checked);
        boxes.forEach(b => { b.required = !anyChecked; });
      };
      boxes.forEach(b => b.addEventListener('change', sync));
      sync();
    });
  }

  // Checkbox -> paired field: enable + require the target only while its checkbox is checked.
  function setupConditionalFields() {
    form.querySelectorAll('[data-target]').forEach(trigger => {
      const target = form.querySelector(trigger.dataset.target);
      if (!target) return;

      const sync = () => {
        target.disabled = !trigger.checked;
        target.required = trigger.checked;
      };
      trigger.addEventListener('change', sync);
      sync();
    });
  }

  // Text field -> checkbox group: enable the group's checkboxes only once the field has a value.
  function setupProvinceGatedGroups() {
    form.querySelectorAll('[data-enables]').forEach(trigger => {
      const group = form.querySelector(trigger.dataset.enables);
      if (!group) return;
      const boxes = Array.from(group.querySelectorAll('input[type="checkbox"]'));

      const sync = () => {
        const hasValue = trigger.value.trim() !== '';
        boxes.forEach(b => {
          b.disabled = !hasValue;
          if (!hasValue) b.checked = false;
        });
      };
      trigger.addEventListener('input', sync);
      trigger.addEventListener('change', sync);
      sync();
    });
  }

  function validateCurrentPane() {
    const pane = panes.find(p => Number(p.dataset.stepPane) === current);
    const required = pane.querySelectorAll('[required]');
    for (const field of required) {
      if (!field.reportValidity()) return false;
    }
    return true;
  }

  function buildReviewSummary() {
    const summary = document.getElementById('reviewSummary');
    if (!summary) return;

    const rows = [];
    const seen = new Set();

    form.querySelectorAll('[name][data-label]').forEach(field => {
      if (seen.has(field.name)) return;

      if (field.type === 'checkbox' || field.type === 'radio') {
        const checked = form.querySelectorAll(`[name="${field.name}"]:checked`);
        if (checked.length) {
          rows.push([field.dataset.label, Array.from(checked).map(c => c.value).join(', ')]);
        }
        seen.add(field.name);
        return;
      }

      if (field.value.trim()) {
        rows.push([field.dataset.label, field.value.trim()]);
      }
      seen.add(field.name);
    });

    summary.innerHTML = rows.length
      ? rows.map(([label, value]) => `
          <div class="review-row">
            <span class="review-label">${label}</span>
            <span class="review-value">${value}</span>
          </div>`).join('')
      : '<p class="text-muted">ยังไม่มีข้อมูลที่กรอก</p>';
  }

  nextBtn.addEventListener('click', () => {
    if (!validateCurrentPane()) return;
    if (current < totalSteps) showStep(current + 1);
  });

  backBtn.addEventListener('click', () => {
    if (current > 1) showStep(current - 1);
  });

  steps.forEach(s => {
    s.addEventListener('click', () => {
      const target = Number(s.dataset.step);
      if (target < current) showStep(target);
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateCurrentPane()) return;

    document.getElementById('successMsg').classList.remove('d-none');
    finishBtn.disabled = true;
  });

  setupRequiredCheckboxGroups();
  setupConditionalFields();
  setupProvinceGatedGroups();
  showStep(1);
});
