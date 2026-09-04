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
const dateText = (value) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00`));
const today = () => new Date().toISOString().slice(0, 10);
const statusText = { todo: "To do", "in-progress": "In progress", done: "Done" };

function render() {
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
    const grade = course.grade === "" || course.grade === undefined ? "—" : `${Number(course.grade).toFixed(1)}%`;
    return `<div class="course-card"><div class="course-icon">${escapeHtml(course.code.slice(0, 2))}</div><div class="course-info"><strong>${escapeHtml(course.name)}</strong><span>${escapeHtml(course.code)}${course.instructor ? ` · ${escapeHtml(course.instructor)}` : ""}</span><div class="progress"><span style="width:${courseAssignments.length ? (done / courseAssignments.length) * 100 : 0}%"></span></div><small>${done}/${courseAssignments.length} assignments complete</small></div><div class="course-grade"><strong>${grade}</strong><button class="icon-button" data-edit-course="${course.id}" aria-label="Edit ${escapeHtml(course.name)}">✎</button><button class="icon-button danger" data-delete-course="${course.id}" aria-label="Delete ${escapeHtml(course.name)}">×</button></div></div>`;
  }).join("");
}

function renderAssignments() {
  const query = $("assignmentSearch").value.trim().toLowerCase();
  const filter = $("assignmentFilter").value;
  const visible = assignments.filter((item) => (!query || item.name.toLowerCase().includes(query) || courseName(item.courseId).toLowerCase().includes(query)) && (filter === "all" || item.status === filter)).sort((a, b) => a.due.localeCompare(b.due));
  $("assignmentCount").textContent = `${visible.length} ${visible.length === 1 ? "item" : "items"}`;
  $("assignmentEmpty").hidden = visible.length > 0;
  $("assignmentList").innerHTML = visible.map((item) => `<div class="assignment-row ${item.status === "done" ? "is-done" : ""}"><button class="check-button ${item.status === "done" ? "checked" : ""}" data-cycle="${item.id}" aria-label="Change status for ${escapeHtml(item.name)}">${item.status === "done" ? "✓" : ""}</button><div class="assignment-main"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(courseName(item.courseId))} · Due ${dateText(item.due)}</span></div><span class="priority priority-${item.priority}">${escapeHtml(item.priority)}</span><span class="status status-${item.status}">${statusText[item.status]}</span><div class="row-actions"><button class="icon-button" data-edit-assignment="${item.id}" aria-label="Edit ${escapeHtml(item.name)}">✎</button><button class="icon-button danger" data-delete-assignment="${item.id}" aria-label="Delete ${escapeHtml(item.name)}">×</button></div></div>`).join("");
}

function renderSummary() {
  const due = new Date(); due.setDate(due.getDate() + 14);
  const upcoming = assignments.filter((item) => item.status !== "done" && item.due >= today() && new Date(`${item.due}T00:00:00`) <= due).length;
  const graded = courses.filter((course) => course.grade !== "" && course.grade !== undefined && Number.isFinite(Number(course.grade)));
  const complete = assignments.filter((item) => item.status === "done").length;
  $("upcomingCount").textContent = upcoming;
  $("courseAverage").textContent = graded.length ? `${(graded.reduce((sum, item) => sum + Number(item.grade), 0) / graded.length).toFixed(1)}%` : "—";
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
  $("courseModalTitle").textContent = course ? "Edit course" : "Add course";
  if (course) { $("courseId").value = course.id; $("courseName").value = course.name; $("courseCode").value = course.code; $("courseInstructor").value = course.instructor || ""; $("courseGrade").value = course.grade ?? ""; }
  openModal("courseModal");
  $("courseName").focus();
}
function openAssignment(item) {
  if (!courses.length) { openCourse(); return; }
  resetForm("assignmentForm");
  $("assignmentModalTitle").textContent = item ? "Edit assignment" : "Add assignment";
  if (item) { $("assignmentId").value = item.id; $("assignmentName").value = item.name; $("assignmentCourse").value = item.courseId; $("assignmentDue").value = item.due; $("assignmentPriority").value = item.priority; $("assignmentStatus").value = item.status; }
  else $("assignmentDue").value = today();
  openModal("assignmentModal");
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
  courses = [...courses, ...additions]; persist(); closeModal("bulkModal"); resetForm("bulkForm"); render();
});
$("assignmentForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const id = $("assignmentId").value;
  const value = { id: id || uid(), name: $("assignmentName").value.trim(), courseId: $("assignmentCourse").value, due: $("assignmentDue").value, priority: $("assignmentPriority").value, status: $("assignmentStatus").value };
  assignments = id ? assignments.map((item) => item.id === id ? value : item) : [...assignments, value];
  persist(); closeModal("assignmentModal"); render();
});

document.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target) return;
  if (target.dataset.close) closeModal(target.dataset.close);
  if (target.id === "addCourseButton" || target.id === "emptyCourseButton") openCourse();
  if (target.id === "bulkCourseButton") { resetForm("bulkForm"); openModal("bulkModal"); $("bulkCourses").focus(); }
  if (target.id === "addAssignmentButton" || target.id === "emptyAssignmentButton") openAssignment();
  if (target.dataset.editCourse) openCourse(courses.find((course) => course.id === target.dataset.editCourse));
  if (target.dataset.deleteCourse) {
    const id = target.dataset.deleteCourse;
    if (confirm("Delete this course and its assignments?")) { courses = courses.filter((course) => course.id !== id); assignments = assignments.filter((item) => item.courseId !== id); persist(); render(); }
  }
  if (target.dataset.editAssignment) openAssignment(assignments.find((item) => item.id === target.dataset.editAssignment));
  if (target.dataset.deleteAssignment) { assignments = assignments.filter((item) => item.id !== target.dataset.deleteAssignment); persist(); render(); }
  if (target.dataset.cycle) { const item = assignments.find((assignment) => assignment.id === target.dataset.cycle); const order = ["todo", "in-progress", "done"]; item.status = order[(order.indexOf(item.status) + 1) % order.length]; persist(); render(); }
});
$("assignmentSearch").addEventListener("input", renderAssignments);
$("assignmentFilter").addEventListener("change", renderAssignments);
document.querySelectorAll(".modal-backdrop").forEach((backdrop) => backdrop.addEventListener("click", (event) => { if (event.target === backdrop) closeModal(backdrop.id); }));
document.addEventListener("keydown", (event) => { if (event.key === "Escape") document.querySelectorAll(".modal-backdrop:not([hidden])").forEach((modal) => closeModal(modal.id)); });
$("todayLabel").textContent = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date());
render();
