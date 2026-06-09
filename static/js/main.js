/**
 * Object Detection System — Frontend JavaScript
 * Handles: file upload, drag-drop, preview, API call, results rendering
 */

// ── DOM References ────────────────────────────────────
const dropZone        = document.getElementById('dropZone');
const dropZoneContent = document.getElementById('dropZoneContent');
const previewContainer= document.getElementById('previewContainer');
const previewImage    = document.getElementById('previewImage');
const fileInfo        = document.getElementById('fileInfo');
const imageInput      = document.getElementById('imageInput');
const browseBtn       = document.getElementById('browseBtn');
const changeImageBtn  = document.getElementById('changeImageBtn');
const detectBtn       = document.getElementById('detectBtn');

const errorAlert   = document.getElementById('errorAlert');
const errorMessage = document.getElementById('errorMessage');
const closeError   = document.getElementById('closeError');

const loadingCard  = document.getElementById('loadingCard');
const step1        = document.getElementById('step1');
const step2        = document.getElementById('step2');
const step3        = document.getElementById('step3');

const resultsSection  = document.getElementById('resultsSection');
const resultsSummaryText = document.getElementById('resultsSummaryText');
const statsRow        = document.getElementById('statsRow');
const originalImage   = document.getElementById('originalImage');
const annotatedImage  = document.getElementById('annotatedImage');
const detectionsList  = document.getElementById('detectionsList');
const filterTabs      = document.getElementById('filterTabs');
const summaryCard     = document.getElementById('summaryCard');
const summaryTableBody= document.getElementById('summaryTableBody');
const resetBtn        = document.getElementById('resetBtn');

// ── State ─────────────────────────────────────────────
let selectedFile = null;
let lastDetections = [];
let loadingTimers = [];

// ── File Selection Helpers ────────────────────────────

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function showPreview(file) {
  selectedFile = file;
  const url = URL.createObjectURL(file);
  previewImage.src = url;
  fileInfo.textContent = `${file.name} · ${formatBytes(file.size)}`;
  dropZoneContent.classList.add('hidden');
  previewContainer.classList.remove('hidden');
  detectBtn.disabled = false;
  hideError();
}

function resetUpload() {
  selectedFile = null;
  imageInput.value = '';
  previewImage.src = '';
  dropZoneContent.classList.remove('hidden');
  previewContainer.classList.add('hidden');
  detectBtn.disabled = true;
}

function validateFile(file) {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
  if (!allowed.includes(file.type)) {
    showError('Invalid file type. Please upload a JPG, JPEG, or PNG image.');
    return false;
  }
  if (file.size > 16 * 1024 * 1024) {
    showError('File too large. Maximum allowed size is 16 MB.');
    return false;
  }
  return true;
}

// ── Error Handling ────────────────────────────────────

function showError(msg) {
  errorMessage.textContent = msg;
  errorAlert.classList.remove('hidden');
  errorAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideError() {
  errorAlert.classList.add('hidden');
}

closeError.addEventListener('click', hideError);

// ── Drag and Drop ─────────────────────────────────────

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];
    if (validateFile(file)) showPreview(file);
  }
});

dropZone.addEventListener('click', (e) => {
  // Don't open file dialog when clicking the change or browse button
  if (e.target === changeImageBtn || e.target.closest('#changeImageBtn')) return;
  if (e.target === browseBtn) return;
  if (!previewContainer.classList.contains('hidden')) return;
  imageInput.click();
});

dropZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    imageInput.click();
  }
});

browseBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  imageInput.click();
});

changeImageBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  resetUpload();
  imageInput.click();
});

imageInput.addEventListener('change', () => {
  if (imageInput.files.length > 0) {
    const file = imageInput.files[0];
    if (validateFile(file)) showPreview(file);
  }
});

// ── Loading Steps Animation ───────────────────────────

function startLoadingAnimation() {
  loadingTimers.forEach(clearTimeout);
  loadingTimers = [];

  [step1, step2, step3].forEach(s => {
    s.classList.remove('active', 'done');
  });
  step1.classList.add('active');

  loadingTimers.push(setTimeout(() => {
    step1.classList.remove('active');
    step1.classList.add('done');
    step2.classList.add('active');
  }, 1200));

  loadingTimers.push(setTimeout(() => {
    step2.classList.remove('active');
    step2.classList.add('done');
    step3.classList.add('active');
  }, 2800));
}

function stopLoadingAnimation() {
  loadingTimers.forEach(clearTimeout);
  loadingTimers = [];
  [step1, step2, step3].forEach(s => {
    s.classList.remove('active');
    s.classList.add('done');
  });
}

// ── Confidence Color ──────────────────────────────────

function confColor(conf) {
  if (conf >= 0.75) return '#32d583';   // green
  if (conf >= 0.50) return '#4f8ef7';   // blue
  if (conf >= 0.30) return '#ffa94d';   // orange
  return '#ff5c5c';                     // red
}

function rgbToHex(arr) {
  return '#' + arr.map(v => v.toString(16).padStart(2, '0')).join('');
}

// ── Render Detection Items ────────────────────────────

function renderDetections(detections) {
  detectionsList.innerHTML = '';
  if (detections.length === 0) {
    detectionsList.innerHTML = '<p style="color:var(--text2);text-align:center;padding:1.5rem;font-size:0.85rem;">No objects detected in this image.</p>';
    return;
  }

  detections.forEach((det, i) => {
    const hex = rgbToHex(det.color);
    const confPct = Math.round(det.confidence * 100);
    const [x1,y1,x2,y2] = det.bbox;

    const item = document.createElement('div');
    item.className = 'detection-item';
    item.style.animationDelay = `${i * 0.04}s`;
    item.setAttribute('role', 'listitem');
    item.dataset.label = det.label;

    item.innerHTML = `
      <span class="det-rank">${i + 1}</span>
      <span class="det-color-dot" style="background:${hex}" aria-hidden="true"></span>
      <div class="det-info">
        <div class="det-label">${det.label}</div>
        <div class="det-bbox">Box: [${x1}, ${y1}, ${x2}, ${y2}]</div>
      </div>
      <div class="det-conf-area">
        <span class="det-conf-pct" style="color:${confColor(det.confidence)}">${confPct}%</span>
        <div class="det-conf-bar" aria-label="Confidence ${confPct}%">
          <div class="det-conf-fill" style="width:${confPct}%;background:${confColor(det.confidence)}"></div>
        </div>
      </div>
    `;
    detectionsList.appendChild(item);
  });
}

// ── Render Filter Tabs ────────────────────────────────

function buildFilterTabs(summary) {
  filterTabs.innerHTML = '<button class="tab active" data-filter="all" role="tab" aria-selected="true">All</button>';

  summary.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'tab';
    btn.dataset.filter = s.label;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', 'false');
    btn.textContent = `${s.label} (${s.count})`;
    filterTabs.appendChild(btn);
  });

  filterTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    filterTabs.querySelectorAll('.tab').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');

    const filter = tab.dataset.filter;
    const filtered = filter === 'all'
      ? lastDetections
      : lastDetections.filter(d => d.label === filter);
    renderDetections(filtered);
  });
}

// ── Render Stats ──────────────────────────────────────

function renderStats(data) {
  const uniqueClasses = [...new Set(data.detections.map(d => d.label))].length;
  const avgConf = data.detections.length
    ? (data.detections.reduce((a, d) => a + d.confidence, 0) / data.detections.length * 100).toFixed(1)
    : 0;

  statsRow.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Total Objects</div>
      <div class="stat-value blue">${data.total_objects}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Unique Classes</div>
      <div class="stat-value purple">${uniqueClasses}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Avg Confidence</div>
      <div class="stat-value green">${avgConf}%</div>
    </div>
  `;
}

// ── Render Summary Table ──────────────────────────────

function renderSummaryTable(summary, total) {
  if (summary.length === 0) {
    summaryCard.classList.add('hidden');
    return;
  }
  summaryTableBody.innerHTML = '';
  summary.forEach((row, i) => {
    const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td style="font-weight:600;text-transform:capitalize">${row.label}</td>
      <td><span class="count-badge">${row.count}</span></td>
      <td>
        <div class="presence-bar">
          <div class="pbar"><div class="pbar-fill" style="width:${pct}%"></div></div>
          <span class="pbar-pct">${pct}%</span>
        </div>
      </td>
    `;
    summaryTableBody.appendChild(tr);
  });
  summaryCard.classList.remove('hidden');
}

// ── Main Detection Flow ───────────────────────────────

detectBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  // Hide previous results & errors
  hideError();
  resultsSection.classList.add('hidden');
  loadingCard.classList.remove('hidden');
  detectBtn.disabled = true;
  startLoadingAnimation();

  // Scroll to loader
  loadingCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const formData = new FormData();
  formData.append('image', selectedFile);

  try {
    const response = await fetch('/detect', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    stopLoadingAnimation();

    // Small pause so user sees the "done" state
    await new Promise(r => setTimeout(r, 400));
    loadingCard.classList.add('hidden');

    if (!data.success) {
      showError(data.error || 'Detection failed. Please try again.');
      detectBtn.disabled = false;
      return;
    }

    // ── Populate Results ──
    lastDetections = data.detections;

    // Summary text
    const noun = data.total_objects === 1 ? 'object' : 'objects';
    const classes = [...new Set(data.detections.map(d => d.label))];
    resultsSummaryText.textContent = data.total_objects > 0
      ? `Found ${data.total_objects} ${noun} across ${classes.length} class${classes.length > 1 ? 'es' : ''}`
      : 'No objects detected in this image.';

    // Stats
    renderStats(data);

    // Images
    originalImage.src = `/uploads/${data.original_filename}`;
    annotatedImage.src = `/uploads/${data.output_filename}`;

    // Detections list
    renderDetections(data.detections);

    // Filter tabs
    buildFilterTabs(data.summary);

    // Summary table
    renderSummaryTable(data.summary, data.total_objects);

    // Show results
    resultsSection.classList.remove('hidden');
    detectBtn.disabled = false;

    // Scroll to results
    setTimeout(() => {
      resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

  } catch (err) {
    stopLoadingAnimation();
    loadingCard.classList.add('hidden');
    detectBtn.disabled = false;
    showError('Network error: Could not connect to the server. Make sure Flask is running.');
    console.error('Detection error:', err);
  }
});

// ── Reset Button ──────────────────────────────────────

resetBtn.addEventListener('click', () => {
  resetUpload();
  resultsSection.classList.add('hidden');
  hideError();
  lastDetections = [];
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
