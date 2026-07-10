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
  function wireProvinceGate(trigger) {
    const group = document.querySelector(trigger.dataset.enables);
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
  }

  function setupProvinceGatedGroups() {
    form.querySelectorAll('[data-enables]').forEach(wireProvinceGate);
  }

  // Panel 5's province table: "+" clones the last row (renumbered), "-" removes it (min 1 row).
  function setupLocalResourceRows() {
    const grid = document.querySelector('.local-resource-grid');
    const body = grid ? grid.querySelector('.lr-body') : null;
    const addBtn = document.getElementById('lrAddRow');
    const removeBtn = document.getElementById('lrRemoveRow');
    if (!grid || !body || !addBtn || !removeBtn) return;

    const getRows = () => Array.from(body.querySelectorAll(':scope > .row.lr-row'));

    function renumberRow(rowEl, oldNum, newNum) {
      const orderCell = rowEl.querySelector('.order-cell');
      if (orderCell) orderCell.textContent = String(newNum);

      const pattern = new RegExp(`(_|ลำดับ )${oldNum}(?!\\d)`, 'g');
      rowEl.querySelectorAll('[name], [id], [data-label], [data-enables]').forEach(el => {
        ['name', 'id', 'data-label', 'data-enables'].forEach(attr => {
          if (!el.hasAttribute(attr)) return;
          const val = el.getAttribute(attr);
          const updated = val.replace(pattern, `$1${newNum}`);
          if (updated !== val) el.setAttribute(attr, updated);
        });
      });
    }

    function updateButtons() {
      removeBtn.disabled = getRows().length <= 1;
    }

    addBtn.addEventListener('click', () => {
      const rows = getRows();
      const oldNum = rows.length;
      const newNum = oldNum + 1;
      const newRow = rows[rows.length - 1].cloneNode(true);

      newRow.querySelectorAll('input[type="text"]').forEach(i => { i.value = ''; });
      newRow.querySelectorAll('input[type="checkbox"]').forEach(c => { c.checked = false; c.disabled = true; });

      renumberRow(newRow, oldNum, newNum);
      body.appendChild(newRow);

      const trigger = newRow.querySelector('[data-enables]');
      if (trigger) wireProvinceGate(trigger);

      updateButtons();
    });

    removeBtn.addEventListener('click', () => {
      const rows = getRows();
      if (rows.length <= 1) return;
      rows[rows.length - 1].remove();
      updateButtons();
    });

    updateButtons();
  }

  // On Finish: at least one row must have a province, and every row that has
  // a province must also have at least one Local-based Resource chip checked.
  function validateLocalResourceRows() {
    const grid = document.querySelector('.local-resource-grid');
    if (!grid) return true;

    const rows = Array.from(grid.querySelectorAll('.lr-body > .row.lr-row'));
    const rowsWithProvince = rows.filter(row => {
      const province = row.querySelector('input[name^="lr_province_"]');
      return province && province.value.trim() !== '';
    });

    if (rowsWithProvince.length === 0) {
      const firstProvince = rows[0]?.querySelector('input[name^="lr_province_"]');
      if (firstProvince) {
        firstProvince.setCustomValidity('กรุณาเลือกจังหวัดอย่างน้อย 1 แถว');
        firstProvince.reportValidity();
        firstProvince.addEventListener('input', () => firstProvince.setCustomValidity(''), { once: true });
      }
      return false;
    }

    for (const row of rowsWithProvince) {
      if (row.querySelectorAll('input[type="checkbox"]:checked').length > 0) continue;

      const firstChip = row.querySelector('input[type="checkbox"]');
      if (firstChip) {
        firstChip.setCustomValidity('กรุณาเลือก Local-based Resources อย่างน้อย 1 รายการสำหรับแถวที่เลือกจังหวัดแล้ว');
        firstChip.reportValidity();
        firstChip.addEventListener('change', () => firstChip.setCustomValidity(''), { once: true });
      }
      return false;
    }

    return true;
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
    if (!validateLocalResourceRows()) return;

    document.getElementById('successMsg').classList.remove('d-none');
    finishBtn.disabled = true;
  });

  setupRequiredCheckboxGroups();
  setupConditionalFields();
  setupProvinceGatedGroups();
  setupLocalResourceRows();
  showStep(1);
});
