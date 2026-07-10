// Paste the Web App URL you get from Apps Script > Deploy > New deployment ("Me" execute, "Anyone" access).
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyE400Me1cgiMb_PQwT9cNqb9x_X9uNa0mYUYlvIrUQxL29IqC8RJJhfblsTjXmvkUtQw/exec'

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

  // Province -> Node/Region lookup, loaded from data/thailand_provinces.csv.
  const provinceData = new Map();

  async function loadProvinceData() {
    try {
      const res = await fetch('data/thailand_provinces.csv');
      const text = await res.text();
      const lines = text.replace(/^﻿/, '').trim().split(/\r?\n/);
      lines.shift(); // header: ลำดับ,จังหวัด,ภาค,Node,Region

      lines.forEach(line => {
        const cols = line.split(',').map(s => s.trim());
        const [, province, , node, region] = cols;
        if (province) provinceData.set(province, { node, region });
      });

      // Repopulate the shared datalist from the CSV so it's the single source of truth.
      const datalist = document.getElementById('thProvinces');
      if (datalist && provinceData.size) {
        datalist.innerHTML = Array.from(provinceData.keys())
          .map(name => `<option value="${name}">`).join('');
      }

      // Re-run autofill on any province fields already filled in before the CSV finished loading.
      form.querySelectorAll('input[name^="lr_province_"]').forEach(input => {
        input.dispatchEvent(new Event('input'));
      });
    } catch (err) {
      console.warn('Could not load data/thailand_provinces.csv — Node/Region autofill disabled.', err);
    }
  }

  // จังหวัด field -> auto-fill that row's Node/Region text inputs from the CSV lookup.
  function wireProvinceAutofill(row) {
    const provinceInput = row.querySelector('input[name^="lr_province_"]');
    const nodeInput = row.querySelector('input[name^="lr_node_"]');
    const regionInput = row.querySelector('input[name^="lr_region_text_"]');
    if (!provinceInput) return;

    const sync = () => {
      const match = provinceData.get(provinceInput.value.trim());
      if (nodeInput) nodeInput.value = match ? match.node : '';
      if (regionInput) regionInput.value = match ? match.region : '';
    };
    provinceInput.addEventListener('input', sync);
    provinceInput.addEventListener('change', sync);
    sync();
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
      wireProvinceAutofill(newRow);

      updateButtons();
    });

    removeBtn.addEventListener('click', () => {
      const rows = getRows();
      if (rows.length <= 1) return;
      rows[rows.length - 1].remove();
      updateButtons();
    });

    getRows().forEach(wireProvinceAutofill);
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

  // Gather every labeled field's value, grouped by pane, and print it to the console for checking.
  function logFormData() {
    const seen = new Set();
    const data = {};

    panes.forEach(pane => {
      const title = pane.querySelector('.pane-title')?.textContent.trim() || `Pane ${pane.dataset.stepPane}`;
      const section = {};

      pane.querySelectorAll('[name][data-label]').forEach(field => {
        if (seen.has(field.name)) return;
        seen.add(field.name);

        if (field.type === 'checkbox' || field.type === 'radio') {
          const checked = form.querySelectorAll(`[name="${field.name}"]:checked`);
          section[field.dataset.label] = Array.from(checked).map(c => c.value);
          return;
        }

        section[field.dataset.label] = field.value.trim();
      });

      data[title] = section;
    });

    console.log('%cแบบสอบถาม — ข้อมูลที่กรอกทั้งหมด', 'font-weight:bold;font-size:14px;color:#2E7D32;');
    Object.entries(data).forEach(([title, section]) => {
      console.group(title);
      console.table(section);
      console.groupEnd();
    });
    console.log('Raw object:', data);

    return data;
  }

  // Shape the collected data to match the 3-sheet layout (Submission / Project_Year / Target_Area).
  function buildSubmissionPayload() {
    const val = name => (form.querySelector(`[name="${name}"]`)?.value || '').trim();
    // target_public/private/people and ace_n/e/t/c/a/p are checkbox *ids* — they share a
    // common `name` (target_group / ace_group) since they're groups, so look up by id.
    const checked = id => document.getElementById(id)?.checked === true;

    const years = Array.from(form.querySelectorAll('input[name="project_year"]:checked')).map(c => c.value);

    const marsChecked = form.querySelector('input[name="mars"]:checked');

    const grid = document.querySelector('.local-resource-grid');
    const rows = grid ? Array.from(grid.querySelectorAll('.lr-body > .row.lr-row')) : [];
    const areas = rows
      .map(row => {
        const province = row.querySelector('input[name^="lr_province_"]');
        if (!province || !province.value.trim()) return null;

        const areaNo = Number(row.querySelector('.order-cell')?.textContent.trim());
        const node = row.querySelector('input[name^="lr_node_"]')?.value.trim() || '';
        const region = row.querySelector('input[name^="lr_region_text_"]')?.value.trim() || '';
        const checkedChips = new Set(
          Array.from(row.querySelectorAll('input[type="checkbox"]:checked')).map(c => c.value)
        );

        return {
          area_no: areaNo,
          province_name: province.value.trim(),
          node,
          region,
          L1: checkedChips.has('L1'),
          L2: checkedChips.has('L2'),
          L3: checkedChips.has('L3'),
          L4: checkedChips.has('L4'),
          L5: checkedChips.has('L5'),
          L6: checkedChips.has('L6'),
        };
      })
      .filter(Boolean);

    return {
      project_name: val('project_name'),
      project_important: val('measureDetail'),
      public: checked('target_public') ? val('target_public_text') : '',
      private: checked('target_private') ? val('target_private_text') : '',
      people: checked('target_people') ? val('target_people_text') : '',
      N: checked('ace_n') ? val('ace_n_text') : '',
      E: checked('ace_e') ? val('ace_e_text') : '',
      T: checked('ace_t') ? val('ace_t_text') : '',
      C: checked('ace_c') ? val('ace_c_text') : '',
      A: checked('ace_a') ? val('ace_a_text') : '',
      P: checked('ace_p') ? val('ace_p_text') : '',
      MARS: marsChecked ? marsChecked.value : '',
      years,
      areas,
    };
  }

  function showSubmitStatus(kind, message) {
    const box = document.getElementById('submitStatus');
    if (!box) return;
    box.className = `alert mt-3 alert-${kind === 'error' ? 'danger' : kind === 'success' ? 'success' : 'secondary'}`;
    box.textContent = message;
  }

  // Submit via a hidden form POST targeting a hidden iframe, instead of fetch().
  // A real form submission to another origin is NOT subject to CORS — only
  // fetch()/XHR responses are — so this sidesteps Apps Script's CORS quirks entirely.
  // Trade-off: the iframe's response is cross-origin and unreadable from here, so this
  // can only confirm the request round-tripped, not that Apps Script actually saved it.
  // Always spot-check the Sheet after testing.
  function submitToGoogleSheet(payload) {
    return new Promise((resolve, reject) => {
      if (!GAS_WEB_APP_URL || GAS_WEB_APP_URL.includes('PASTE_YOUR')) {
        reject(new Error('ยังไม่ได้ตั้งค่า GAS_WEB_APP_URL ใน js/form.js'));
        return;
      }

      const hiddenForm = document.getElementById('gasSubmitForm');
      const payloadInput = document.getElementById('gasPayloadInput');
      const frame = document.querySelector('iframe[name="gasSubmitFrame"]');
      if (!hiddenForm || !payloadInput || !frame) {
        reject(new Error('ไม่พบฟอร์มสำหรับส่งข้อมูล (gasSubmitForm)'));
        return;
      }

      const onLoad = () => {
        frame.removeEventListener('load', onLoad);
        resolve({ status: 'success', submission_id: null });
      };
      frame.addEventListener('load', onLoad);

      hiddenForm.action = GAS_WEB_APP_URL;
      payloadInput.value = JSON.stringify(payload);
      hiddenForm.submit();
    });
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

  // Drop any rows added via "+" beyond the original 3, so the grid matches its starting state.
  function resetLocalResourceGrid() {
    const grid = document.querySelector('.local-resource-grid');
    const body = grid ? grid.querySelector('.lr-body') : null;
    if (!body) return;

    const rows = Array.from(body.querySelectorAll(':scope > .row.lr-row'));
    rows.slice(3).forEach(row => row.remove());

    const removeBtn = document.getElementById('lrRemoveRow');
    if (removeBtn) removeBtn.disabled = body.querySelectorAll(':scope > .row.lr-row').length <= 1;
  }

  // Clear every field and jump back to step 1, ready for a new entry.
  function resetFormToStart() {
    resetLocalResourceGrid();
    form.reset();

    // form.reset() doesn't fire change/input, so re-run the conditional-field wiring
    // (required-checkbox-groups, checkbox->field gating, province->chip gating/autofill).
    form.querySelectorAll('input[type="checkbox"], input[type="radio"]').forEach(cb => {
      cb.dispatchEvent(new Event('change'));
    });
    form.querySelectorAll('input[type="text"], textarea').forEach(field => {
      field.dispatchEvent(new Event('input'));
    });

    const statusBox = document.getElementById('submitStatus');
    if (statusBox) statusBox.classList.add('d-none');

    finishBtn.disabled = false;
    showStep(1);
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

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateCurrentPane()) return;
    if (!validateLocalResourceRows()) return;

    logFormData();
    const payload = buildSubmissionPayload();
    console.log('Submission payload:', payload);

    finishBtn.disabled = true;
    showSubmitStatus('info', 'กำลังส่งข้อมูล...');

    try {
      await submitToGoogleSheet(payload);
      showSubmitStatus('success', 'ส่งข้อมูลเรียบร้อยแล้ว กรุณาตรวจสอบข้อมูลใน Google Sheet');
      setTimeout(resetFormToStart, 1500);
    } catch (err) {
      console.error('Submit failed:', err);
      showSubmitStatus('error', `ส่งข้อมูลไม่สำเร็จ: ${err.message}`);
      finishBtn.disabled = false;
    }
  });

  setupRequiredCheckboxGroups();
  setupConditionalFields();
  setupProvinceGatedGroups();
  setupLocalResourceRows();
  loadProvinceData();
  showStep(1);
});
