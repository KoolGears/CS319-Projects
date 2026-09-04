const COURSE_KEY = "studyplan-courses";
const ASSIGNMENT_KEY = "studyplan-assignments";
const $ = (id) => document.getElementById(id);
const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
function load(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : [];
  } catch (error) {
    console.warn(`Unable to load ${key}.`, error);
    return [];
  }
}
let courses = load(COURSE_KEY);
let assignments = load(ASSIGNMENT_KEY);
const persist = () => {
  localStorage.setItem(COURSE_KEY, JSON.stringify(courses));
  localStorage.setItem(ASSIGNMENT_KEY, JSON.stringify(assignments));
};
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
const dateText = (value) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value.length === 10 ? `${value}T00:00:00` : value));
const localDateTime = () => {
  const now = new Date();
  const pad = (number) => String(number).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
};
const priorityRank = { high: 0, medium: 1, low: 2 };
const dueDay = (value) => value.slice(0, 10);
const isOverdue = (item) => item.status !== "done" && new Date(item.due.length === 10 ? `${item.due}T23:59:59` : item.due) < new Date();
function markOverdueAssignments() {
  let changed = false;
  assignments = assignments.map((item) => {
    if (!item.overdueRecorded && isOverdue(item)) {
      changed = true;
      return { ...item, grade: "0", overdueRecorded: true };
    }
    return item;
  });
  if (changed) persist();
}
const statusText = { todo: "To do", "in-progress": "In progress", done: "Done" };


function render() {
  markOverdueAssignments();
  renderCourses();
  renderAssignments();
  renderSummary();
  updateCourseOptions();
}

function renderCourses() {
  const list = $("courseList");
  $("courseEmpty").hidden = courses.length > 0;
  list.innerHTML = courses.map((course) => {
    const courseAssignments = assignments.filter((item) => item.courseId === course.id);
    const done = courseAssignments.filter((item) => item.status === "done").length;
    const grade = getCourseGrade(course);
    return `<div class="course-card"><div class="course-icon">${escapeHtml(course.code.slice(0, 2))}</div><div class="course-info"><strong>${escapeHtml(course.name)}</strong><span>${escapeHtml(course.code)}${course.instructor ? ` · ${escapeHtml(course.instructor)}` : ""}</span><div class="progress"><span style="width:${courseAssignments.length ? (done / courseAssignments.length) * 100 : 0}%"></span></div><small>${done}/${courseAssignments.length} assignments complete</small></div><div class="course-grade"><strong>${grade}</strong><button class="icon-button" data-edit-course="${course.id}" aria-label="Edit ${escapeHtml(course.name)}">✎</button><button class="icon-button danger" data-delete-course="${course.id}" aria-label="Delete ${escapeHtml(course.name)}">×</button></div></div>`;
  }).join("");
}

function getCourseGrade(course) {
  const gradedAssignments = assignments
    .filter((item) => item.courseId === course.id && item.grade !== "" && item.grade !== undefined && Number.isFinite(Number(item.grade)))
    .map((item) => Number(item.grade));
  if (gradedAssignments.length) {
    return `${(gradedAssignments.reduce((sum, grade) => sum + grade, 0) / gradedAssignments.length).toFixed(1)}%`;
  }
  return course.grade === "" || course.grade === undefined ? "—" : `${Number(course.grade).toFixed(1)}%`;
}

function renderAssignments() {
  const query = $("assignmentSearch").value.trim().toLowerCase();
  const filter = $("assignmentFilter").value;
  const visible = assignments.filter((item) => (!query || item.name.toLowerCase().includes(query) || courseName(item.courseId).toLowerCase().includes(query)) && (filter === "all" || item.status === filter)).sort((a, b) => {
    const dayDifference = dueDay(a.due).localeCompare(dueDay(b.due));
    return dayDifference || priorityRank[a.priority] - priorityRank[b.priority] || new Date(a.due) - new Date(b.due);
  });
  $("assignmentCount").textContent = `${visible.length} ${visible.length === 1 ? "item" : "items"}`;
  $("assignmentEmpty").hidden = visible.length > 0;
  $("assignmentList").innerHTML = visible.map((item) => {
    const overdue = isOverdue(item);
    const grade = item.status === "done" && item.grade !== "" && item.grade !== undefined ? ` · Grade ${Number(item.grade).toFixed(1)}%` : "";
    return `<div class="assignment-row ${item.status === "done" ? "is-done" : ""} ${overdue ? "is-overdue" : ""}"><button class="check-button ${item.status === "done" ? "checked" : ""}" data-cycle="${item.id}" aria-label="Change status for ${escapeHtml(item.name)}">${item.status === "done" ? "✓" : ""}</button><div class="assignment-main"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(courseName(item.courseId))} · Due ${dateText(item.due)}${grade}</span></div><span class="priority priority-${item.priority}">${escapeHtml(item.priority)}</span><span class="status ${overdue ? "status-overdue" : `status-${item.status}`}">${overdue ? "Overdue" : statusText[item.status]}</span><div class="row-actions"><button class="icon-button" data-edit-assignment="${item.id}" aria-label="Edit ${escapeHtml(item.name)}">✎</button><button class="icon-button danger" data-delete-assignment="${item.id}" aria-label="Delete ${escapeHtml(item.name)}">×</button></div></div>`;
  }).join("");
}

function renderSummary() {
  const now = new Date();
  const due = new Date(now); due.setDate(due.getDate() + 14);
  const upcoming = assignments.filter((item) => item.status !== "done" && !isOverdue(item) && new Date(item.due) <= due).length;
  const overdue = assignments.filter(isOverdue).length;
  const graded = courses.map((course) => {
    const gradeText = getCourseGrade(course);
    return gradeText === "—" ? null : Number.parseFloat(gradeText);
  }).filter((grade) => Number.isFinite(grade));
  const complete = assignments.filter((item) => item.status === "done").length;
  $("upcomingCount").textContent = upcoming;
  $("overdueCount").textContent = overdue;
  $("courseAverage").textContent = graded.length ? `${(graded.reduce((sum, grade) => sum + grade, 0) / graded.length).toFixed(1)}%` : "—";
  $("completedCount").textContent = `${assignments.length ? Math.round((complete / assignments.length) * 100) : 0}%`;
  $("completedNote").textContent = `${complete} of ${assignments.length} assignments`;
}

function courseName(id) { return courses.find((course) => course.id === id)?.name || "Unknown course"; }
function updateCourseOptions() { $("assignmentCourse").innerHTML = courses.map((course) => `<option value="${course.id}">${escapeHtml(course.code)} — ${escapeHtml(course.name)}</option>`).join(""); }
function openModal(id) { $(id).hidden = false; document.body.classList.add("modal-open"); }
function closeModal(id) { $(id).hidden = true; document.body.classList.remove("modal-open"); }
function resetForm(formId) { $(formId).reset(); $(formId).querySelectorAll("input[type=hidden]").forEach((input) => { input.value = ""; }); }

function openCourse(course) {
  resetForm("courseForm");
  resetForm("bulkForm");
  setCourseMode(false);
  $("courseModalTitle").textContent = course ? "Edit course" : "Add course";
  if (course) { $("courseId").value = course.id; $("courseName").value = course.name; $("courseCode").value = course.code; $("courseInstructor").value = course.instructor || ""; $("courseGrade").value = course.grade ?? ""; }
  openModal("courseModal");
  $("courseName").focus();
}
function setCourseMode(isBulk) {
  $("courseForm").hidden = isBulk;
  $("bulkForm").hidden = !isBulk;
  $("courseModeToggle").textContent = isBulk ? "← Add one course instead" : "＋ Add several courses instead";
  $("courseModeToggle").setAttribute("aria-pressed", String(isBulk));
}
function openAssignment(item) {
  if (!courses.length) { openCourse(); return; }
  resetForm("assignmentForm");
  $("assignmentModalTitle").textContent = item ? "Edit assignment" : "Add assignment";
  if (item) { $("assignmentId").value = item.id; $("assignmentName").value = item.name; $("assignmentCourse").value = item.courseId; $("assignmentDue").value = item.due.length === 10 ? `${item.due}T23:59` : item.due; $("assignmentPriority").value = item.priority; $("assignmentStatus").value = item.status; $("assignmentGrade").value = item.grade ?? ""; }
  else $("assignmentDue").value = localDateTime();
  $("assignmentGrade").disabled = $("assignmentStatus").value !== "done";
  openModal("assignmentModal");
}
function openBulkGradeModal() {
  const gradeable = assignments.filter((item) => item.status === "done" || isOverdue(item));
  $("bulkGradeList").innerHTML = gradeable.length ? gradeable.map((item) => {
    const overdue = isOverdue(item);
    const grade = overdue ? 0 : item.grade ?? "";
    return `<label class="bulk-grade-row"><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(courseName(item.courseId))} · ${overdue ? "Overdue" : "Completed"}</small></span><input type="number" min="0" max="100" step="0.1" value="${grade}" ${overdue ? "disabled" : ""} data-grade-id="${item.id}" aria-label="Grade for ${escapeHtml(item.name)}"></label>`;
  }).join("") : '<p class="empty-state">There are no completed or overdue assignments to grade.</p>';
  openModal("bulkGradeModal");
}

$("courseForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const id = $("courseId").value;
  const value = { id: id || uid(), name: $("courseName").value.trim(), code: $("courseCode").value.trim(), instructor: $("courseInstructor").value.trim(), grade: $("courseGrade").value };
  courses = id ? courses.map((course) => course.id === id ? value : course) : [...courses, value];
  persist(); closeModal("courseModal"); render();
});
$("bulkForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const additions = $("bulkCourses").value.split("\n").map((line) => line.split("|").map((part) => part.trim())).filter((parts) => parts[0] && parts[1]).map(([name, code, instructor]) => ({ id: uid(), name, code, instructor: instructor || "", grade: "" }));
  if (!additions.length) return;
  courses = [...courses, ...additions]; persist(); closeModal("courseModal"); resetForm("bulkForm"); render();
});
$("assignmentForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const id = $("assignmentId").value;
  const existing = assignments.find((item) => item.id === id);
  const wasOverdue = Boolean(existing?.overdueRecorded) || (existing ? isOverdue(existing) : isOverdue({ due: $("assignmentDue").value, status: $("assignmentStatus").value }));
  const value = { id: id || uid(), name: $("assignmentName").value.trim(), courseId: $("assignmentCourse").value, due: $("assignmentDue").value, priority: $("assignmentPriority").value, status: $("assignmentStatus").value, grade: wasOverdue ? "0" : $("assignmentStatus").value === "done" ? $("assignmentGrade").value : "", overdueRecorded: wasOverdue };
  assignments = id ? assignments.map((item) => item.id === id ? value : item) : [...assignments, value];
  persist(); closeModal("assignmentModal"); render();
});
$("bulkGradeForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const grades = new Map([...$("bulkGradeList").querySelectorAll("[data-grade-id]")].map((input) => [input.dataset.gradeId, input.disabled ? 0 : input.value]));
  assignments = assignments.map((item) => grades.has(item.id) ? { ...item, grade: grades.get(item.id) } : item);
  persist(); closeModal("bulkGradeModal"); render();
});

document.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target) return;
  if (target.dataset.close) closeModal(target.dataset.close);
  if (target.id === "addCourseButton" || target.id === "emptyCourseButton") openCourse();
  if (target.id === "courseModeToggle") { setCourseMode(target.getAttribute("aria-pressed") !== "true"); if (!$("bulkForm").hidden) $("bulkCourses").focus(); }
  if (target.id === "addAssignmentButton" || target.id === "emptyAssignmentButton") openAssignment();
  if (target.id === "bulkGradeButton") openBulkGradeModal();
  if (target.dataset.editCourse) openCourse(courses.find((course) => course.id === target.dataset.editCourse));
  if (target.dataset.deleteCourse) {
    const id = target.dataset.deleteCourse;
    if (confirm("Delete this course and its assignments?")) { courses = courses.filter((course) => course.id !== id); assignments = assignments.filter((item) => item.courseId !== id); persist(); render(); }
  }
  if (target.dataset.editAssignment) openAssignment(assignments.find((item) => item.id === target.dataset.editAssignment));
  if (target.dataset.deleteAssignment) { assignments = assignments.filter((item) => item.id !== target.dataset.deleteAssignment); persist(); render(); }
  if (target.dataset.cycle) { const item = assignments.find((assignment) => assignment.id === target.dataset.cycle); const order = ["todo", "in-progress", "done"]; if (isOverdue(item)) { item.grade = "0"; item.overdueRecorded = true; } item.status = order[(order.indexOf(item.status) + 1) % order.length]; persist(); render(); }
});
$("assignmentSearch").addEventListener("input", renderAssignments);
$("assignmentFilter").addEventListener("change", renderAssignments);
$("assignmentStatus").addEventListener("change", () => { $("assignmentGrade").disabled = $("assignmentStatus").value !== "done"; });
document.querySelectorAll(".modal-backdrop").forEach((backdrop) => backdrop.addEventListener("click", (event) => { if (event.target === backdrop) closeModal(backdrop.id); }));
document.addEventListener("keydown", (event) => { if (event.key === "Escape") document.querySelectorAll(".modal-backdrop:not([hidden])").forEach((modal) => closeModal(modal.id)); });
$("todayLabel").textContent = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date());
render();
