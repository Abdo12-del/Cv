/* ==========================================================================
   Personal space — data-driven UI
   - محتوى واحد في data/content.json (لا نصوص مطبوعة في القوالب)
   - تشغيل بلا أدوات بناء: وحدات ES أصلية
   ========================================================================== */

const DATA_URL = "data/content.json";

const state = {
  data: null,
  filter: "all",
  order: [],
  index: -1,
  opener: null,
  type: null,
};

const el = (sel, root = document) => root.querySelector(sel);
const els = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const esc = (value = "") =>
  String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

const byId = (id) => document.getElementById(id);

/* ---------------------------------------------------------------- covers -- */
function titleBucket(text) {
  const n = String(text).replace(/\s+/g, " ").trim().length;
  if (n <= 20) return "s";
  if (n <= 38) return "m";
  return "l";
}

function coverHTML({ title, label, note = "", tone = "paper", motif = "arcs", layout = "stack", index = "", wide = false, heading = true }) {
  const cls = ["cover", `tone--${tone}`, `cover--${layout}`];
  if (wide) cls.push("cover--wide");
  const titleEl = !title
    ? ""
    : heading
      ? `<h3 class="cover-title">${esc(title)}</h3>`
      : `<p class="cover-title">${esc(title)}</p>`;

  const noteEl = note ? `<p class="cover-note">${esc(note)}</p>` : "";

  return `
    <div class="${cls.join(" ")}" data-motif="${esc(motif)}" data-len="${titleBucket(title || "")}">
      <div class="cover-art" aria-hidden="true"></div>
      <div class="cover-inner">
        <span class="cover-label">${esc(label)}</span>
        ${titleEl}
        ${noteEl}
        <span class="cover-index" aria-hidden="true">${esc(index)}</span>
      </div>
    </div>`;
}

/* ---------------------------------------------------------------- render -- */
function bindText(data) {
  const map = {
    name: data.profile.name,
    monogram: data.profile.monogram,
    headline: data.profile.headline,
    bio: data.profile.bio,
    shortBio: data.profile.shortBio,
    rolesLine: data.profile.rolesLine,
    note: data.profile.note,
    brandSub: (() => {
      const roles = data.profile.rolesLine
        .split("·")
        .map((r) => r.trim())
        .filter((r) => r && !/NG/i.test(r));
      if (roles.length <= 2) return roles.join(" · ");
      return `${roles[0]} · ${roles[roles.length - 1]}`;
    })(),
    feedTitle: data.ui.feedTitle,
    feedIntro: data.ui.feedIntro,
    projectsTitle: data.ui.projectsTitle,
    projectsIntro: data.ui.projectsIntro,
    philosophyTitle: data.ui.philosophyTitle,
    philosophyIntro: data.philosophy.intro,
    writingTitle: data.ui.writingTitle,
    aboutTitle: data.ui.aboutTitle,
    emptyState: data.ui.emptyState,
  };

  els("[data-bind]").forEach((node) => {
    const key = node.dataset.bind;
    if (key in map && map[key]) node.textContent = map[key];
  });

  document.title = `${data.profile.name} — معلّم، مؤسّس، وكاتب`;
}

function renderProfileLinks(data) {
  const wrap = byId("profile-links");
  if (!wrap) return;

  wrap.innerHTML = data.profile.links
    .map((link) => {
      if (link.href) {
        return `<li>
          <a class="link-chip" href="${esc(link.href)}" rel="me noopener" target="_blank">
            <span class="placeholder-dot" aria-hidden="true"></span>${esc(link.label)}
          </a>
        </li>`;
      }
      return `<li>
        <span class="link-chip is-placeholder" title="رابط تجريبي — يُضاف من ملف البيانات">
          <span class="placeholder-dot" aria-hidden="true"></span>${esc(link.label)}
        </span>
      </li>`;
    })
    .join("");
}

function countByCategory(data) {
  const counts = { all: data.posts.length };
  data.categories.forEach((c) => {
    if (c.id !== "all") counts[c.id] = data.posts.filter((p) => p.category === c.id).length;
  });
  return counts;
}

function renderFilters(data) {
  const wrap = byId("filters");
  const counts = countByCategory(data);

  wrap.innerHTML = data.categories
    .map(
      (cat, i) => `
      <button class="hl" type="button" data-filter="${esc(cat.id)}"
        aria-pressed="${cat.id === state.filter}" aria-label="${esc(cat.label)} — ${counts[cat.id] || 0} عنصر">
        <span class="hl-circle" aria-hidden="true">${counts[cat.id] || 0}</span>
        <span class="hl-label">${esc(cat.label)}</span>
      </button>`
    )
    .join("");

  wrap.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-filter]");
    if (!btn) return;
    setFilter(btn.dataset.filter);
  });
}

function orderedPosts(data) {
  return [...data.posts].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));
}

function renderFeed(data) {
  const grid = byId("feed-grid");
  const posts = orderedPosts(data);

  grid.innerHTML = posts
    .map((post, i) => {
      const cat = data.categories.find((c) => c.id === post.category);
      const pinned = post.pinned ? '<span class="tag tag--pin">مثبّت</span>' : "";
      const pending = post.status === "قيد الإعداد" ? '<span class="tag tag--pending">قيد الإعداد</span>' : "";

      return `
      <article class="card reveal" data-category="${esc(post.category)}" style="--d:${(i % 3) * 55}ms">
        <a class="card-hit" href="#/post/${esc(post.slug)}" data-open="post" data-slug="${esc(post.slug)}"
           aria-label="${esc(post.title)} — ${esc(post.format)}">
          ${coverHTML({
            title: post.title,
            label: `${cat ? cat.label : ""} · ${post.format}`,
            tone: post.cover.tone,
            motif: post.cover.motif,
            layout: post.cover.layout,
            index: post.id.replace("P", ""),
            heading: true,
          })}
          <span class="card-meta">
            <span class="card-tags">
              ${pinned}
              <span class="tag">${esc(post.format)}</span>
              <span class="tag tag--ghost">${esc(post.axis)}</span>
              ${pending}
            </span>
            <span class="card-arrow" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9">
                <path d="M17 17 7 7M7 7h7M7 7v7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </span>
          </span>
        </a>
      </article>`;
    })
    .join("");

  grid.addEventListener("click", (event) => {
    const link = event.target.closest("[data-open]");
    if (!link) return;
    event.preventDefault();
    openItem("post", link.dataset.slug, link);
  });
}

function renderProjects(data) {
  const wrap = byId("project-list");

  wrap.innerHTML = data.projects
    .map((project, i) => {
      const number = String(i + 1).padStart(2, "0");
      const tones = ["navy", "paper", "royal"];
      const motifs = ["frame", "dots", "lines"];
      const layouts = ["corner", "split", "center"];

      return `
      <article class="project reveal" style="--d:${i * 70}ms">
        <div class="project-media">
          ${coverHTML({
            title: "",
            label: project.role,
            note: project.scope,
            tone: tones[i % tones.length],
            motif: motifs[i % motifs.length],
            layout: layouts[i % layouts.length],
            index: number,
          })}
        </div>

        <div class="project-body">
          <p class="project-index">مشروع ${number}</p>
          <h3>${esc(project.title)}</h3>
          <p class="project-summary">${esc(project.summary)}</p>

          <dl class="project-meta">
            <div><dt>الدور</dt><dd>${esc(project.role)}</dd></div>
            <div><dt>المدى</dt><dd>${esc(project.period)}</dd></div>
            <div><dt>الحالة</dt><dd>${esc(project.status)}</dd></div>
          </dl>

          <div class="project-foot">
            <button class="link-btn" type="button" data-open="project" data-slug="${esc(project.slug)}">
              عرض المشروع
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true">
                <path d="M19 12H5m6-6-6 6 6 6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <span class="tag tag--ghost">${esc(project.scope.split("·")[0].trim())}</span>
          </div>
        </div>
      </article>`;
    })
    .join("");

  wrap.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-open]");
    if (!btn) return;
    openItem("project", btn.dataset.slug, btn);
  });
}

function renderPhilosophy(data) {
  const list = byId("principles");
  list.innerHTML = data.philosophy.principles
    .map(
      (p) => `
      <li class="principle reveal">
        <span class="principle-n" aria-hidden="true">${esc(p.n)}</span>
        <div>
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.body)}</p>
        </div>
      </li>`
    )
    .join("");

  const pillars = byId("pillars");
  pillars.innerHTML = data.philosophy.pillars
    .map(
      (p) => `
      <div class="pillar">
        <h4>${esc(p.t)}</h4>
        <p>${esc(p.d)}</p>
      </div>`
    )
    .join("");
}

function renderWriting(data) {
  const wrap = byId("writing-list");
  wrap.innerHTML = data.writing
    .map(
      (w, i) => `
      <article class="writing-item reveal" style="--d:${i * 60}ms">
        <h3>${esc(w.title)}</h3>
        <p class="writing-excerpt">${esc(w.excerpt)}</p>
        <span class="writing-type">${esc(w.type)}</span>
      </article>`
    )
    .join("");
}

function renderTimeline(data) {
  const wrap = byId("timeline");
  wrap.innerHTML = data.timeline
    .map(
      (t, i) => `
      <li class="timeline-item reveal" style="--d:${i * 60}ms">
        <p class="timeline-phase">${esc(t.phase)}</p>
        <h3>${esc(t.title)}</h3>
        <p>${esc(t.body)}</p>
      </li>`
    )
    .join("");
}

function renderContact(data) {
  const wrap = byId("contact-links");
  wrap.innerHTML = data.profile.links
    .map((link) => {
      const icon = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
        <path d="M7 17 17 7M9 7h8v8" stroke-linecap="round" stroke-linejoin="round" /></svg>`;

      if (link.href) {
        return `<li><a href="${esc(link.href)}" target="_blank" rel="me noopener">${esc(link.label)} ${icon}</a></li>`;
      }
      return `<li><span class="is-placeholder" title="يُضاف من ملف البيانات">${esc(link.label)} · قريبًا</span></li>`;
    })
    .join("");
}

/* --------------------------------------------------------------- filters -- */
function setFilter(filterId) {
  state.filter = filterId;

  els("#filters [data-filter]").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.filter === filterId));
  });

  const cards = els("#feed-grid .card");
  let visible = 0;

  cards.forEach((card) => {
    const show = filterId === "all" || card.dataset.category === filterId;
    card.classList.toggle("is-hidden", !show);
    if (show) visible += 1;
  });

  const empty = byId("empty-state");
  if (empty) empty.hidden = visible !== 0;
}

/* ------------------------------------------------------------------ sheet -- */
function sheetNavList() {
  const { data, filter } = state;
  if (!data) return [];
  return data.posts
    .filter((p) => filter === "all" || p.category === filter)
    .map((p) => ({ type: "post", slug: p.slug, title: p.title }));
}

function postMarkup(data, post) {
  const cat = data.categories.find((c) => c.id === post.category);

  return `
    <div class="sheet-cover">
      ${coverHTML({
        title: "",
        label: `${cat ? cat.label : ""} · ${post.format}`,
        tone: post.cover.tone,
        motif: post.cover.motif,
        layout: post.cover.layout,
        index: post.id.replace("P", ""),
        wide: true,
      })}
    </div>

    <div class="sheet-head">
      <div class="tag-row">
        <span class="tag">${esc(post.format)}</span>
        <span class="tag tag--ghost">${esc(post.axis)}</span>
        <span class="tag tag--ghost">${esc(post.status)}</span>
      </div>
      <h2 id="sheet-title">${esc(post.title)}</h2>
      <p class="sheet-dek">${esc(post.dek)}</p>
    </div>

    <dl class="sheet-meta">
      <div><dt>التصنيف</dt><dd>${esc(cat ? cat.label : "")}</dd></div>
      <div><dt>الصيغة</dt><dd>${esc(post.format)}</dd></div>
      <div><dt>المحور</dt><dd>${esc(post.axis)}</dd></div>
      <div><dt>الحالة</dt><dd>${esc(post.status)}</dd></div>
    </dl>

    <div class="prose">
      ${post.sections.map((s) => `<h3>${esc(s.h)}</h3><p>${esc(s.p)}</p>`).join("")}
    </div>

    ${post.quote ? `<blockquote class="pull">${esc(post.quote)}</blockquote>` : ""}

    <p class="sheet-note">
      <strong>ملاحظة:</strong> هذا نصّ تجريبي مكتوب لاختبار النظام البصري، وليس منشورًا حقيقيًا منشورًا على حساب.
      يمكن استبداله بالكامل من <span dir="ltr">data/content.json</span> دون تعديل الكود.
    </p>

    <div class="sheet-foot">
      ${relatedButton(data, post)}
      <span class="sheet-hint">${esc(data.ui.dialogHint)}</span>
    </div>`;
}

function relatedButton(data, post) {
  if (!post.relatedProject) {
    return `<span>${esc(post.id)} · ${esc(post.axis)}</span>`;
  }
  const project = data.projects.find((p) => p.slug === post.relatedProject);
  if (!project) return `<span>${esc(post.id)} · ${esc(post.axis)}</span>`;

  return `<button class="link-btn" type="button" data-open-project="${esc(project.slug)}">
      المشروع المرتبط: ${esc(project.shortTitle || project.title)}
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true">
        <path d="M19 12H5m6-6-6 6 6 6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>`;
}

function projectMarkup(data, project) {
  const idx = data.projects.findIndex((p) => p.slug === project.slug);
  const num = String(idx + 1).padStart(2, "0");
  const tones = ["navy", "paper", "royal"];
  const motifs = ["frame", "dots", "lines"];
  const layouts = ["corner", "split", "center"];

  return `
    <div class="sheet-cover">
      ${coverHTML({
        title: "",
        label: project.role,
        note: project.scope,
        tone: tones[idx % tones.length],
        motif: motifs[idx % motifs.length],
        layout: layouts[idx % layouts.length],
        index: num,
        wide: true,
      })}
    </div>

    <div class="sheet-head">
      <div class="tag-row">
        <span class="tag">${esc(project.role)}</span>
        <span class="tag tag--ghost">${esc(project.period)}</span>
        <span class="tag tag--pending">${esc(project.status)}</span>
      </div>
      <h2 id="sheet-title">${esc(project.title)}</h2>
      <p class="sheet-dek">${esc(project.summary)}</p>
    </div>

    <dl class="sheet-meta">
      <div><dt>الدور</dt><dd>${esc(project.role)}</dd></div>
      <div><dt>الفترة</dt><dd>${esc(project.period)}</dd></div>
      <div><dt>الحالة</dt><dd>${esc(project.status)}</dd></div>
      <div><dt>النطاق</dt><dd>${esc(project.scope)}</dd></div>
    </dl>

    <div class="prose">
      <h3>التحدّي</h3>
      <p>${esc(project.challenge)}</p>
      <h3>المقاربة</h3>
      <ul class="approach">
        ${project.approach.map((a) => `<li>${esc(a)}</li>`).join("")}
      </ul>
      <h3>النتيجة</h3>
      <p>${esc(project.outcome)}</p>
    </div>

    <p class="sheet-note">
      ${project.separation ? "<strong>فصل الهويات:</strong> " : ""}${esc(project.note)}
    </p>

    <div class="sheet-foot">
      <span>مشروع ${num} من ${data.projects.length}</span>
      <span class="sheet-hint">Esc للإغلاق</span>
    </div>`;
}

function showSheet(dialog) {
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function hideSheet(dialog) {
  if (typeof dialog.close === "function") dialog.close();
  else {
    dialog.removeAttribute("open");
    dialog.dispatchEvent(new Event("close"));
  }
}

function setSheetNavState() {
  const list = sheetNavList();
  const prev = el('[data-nav="prev"]');
  const next = el('[data-nav="next"]');

  if (state.type !== "post" || state.index < 0 || !list.length) {
    prev.disabled = true;
    next.disabled = true;
    return;
  }

  prev.disabled = state.index <= 0;
  next.disabled = state.index >= list.length - 1;
}

function openItem(type, slug, opener) {
  const { data } = state;
  if (!data) return;

  const dialog = byId("sheet");
  const body = byId("sheet-body");
  const crumb = byId("sheet-crumb");

  let markup = "";
  let navList = [];

  if (type === "post") {
    const post = data.posts.find((p) => p.slug === slug);
    if (!post) return;
    navList = sheetNavList();
    state.order = navList.map((n) => n.slug);
    state.index = state.order.indexOf(slug);
    markup = postMarkup(data, post);
    const cat = data.categories.find((c) => c.id === post.category);
    crumb.textContent = `المحتوى / ${cat ? cat.label : ""}`;
  } else {
    const project = data.projects.find((p) => p.slug === slug);
    if (!project) return;
    state.order = data.projects.map((p) => p.slug);
    state.index = state.order.indexOf(slug);
    markup = projectMarkup(data, project);
    crumb.textContent = "المشاريع";
  }

  body.innerHTML = markup;
  body.scrollTop = 0;
  state.opener = opener || null;
  state.type = type;

  setSheetNavState();

  if (!dialog.open) showSheet(dialog);
  document.body.classList.add("is-locked");

  const hash = type === "post" ? `#/post/${slug}` : `#/project/${slug}`;
  if (location.hash !== hash) history.replaceState({ sheet: true }, "", hash);
}

function closeSheet({ fromHistory = false } = {}) {
  const dialog = byId("sheet");
  if (!dialog.open) return;

  hideSheet(dialog);
  document.body.classList.remove("is-locked");

  if (state.opener && document.contains(state.opener)) {
    state.opener.focus({ preventScroll: true });
  }

  if (!fromHistory && /^#\/(post|project)\//.test(location.hash)) {
    history.replaceState(null, "", `${location.pathname}${location.search}#feed`);
  }
}

function stepSheet(direction) {
  const list = sheetNavList();
  if (!list.length) return;
  const nextIndex = state.index + direction;
  if (nextIndex < 0 || nextIndex >= list.length) return;
  const item = list[nextIndex];
  openItem("post", item.slug, state.opener);
}

/* ------------------------------------------------------------------- init -- */
function initSheet() {
  const dialog = byId("sheet");
  if (!dialog) return;

  byId("sheet-body").addEventListener("click", (event) => {
    const rel = event.target.closest("[data-open-project]");
    if (!rel) return;
    openItem("project", rel.dataset.openProject, state.opener);
  });

  el("[data-close]").addEventListener("click", () => closeSheet());
  el('[data-nav="prev"]').addEventListener("click", () => stepSheet(-1));
  el('[data-nav="next"]').addEventListener("click", () => stepSheet(1));

  dialog.addEventListener("close", () => {
    document.body.classList.remove("is-locked");
    state.index = -1;
    state.type = null;

    // الإغلاق بمفتاح Esc لا يمرّ عبر closeSheet
    if (/^#\/(post|project)\//.test(location.hash)) {
      history.replaceState(null, "", `${location.pathname}${location.search}#feed`);
    }
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeSheet();
  });

  document.addEventListener("keydown", (event) => {
    if (!dialog.open) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      stepSheet(1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      stepSheet(-1);
    }
  });

  window.addEventListener("popstate", () => {
    const match = location.hash.match(/^#\/(post|project)\/(.+)$/);
    if (match) openItem(match[1], decodeURIComponent(match[2]), state.opener);
    else closeSheet({ fromHistory: true });
  });

  const match = location.hash.match(/^#\/(post|project)\/(.+)$/);
  if (match) {
    window.setTimeout(() => openItem(match[1], decodeURIComponent(match[2]), null), 60);
  }
}

function initReveal() {
  const items = els(".reveal");
  if (!items.length) return;

  if (!("IntersectionObserver" in window)) {
    items.forEach((i) => i.classList.add("is-in"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
  );

  items.forEach((item) => io.observe(item));
}

function initHeader() {
  const header = el(".site-header");
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const toggle = el(".nav-toggle");
  const panel = byId("mobile-nav");

  if (toggle && panel) {
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      panel.hidden = open;
    });

    panel.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        toggle.setAttribute("aria-expanded", "false");
        panel.hidden = true;
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) {
        toggle.setAttribute("aria-expanded", "false");
        panel.hidden = true;
        toggle.focus();
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 900 && !panel.hidden) {
        toggle.setAttribute("aria-expanded", "false");
        panel.hidden = true;
      }
    });
  }

  // تمييز القسم الحالي في التنقّل
  const links = els(".nav a");
  const sections = links
    .map((a) => byId(a.getAttribute("href").slice(1)))
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${entry.target.id}`));
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((s) => io.observe(s));
  }
}

async function boot() {
  const year = byId("year");
  if (year) year.textContent = new Date().getFullYear();

  initHeader();

  try {
    const response = await fetch(DATA_URL, { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    state.data = data;

    bindText(data);
    renderProfileLinks(data);
    renderFilters(data);
    renderFeed(data);
    renderProjects(data);
    renderPhilosophy(data);
    renderWriting(data);
    renderTimeline(data);
    renderContact(data);
    setFilter("all");

    initReveal();
    initSheet();
  } catch (error) {
    console.error("[content] failed to load:", error);
    const grid = byId("feed-grid");
    if (grid) {
      grid.innerHTML = `<p class="empty-state">تعذّر تحميل المحتوى. افتح الموقع عبر خادم محلي (وليس عبر <span dir="ltr">file://</span>) ليعمل <span dir="ltr">fetch</span> بشكل صحيح.</p>`;
    }
  }
}

boot();
