// ====== Configuration ======
<<<<<<< HEAD
const API_BASE_URL = "https://mansik-santulan-score-2-qbwh.onrender.com";
=======
const API_BASE_URL = "https://mansik-santulan-score-2-qbwh.onrender.com/";
>>>>>>> f982dd869128342b909f0da941a48738085b6d54
const PREDICT_URL = `${API_BASE_URL}/predict`;

// Assumed upper bound of the score, used ONLY to draw the meter and label.
// Change this to match your dataset's scale (e.g. 10 or 100).
const MAX_SCORE = 10;

// ====== Field definitions (mirrors the `studentdata` Pydantic model) ======
const FIELDS = {
  age:                     { type: "int",   min: 10, max: 100, label: "Age" },
  gender:                  { type: "str",   label: "Gender" },
  country:                 { type: "str",   label: "Country" },
  academic_level:          { type: "str",   label: "Academic level" },
  most_used_platform:      { type: "str",   label: "Most used platform" },
  purpose_of_use:          { type: "str",   label: "Purpose of use" },
  avg_daily_usage_hours:   { type: "float", min: 0, max: 24, label: "Average daily usage" },
  daily_unlocks:           { type: "int",   min: 0, label: "Daily unlocks" },
  study_hours:             { type: "float", min: 0, max: 24, label: "Study hours" },
  physical_activity_hours: { type: "float", min: 0, max: 24, label: "Physical activity hours" },
  sleep_hours_per_night:   { type: "float", min: 0, max: 24, label: "Sleep hours" },
  stress_level:            { type: "str",   label: "Stress level" },
};

// ====== DOM ======
const form = document.getElementById("predict-form");
const submitBtn = document.getElementById("submit-btn");
const resetBtn = document.getElementById("reset-btn");
const spinner = submitBtn.querySelector(".spinner");
const btnLabel = submitBtn.querySelector(".btn-label");
const overlay = document.getElementById("loading-overlay");
const alertBox = document.getElementById("alert");
const resultCard = document.getElementById("result");
const scoreValue = document.getElementById("score-value");
const scoreMax = document.getElementById("score-max");
const meterFill = document.getElementById("meter-fill");
const scoreLabel = document.getElementById("score-label");

// ====== Helpers ======
function setError(name, message) {
  const field = form.elements[name].closest(".field");
  const slot = field.querySelector(".error");
  slot.textContent = message || "";
  field.classList.toggle("invalid", Boolean(message));
}

function clearErrors() {
  Object.keys(FIELDS).forEach((name) => setError(name, ""));
  hideAlert();
}

function showAlert(message, items = []) {
  alertBox.innerHTML = "";
  const p = document.createElement("div");
  p.textContent = message;
  alertBox.appendChild(p);
  if (items.length) {
    const ul = document.createElement("ul");
    items.forEach((t) => {
      const li = document.createElement("li");
      li.textContent = t;
      ul.appendChild(li);
    });
    alertBox.appendChild(ul);
  }
  alertBox.classList.remove("hidden");
  alertBox.scrollIntoView({ behavior: "smooth", block: "center" });
}

function hideAlert() {
  alertBox.classList.add("hidden");
  alertBox.innerHTML = "";
}

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  resetBtn.disabled = isLoading;
  spinner.classList.toggle("hidden", !isLoading);
  btnLabel.textContent = isLoading ? "Predicting..." : "Predict Score";
  overlay.classList.toggle("hidden", !isLoading);
  overlay.setAttribute("aria-hidden", String(!isLoading));
}

// ====== Validation (client side, mirrors backend rules) ======
function collectAndValidate() {
  const payload = {};
  let valid = true;

  for (const [name, rule] of Object.entries(FIELDS)) {
    const raw = form.elements[name].value.trim();

    if (raw === "") {
      setError(name, `${rule.label} is required.`);
      valid = false;
      continue;
    }

    if (rule.type === "str") {
      payload[name] = raw;
      continue;
    }

    const num = Number(raw);
    if (Number.isNaN(num)) {
      setError(name, "Enter a valid number.");
      valid = false;
      continue;
    }
    if (rule.type === "int" && !Number.isInteger(num)) {
      setError(name, "Enter a whole number.");
      valid = false;
      continue;
    }
    if (rule.min !== undefined && num < rule.min) {
      setError(name, `Must be at least ${rule.min}.`);
      valid = false;
      continue;
    }
    if (rule.max !== undefined && num > rule.max) {
      setError(name, `Must be at most ${rule.max}.`);
      valid = false;
      continue;
    }
    payload[name] = num;
  }

  return valid ? payload : null;
}

// ====== Result rendering ======
function describeScore(score) {
  const ratio = score / MAX_SCORE;
  if (ratio >= 0.75) return { text: "Excellent mental well-being", color: "linear-gradient(90deg,#34d399,#10b981)" };
  if (ratio >= 0.5)  return { text: "Good mental well-being",      color: "linear-gradient(90deg,#38bdf8,#34d399)" };
  if (ratio >= 0.25) return { text: "Moderate — room for improvement", color: "linear-gradient(90deg,#fbbf24,#f59e0b)" };
  return { text: "Low — consider seeking support", color: "linear-gradient(90deg,#ff6b81,#f43f5e)" };
}

function animateNumber(el, target, duration = 900) {
  const start = performance.now();
  function frame(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = (target * eased).toFixed(2);
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function showResult(score) {
  const { text, color } = describeScore(score);
  resultCard.classList.remove("hidden");
  // restart the entrance animation on repeat predictions
  resultCard.style.animation = "none";
  void resultCard.offsetHeight;
  resultCard.style.animation = "";

  scoreMax.textContent = `/ ${MAX_SCORE}`;
  scoreLabel.textContent = text;
  meterFill.style.background = color;
  meterFill.style.width = "0%";
  animateNumber(scoreValue, score);
  requestAnimationFrame(() => {
    meterFill.style.width = `${Math.max(0, Math.min(100, (score / MAX_SCORE) * 100))}%`;
  });
  resultCard.scrollIntoView({ behavior: "smooth", block: "center" });
}

// ====== Backend error handling (FastAPI 422 + others) ======
function applyBackendValidation(detail) {
  const messages = [];
  detail.forEach((err) => {
    const loc = Array.isArray(err.loc) ? err.loc : [];
    const fieldName = loc[loc.length - 1];
    const msg = err.msg || "Invalid value";
    if (FIELDS[fieldName]) {
      setError(fieldName, msg);
    } else {
      messages.push(`${loc.join(" → ")}: ${msg}`);
    }
  });
  showAlert("Some inputs were rejected by the server. Please review the highlighted fields.", messages);
}

// ====== Submit ======
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearErrors();
  resultCard.classList.add("hidden");

  const payload = collectAndValidate();
  if (!payload) {
    showAlert("Please fix the highlighted fields and try again.");
    return;
  }

  setLoading(true);
  try {
    const response = await fetch(PREDICT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });

    let data = null;
    try { data = await response.json(); } catch (_) { /* non-JSON body */ }

    if (!response.ok) {
      if (response.status === 422 && data && Array.isArray(data.detail)) {
        applyBackendValidation(data.detail);
      } else if (data && typeof data.detail === "string") {
        showAlert(`Server error (${response.status}): ${data.detail}`);
      } else {
        showAlert(`Server error (${response.status}). Please try again.`);
      }
      return;
    }

    const score = data && Number(data.prediction_mental_health_score);
    if (score === null || Number.isNaN(score)) {
      showAlert("The server returned an unexpected response.");
      return;
    }
    showResult(score);
  } catch (err) {
    showAlert(`Could not reach the backend at ${API_BASE_URL}. Make sure the FastAPI server is running on port 8000.`);
  } finally {
    setLoading(false);
  }
});

// ====== Reset & live error clearing ======
resetBtn.addEventListener("click", () => {
  form.reset();
  clearErrors();
  resultCard.classList.add("hidden");
});

form.addEventListener("input", (e) => {
  const name = e.target.name;
  if (FIELDS[name]) setError(name, "");
});
