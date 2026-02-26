/* =========================================================
   workflow-checklist.js
   - 전 페이지 공통: 체크리스트 로컬 저장 + 인쇄/PDF
   - 요구사항:
     1) 모든 페이지에 업무 흐름 체크리스트 포함
     2) 체크리스트는 PDF 출력 가능(브라우저 인쇄)
   ========================================================= */

(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const pad2 = (n) => String(n).padStart(2, "0");

  function formatKDate(d) {
    const yyyy = d.getFullYear();
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    return `${yyyy}.${mm}.${dd}`;
  }

  function getChecklistRoot() {
    return $("#workflowChecklistSection") || $('[data-workflow-checklist-root]');
  }

  function getStorageKey(root) {
    const scope = (root && root.dataset && root.dataset.checklistScope) ? root.dataset.checklistScope : location.pathname;
    const version = (root && root.dataset && root.dataset.checklistVersion) ? root.dataset.checklistVersion : "v1";
    return `workflow_checklist:${version}:${scope}`;
  }

  function loadState(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  function saveState(key, state) {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // 시크릿 모드/정책 제한 등: 저장 실패해도 페이지는 동작해야 함
    }
  }

  function initTodayText() {
    const today = formatKDate(new Date());
    $$("[data-today-text]").forEach((el) => (el.textContent = today));
  }

  function initChecklist(root) {
    if (!root) return;

    const key = getStorageKey(root);
    const state = loadState(key);

    const checkboxes = $$('input[type="checkbox"]', root);

    checkboxes.forEach((cb) => {
      if (!cb.id) return; // id 없으면 저장 키를 만들기 애매하니, 강제는 하지 않음
      cb.checked = Boolean(state[cb.id]);

      cb.addEventListener("change", () => {
        state[cb.id] = cb.checked;
        saveState(key, state);
      });
    });
  }

  function setAllDetailsOpen(root, open) {
    if (!root) return [];
    const details = $$("details", root);
    const prev = details.map((d) => d.open);
    details.forEach((d) => (d.open = Boolean(open)));
    return prev;
  }

  function restoreDetailsOpen(root, prev) {
    if (!root || !Array.isArray(prev)) return;
    const details = $$("details", root);
    details.forEach((d, i) => {
      if (typeof prev[i] === "boolean") d.open = prev[i];
    });
  }

  function printPage() {
    window.print();
  }

  function printChecklistOnly() {
    const root = getChecklistRoot();
    if (!root) return window.print();

    // 인쇄 시 접힌 detail은 내용이 빠지기 쉬우니, 체크리스트 섹션 안의 detail을 모두 펼쳐서 인쇄
    const prev = setAllDetailsOpen(root, true);

    document.body.classList.add("print-checklist-only");

    const cleanup = () => {
      document.body.classList.remove("print-checklist-only");
      restoreDetailsOpen(root, prev);
    };

    // afterprint는 일부 환경에서 불안정할 수 있어, 이벤트 + 타임아웃 둘 다 걸어둠
    const onAfterPrint = () => {
      window.removeEventListener("afterprint", onAfterPrint);
      cleanup();
    };
    window.addEventListener("afterprint", onAfterPrint);

    window.print();

    // fallback: afterprint가 안 뜨는 환경 대비
    setTimeout(() => {
      cleanup();
      window.removeEventListener("afterprint", onAfterPrint);
    }, 800);
  }

  function resetChecklist() {
    const root = getChecklistRoot();
    if (!root) return;

    const key = getStorageKey(root);
    const checkboxes = $$('input[type="checkbox"]', root);

    checkboxes.forEach((cb) => (cb.checked = false));
    saveState(key, {});
    alert("체크리스트를 초기화했습니다.");
  }

  function initActionButtons() {
    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-action]");
      if (!el) return;

      const action = el.getAttribute("data-action");
      if (!action) return;

      // a 태그에도 붙일 수 있으니 기본 동작 막기
      e.preventDefault();

      if (action === "print-page") return printPage();
      if (action === "print-checklist") return printChecklistOnly();
      if (action === "reset-checklist") return resetChecklist();
    });
  }

  // 맨 위로 버튼(있으면 자동 연결)
  function initToTopButton() {
    const btn = $("#btnToTop");
    if (!btn) return;

    const toggle = () => {
      btn.style.display = window.scrollY > 500 ? "block" : "none";
    };

    window.addEventListener("scroll", toggle, { passive: true });
    toggle();

    btn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  window.addEventListener("DOMContentLoaded", () => {
    initTodayText();
    initChecklist(getChecklistRoot());
    initActionButtons();
    initToTopButton();
  });
})();
