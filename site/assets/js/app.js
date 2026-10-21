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
    nowTitle: data.ui.nowTitle,
    pathTitle: data.ui.pathTitle,
    pathIntro: data.ui.pathIntro,
    feedTitle: data.ui.feedTitle,
    feedIntro: data.ui.feedIntro,
    projectsTitle: data.ui.projectsTitle,
    projectsIntro: data.ui.projectsIntro,
    philosophyTitle: data.ui.philosophyTitle,
    philosophyIntro: data.philosophy.intro,
    writingTitle: data.ui.writingTitle,
    contactTitle: data.ui.contactTitle,
    contactLead: data.ui.contactLead,
    emptyState: data.ui.emptyState,
  };

  els("[data-bind]").forEach((node) => {
    const key = node.dataset.bind;
    if (key in map && map[key]) node.textContent = map[key];
  });

  const firstRole = data.profile.rolesLine.split("·")[0].trim();
  document.title = `${data.profile.name} — ${firstRole}`;
}

function renderIdentity(data) {
  const wrap = byId("id-meta");
  if (!wrap) return;

  const rows = [{ label: "المكان", value: data.profile.location }, ...(data.profile.meta || [])].filter(
    (row) => row && row.value
  );

  wrap.innerHTML = rows
    .map((row) => `<div><dt>${esc(row.label)}</dt><dd>${esc(row.value)}</dd></div>`)
    .join("");
}

function renderNow(data) {
  const wrap = byId("now-list");
  if (!wrap) return;

  wrap.innerHTML = (data.ui.now || [])
    .map(
      (item, i) => `
      <li class="now-item reveal" style="--d:${i * 60}ms">
        <span class="now-label">${esc(item.label)}</span>
        <p>${esc(item.text)}</p>
      </li>`
    )
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

function publishedProjects(data) {
  return (data.projects || []).filter((project) => project.published !== false);
}

function projectMedia(project) {
  if (!project.image) return "";
  const alt = project.imageAlt || `معاينة ${project.title}`;
  return `<figure class="project-media"><img src="${esc(project.image)}" alt="${esc(alt)}" loading="lazy" /></figure>`;
}

function linkTarget(href) {
  return /^https?:\/\//i.test(String(href)) ? ' target="_blank" rel="noopener noreferrer"' : "";
}

function renderProjects(data) {
  const wrap = byId("project-list");
  const projects = publishedProjects(data);

  if (!projects.length) {
    wrap.innerHTML = '<p class="empty-state">لا توجد مشاريع منشورة حاليًا.</p>';
    return;
  }

  wrap.innerHTML = projects
    .map((project, i) => {
      const meta = [
        ["الفترة", project.period],
        ["الحالة", project.status],
        ["النطاق", project.scope],
      ].filter((item) => item[1]);
      const visitLink = project.href
        ? `<a class="project-link" href="${esc(project.href)}"${linkTarget(project.href)}>
             زيارة المشروع
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
               <path d="M7 17 17 7M9 7h8v8" stroke-linecap="round" stroke-linejoin="round" />
             </svg>
           </a>`
        : "";

      return `
      <article class="project reveal" style="--d:${i * 70}ms">
        ${projectMedia(project)}
        <div class="project-body">
          <p class="project-role">${esc(project.role)}</p>
          <h3>${esc(project.title)}</h3>
          <p class="project-summary">${esc(project.summary)}</p>
          <dl class="project-meta">
            ${meta.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("")}
          </dl>
          <div class="project-foot">
            <button class="link-btn" type="button" data-open="project" data-slug="${esc(project.slug)}">
              تفاصيل المشروع
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path d="M19 12H5m6-6-6 6 6 6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            ${visitLink}
          </div>
        </div>
      </article>`;
    })
    .join("");

  wrap.addEventListener("click", (event) => {
    const btn = event.target.closest('[data-open="project"]');
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

function contactIcon(label) {
  const value = String(label).toLowerCase();
  let shape = '<path d="M7 17 17 7M9 7h8v8" stroke-linecap="round" stroke-linejoin="round" />';

  if (value.includes("بريد") || value.includes("email")) {
    shape = '<rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="m5 7 7 5.5L19 7" stroke-linecap="round" stroke-linejoin="round" />';
  } else if (value.includes("إنستغرام") || value.includes("instagram")) {
    shape = '<rect x="4" y="4" width="16" height="16" rx="4" /><circle cx="12" cy="12" r="3.5" /><circle cx="17.5" cy="6.8" r=".75" fill="currentColor" stroke="none" />';
  } else if (value.includes("يوتيوب") || value.includes("youtube")) {
    shape = '<rect x="3.5" y="6" width="17" height="12" rx="3" /><path d="m10 9 5 3-5 3Z" fill="currentColor" stroke="none" />';
  } else if (value.includes("تيك") || value.includes("tiktok")) {
    shape = '<path d="M14 4v10.1a4.1 4.1 0 1 1-3-3.95M14 4c.6 2.6 2.3 4.2 5 4.6" stroke-linecap="round" stroke-linejoin="round" />';
  }

  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">${shape}</svg>`;
}

function renderContact(data) {
  const wrap = byId("contact-links");
  const links = (data.profile.links || []).filter((link) => String(link.href || "").trim());

  if (!links.length) {
    wrap.innerHTML = '<li class="contact-empty">لا توجد روابط تواصل منشورة حاليًا.</li>';
    return;
  }

  wrap.innerHTML = links
    .map((link) => `
      <li>
        <a href="${esc(link.href)}"${linkTarget(link.href)}>
          ${contactIcon(link.label)}
          <span>${esc(link.label)}</span>
        </a>
      </li>`)
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

    <div class="sheet-foot">
      ${relatedButton(data, post)}
      <span class="sheet-hint">${esc(data.ui.dialogHint)}</span>
    </div>`;
}

function relatedButton(data, post) {
  if (!post.relatedProject) {
    return `<span>${esc(post.id)} · ${esc(post.axis)}</span>`;
  }
  const project = publishedProjects(data).find((item) => item.slug === post.relatedProject);
  if (!project) return `<span>${esc(post.id)} · ${esc(post.axis)}</span>`;

  return `<button class="link-btn" type="button" data-open-project="${esc(project.slug)}">
      المشروع المرتبط: ${esc(project.shortTitle || project.title)}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path d="M19 12H5m6-6-6 6 6 6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>`;
}

function projectMarkup(data, project) {
  const projects = publishedProjects(data);
  const idx = projects.findIndex((item) => item.slug === project.slug);
  const number = String(idx + 1).padStart(2, "0");
  const meta = [
    ["الفترة", project.period],
    ["الحالة", project.status],
    ["النطاق", project.scope],
  ].filter((item) => item[1]);
  const approach = Array.isArray(project.approach) ? project.approach : [];
  const detail = [
    project.challenge ? `<h3>التحدّي</h3><p>${esc(project.challenge)}</p>` : "",
    approach.length
      ? `<h3>المقاربة</h3><ul class="approach">${approach.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`
      : "",
    project.outcome ? `<h3>النتيجة</h3><p>${esc(project.outcome)}</p>` : "",
  ].filter(Boolean).join("");
  const note = project.note
    ? `<p class="sheet-note">${project.separation ? "<strong>فصل الهويات:</strong> " : ""}${esc(project.note)}</p>`
    : "";
  const visitLink = project.href
    ? `<a class="project-link" href="${esc(project.href)}"${linkTarget(project.href)}>زيارة المشروع</a>`
    : "";

  return `
    ${projectMedia(project)}
    <div class="sheet-head">
      <div class="tag-row">
        <span class="tag">${esc(project.role)}</span>
      </div>
      <h2 id="sheet-title">${esc(project.title)}</h2>
      <p class="sheet-dek">${esc(project.summary)}</p>
    </div>

    ${meta.length ? `<dl class="sheet-meta">${meta.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl>` : ""}
    ${detail ? `<div class="prose">${detail}</div>` : ""}
    ${note}

    <div class="sheet-foot">
      <span>مشروع ${number} من ${projects.length}</span>
      ${visitLink}
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
    const projects = publishedProjects(data);
    const project = projects.find((item) => item.slug === slug);
    if (!project) return;
    state.order = projects.map((item) => item.slug);
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

/* ------------------------------------------------------------------ menu -- */
function initHeader() {
  const toggle = el(".nav-toggle");
  const panel = byId("site-menu");

  if (toggle && panel) {
    const setMenuOpen = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "إغلاق القائمة" : "فتح القائمة");
      const label = el(".sr-only", toggle);
      if (label) label.textContent = open ? "إغلاق القائمة" : "فتح القائمة";
      panel.hidden = !open;
    };

    toggle.addEventListener("click", () => {
      setMenuOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    panel.addEventListener("click", (event) => {
      if (event.target.closest("a")) setMenuOpen(false);
    });

    document.addEventListener("pointerdown", (event) => {
      if (!panel.hidden && !event.target.closest(".site-header")) setMenuOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) {
        setMenuOpen(false);
        toggle.focus();
      }
    });
  }

  const links = els(".site-menu a");
  const sectionIds = [...new Set(links.map((link) => link.getAttribute("href").slice(1)))];
  const sections = sectionIds.map((id) => byId(id)).filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((link) => {
            const active = link.getAttribute("href") === `#${entry.target.id}`;
            link.classList.toggle("is-active", active);
            if (active) link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
          });
        });
      },
      { rootMargin: "-30% 0px -55% 0px" }
    );
    sections.forEach((section) => io.observe(section));
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
    renderIdentity(data);
    renderNow(data);
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
