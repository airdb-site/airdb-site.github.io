import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";

const DEFAULT_REPO = "airdb-site/airdb-site.github.io";
const FEATURED_REPOS = [
  {
    name: "airdb.id",
    description: "Home Page of https://airdb.id",
    homepage: "https://airdb.id",
    html_url: "https://github.com/airdb-site/airdb.id",
    updated_at: "2026-07-09T00:00:00.000Z",
    topics: ["homepage", "frontend"],
    has_pages: true,
  },
  {
    name: "airdb.dev",
    description: "Home Page of https://airdb.dev",
    homepage: "https://airdb.dev",
    html_url: "https://github.com/airdb-site/airdb.dev",
    updated_at: "2026-07-09T00:00:00.000Z",
    topics: ["homepage", "frontend"],
    has_pages: true,
  },
  {
    name: "airdb.io",
    description: "Home Page of https://airdb.io",
    homepage: "https://airdb.io",
    html_url: "https://github.com/airdb-site/airdb.io",
    updated_at: "2026-07-09T00:00:00.000Z",
    topics: ["homepage", "frontend"],
    has_pages: true,
  },
  {
    name: "airdb.team",
    description: "Home Page of https://airdb.team",
    homepage: "https://airdb.team",
    html_url: "https://github.com/airdb-site/airdb.team",
    updated_at: "2026-07-08T00:00:00.000Z",
    topics: ["homepage", "frontend"],
    has_pages: true,
  },
  {
    name: "airdb.group",
    description: "Home Page of https://airdb.group",
    homepage: "https://airdb.group",
    html_url: "https://github.com/airdb-site/airdb.group",
    updated_at: "2026-07-08T00:00:00.000Z",
    topics: ["homepage", "frontend"],
    has_pages: true,
  },
  {
    name: "airdb.fund",
    description: "Home Page of https://airdb.fund",
    homepage: "https://airdb.fund",
    html_url: "https://github.com/airdb-site/airdb.fund",
    updated_at: "2026-07-10T00:00:00.000Z",
    topics: ["homepage", "frontend"],
    has_pages: true,
  },
  {
    name: "airdb.vc",
    description: "Home Page of https://airdb.vc",
    homepage: "https://airdb.vc",
    html_url: "https://github.com/airdb-site/airdb.vc",
    updated_at: "2026-07-12T00:00:00.000Z",
    topics: ["homepage", "frontend"],
    has_pages: true,
  },
  {
    name: "agw.to",
    description: "Home Page of https://agw.to",
    homepage: "https://agw.to",
    html_url: "https://github.com/airdb-site/agw.to",
    updated_at: "2026-07-12T00:00:00.000Z",
    topics: ["homepage", "frontend"],
    has_pages: true,
  },
  {
    name: "agw.bot",
    description: "Home Page of https://agw.bot",
    homepage: "https://agw.bot",
    html_url: "https://github.com/airdb-site/agw.bot",
    updated_at: "2026-07-12T00:00:00.000Z",
    topics: ["homepage", "frontend"],
    has_pages: true,
  },
  {
    name: "airdb.bio",
    description: "Home Page of https://airdb.bio",
    homepage: "https://airdb.bio",
    html_url: "https://github.com/airdb-site/airdb.bio",
    updated_at: "2026-07-11T00:00:00.000Z",
    topics: ["homepage", "frontend"],
    has_pages: true,
  },
  {
    name: "airdb.app",
    description: "Home Page of https://airdb.app",
    homepage: "https://airdb.app",
    html_url: "https://github.com/airdb-site/airdb.app",
    updated_at: "2026-07-12T00:00:00.000Z",
    topics: ["homepage", "frontend"],
    has_pages: true,
  },
  {
    name: "airdb.space",
    description: "Home Page of https://airdb.space",
    homepage: "https://airdb.space",
    html_url: "https://github.com/airdb-site/airdb.space",
    updated_at: "2026-07-10T00:00:00.000Z",
    topics: ["homepage", "frontend"],
    has_pages: true,
  },
  {
    name: "airdb.net",
    description: "Home Page of https://airdb.net",
    homepage: "https://airdb.net",
    html_url: "https://github.com/airdb-site/airdb.net",
    updated_at: "2026-07-08T00:00:00.000Z",
    topics: ["homepage", "frontend"],
    has_pages: true,
  },
  {
    name: "airdb.tech",
    description: "Home Page of https://airdb.tech",
    homepage: "https://airdb.tech",
    html_url: "https://github.com/airdb-site/airdb.tech",
    updated_at: "2026-07-15T00:00:00.000Z",
    topics: ["homepage", "frontend"],
    has_pages: true,
  },
  {
    name: "airdb.cloud",
    description: "Home Page of https://airdb.cloud",
    homepage: "https://airdb.cloud",
    html_url: "https://github.com/airdb-site/airdb.cloud",
    updated_at: "2026-07-16T00:00:00.000Z",
    topics: ["homepage", "frontend"],
    has_pages: true,
  },
];

function normalizeRepo(repo) {
  return {
    private: false,
    archived: false,
    topics: [],
    ...repo,
  };
}

function mergeRepos(primaryRepos, featuredRepos) {
  const byName = new Map();

  for (const repo of featuredRepos.map(normalizeRepo)) {
    byName.set(repo.name, repo);
  }

  for (const repo of primaryRepos.map(normalizeRepo)) {
    byName.set(repo.name, { ...byName.get(repo.name), ...repo });
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}

function getRepositorySlug() {
  if (process.env.GITHUB_REPOSITORY) {
    return process.env.GITHUB_REPOSITORY;
  }

  try {
    const remote = execSync("git remote get-url origin", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const match = remote.match(/github\.com[:/](.+?)\/(.+?)(?:\.git)?$/);

    if (match) {
      return `${match[1]}/${match[2]}`;
    }
  } catch {
    // Fall back to the default repository when git metadata is unavailable.
  }

  return DEFAULT_REPO;
}

function getRepositoryUrl(slug) {
  return `https://github.com/${slug}`;
}

function inferProjectSiteUrl(repo, owner) {
  if (repo.homepage) {
    try {
      return new URL(repo.homepage).toString();
    } catch {
      // Ignore malformed homepage values and continue falling back.
    }
  }

  if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(repo.name)) {
    return `https://${repo.name}`;
  }

  if (repo.has_pages) {
    return `https://${owner}.github.io/${repo.name}/`;
  }

  return repo.html_url;
}

function inferProjectRepoUrl(repo) {
  return repo.html_url || "#";
}

async function fetchOrgRepos(owner, token) {
  const repos = [];
  let page = 1;

  while (true) {
    const url = new URL(`https://api.github.com/orgs/${owner}/repos`);
    url.searchParams.set("type", "public");
    url.searchParams.set("sort", "updated");
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));

    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "airdb-site-builder",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
    }

    const batch = await response.json();
    repos.push(...batch);

    if (batch.length < 100) {
      break;
    }

    page += 1;
  }

  return repos;
}

function renderPage({ owner, repos, generatedAt, sourceRepo, sourceRepoUrl, errorMessage }) {
  const items = repos
    .map((repo) => {
      const projectSiteUrl = inferProjectSiteUrl(repo, owner);
      const projectRepoUrl = inferProjectRepoUrl(repo);
      const description = repo.description || "Frontend project";

      return `
        <article class="card">
          <div class="card-top">
            <div class="card-heading">
              <p class="eyebrow">public repo</p>
              <h2>${escapeHtml(repo.name)}</h2>
            </div>
            <a class="visit secondary" href="${escapeHtml(projectRepoUrl)}">GitHub</a>
          </div>
          <p class="description">${escapeHtml(description)}</p>
          <div class="meta">
            <a href="${escapeHtml(projectSiteUrl)}">Open Site</a>
            <span>Updated ${escapeHtml(new Date(repo.updated_at).toLocaleDateString("en-CA"))}</span>
          </div>
        </article>
      `;
    })
    .join("");

  const content = repos.length
    ? items
    : `<div class="empty">
         <p>${escapeHtml(errorMessage || "No public repositories found.")}</p>
       </div>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <title>${escapeHtml(owner)} projects</title>
    <meta
      name="description"
      content="Public projects from the ${escapeHtml(owner)} GitHub organization."
    />
    <style>
      :root {
        color-scheme: light;
        --bg: #f6f1e8;
        --panel: rgba(255, 252, 247, 0.86);
        --line: rgba(25, 38, 49, 0.12);
        --text: #192631;
        --muted: #56646f;
        --accent: #005f73;
        --accent-2: #ca6702;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at top left, rgba(238, 155, 0, 0.2), transparent 28%),
          radial-gradient(circle at top right, rgba(10, 147, 150, 0.18), transparent 32%),
          linear-gradient(180deg, #fff9f0 0%, var(--bg) 100%);
      }

      main {
        width: min(1120px, calc(100% - 32px));
        margin: 0 auto;
        padding: 72px 0 88px;
      }

      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.85fr);
        gap: 22px;
        align-items: stretch;
        margin-bottom: 34px;
      }

      .hero-copy,
      .hero-panel {
        padding: 30px 32px;
        border: 1px solid var(--line);
        border-radius: 28px;
        background: rgba(255, 251, 245, 0.82);
        box-shadow: 0 16px 40px rgba(25, 38, 49, 0.07);
        backdrop-filter: blur(12px);
      }

      .hero-copy {
        position: relative;
        overflow: hidden;
      }

      .hero-copy::after {
        content: "";
        position: absolute;
        inset: auto -60px -70px auto;
        width: 180px;
        height: 180px;
        border-radius: 999px;
        background: radial-gradient(circle, rgba(202, 103, 2, 0.14), transparent 68%);
        pointer-events: none;
      }

      .kicker {
        margin: 0;
        font-size: 0.8rem;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: var(--accent);
      }

      h1 {
        margin: 18px 0 0;
        max-width: 11ch;
        font-family: Georgia, "Times New Roman", serif;
        font-size: clamp(2.3rem, 4.4vw, 3.9rem);
        line-height: 0.96;
        letter-spacing: -0.04em;
      }

      .lead {
        margin: 22px 0 0;
        max-width: 36rem;
        font-size: 1rem;
        line-height: 1.72;
        color: var(--muted);
      }

      .hero-note {
        margin: 18px 0 0;
        max-width: 36rem;
        font-size: 0.95rem;
        line-height: 1.68;
        color: var(--muted);
      }

      .hero-panel {
        display: grid;
        gap: 16px;
        align-content: start;
      }

      .panel-label {
        margin: 0;
        font-size: 0.78rem;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--accent-2);
      }

      .panel-count {
        margin: 2px 0 0;
        font-family: Georgia, "Times New Roman", serif;
        font-size: clamp(2rem, 3.4vw, 2.8rem);
        line-height: 0.95;
      }

      .panel-subtitle {
        margin: 0;
        max-width: 18ch;
        font-size: 0.95rem;
        line-height: 1.45;
        color: var(--muted);
      }

      .summary {
        display: grid;
        gap: 10px;
        margin-top: 6px;
      }

      .pill {
        display: grid;
        gap: 4px;
        padding: 14px 16px 15px;
        border: 1px solid var(--line);
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.88);
      }

      .pill-label {
        font-size: 0.76rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--muted);
      }

      .pill-value {
        font-size: 0.92rem;
        line-height: 1.35;
        color: var(--text);
        word-break: break-word;
      }

      .pill-value a {
        color: inherit;
        text-decoration: none;
      }

      .pill-value a:hover {
        text-decoration: underline;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 18px;
      }

      .card,
      .empty {
        padding: 22px;
        border: 1px solid var(--line);
        border-radius: 24px;
        background: var(--panel);
        box-shadow: 0 18px 48px rgba(25, 38, 49, 0.08);
        backdrop-filter: blur(14px);
      }

      .card {
        display: flex;
        flex-direction: column;
      }

      .card-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
      }

      .card-heading {
        min-width: 0;
        flex: 1;
      }

      .eyebrow {
        margin: 0 0 8px;
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: var(--accent-2);
      }

      h2 {
        margin: 0;
        font-size: 1.4rem;
      }

      .visit,
      .meta a {
        color: var(--accent);
        text-decoration: none;
      }

      .visit {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        white-space: nowrap;
        min-width: 94px;
        padding: 10px 16px;
        border-radius: 999px;
        border: 1px solid rgba(0, 95, 115, 0.22);
        background: rgba(0, 95, 115, 0.08);
        flex-shrink: 0;
      }

      .visit.secondary {
        border-color: rgba(0, 95, 115, 0.22);
        background: rgba(255, 255, 255, 0.76);
      }

      .description {
        min-height: 1.6em;
        margin: 16px 0 18px;
        font-size: 0.96rem;
        color: var(--muted);
        line-height: 1.45;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: auto;
        font-size: 0.92rem;
        color: var(--muted);
      }

      footer {
        margin-top: 28px;
        color: var(--muted);
        font-size: 0.92rem;
      }

      @media (max-width: 900px) {
        .hero {
          grid-template-columns: 1fr;
        }

        .panel-subtitle,
        .lead,
        .hero-note {
          max-width: none;
        }
      }

      @media (max-width: 640px) {
        main {
          width: min(100% - 20px, 1120px);
          padding: 48px 0 64px;
        }

        .hero-copy,
        .hero-panel {
          padding: 22px 20px;
          border-radius: 24px;
        }

        h1 {
          max-width: 9ch;
          font-size: clamp(2.2rem, 11vw, 3rem);
        }

        .card-top {
          gap: 12px;
        }

        .visit {
          min-width: 84px;
          padding: 9px 14px;
        }

        .description {
          font-size: 0.92rem;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <div class="hero-copy">
          <p class="kicker">${escapeHtml(owner)} on GitHub Pages</p>
          <h1>Public projects, one clean directory.</h1>
          <p class="lead">
            A lightweight landing page for the <strong>${escapeHtml(owner)}</strong> organization.
            Each card links back to the repository on GitHub and keeps a direct path to the live site.
          </p>
          <p class="hero-note">
            Repositories like <strong>airdb.net</strong>, <strong>airdb.group</strong>, and
            <strong>airdb.team</strong> can be surfaced automatically during deployment.
          </p>
        </div>
        <aside class="hero-panel">
          <p class="panel-label">Overview</p>
          <p class="panel-count">${repos.length}</p>
          <p class="panel-subtitle">public projects currently featured on this page</p>
          <div class="summary">
            <div class="pill">
              <span class="pill-label">Source Repo</span>
              <span class="pill-value"><a href="${escapeHtml(sourceRepoUrl)}">${escapeHtml(sourceRepoUrl)}</a></span>
            </div>
            <div class="pill">
              <span class="pill-label">Generated</span>
              <span class="pill-value">${escapeHtml(generatedAt)}</span>
            </div>
          </div>
        </aside>
      </section>

      <section class="grid">
        ${content}
      </section>

      <footer>
        Built from the GitHub API at deploy time. Configure a repository homepage or enable
        GitHub Pages to control each project's destination link.
      </footer>
    </main>
  </body>
</html>`;
}

async function main() {
  const sourceRepo = getRepositorySlug();
  const sourceRepoUrl = getRepositoryUrl(sourceRepo);
  const [owner, currentRepoName] = sourceRepo.split("/");
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
  const generatedAt = new Date().toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");

  let repos = [];
  let errorMessage = "";

  try {
    repos = await fetchOrgRepos(owner, token);
    repos = repos
      .filter((repo) => !repo.private)
      .filter((repo) => !repo.archived)
      .filter((repo) => repo.name !== currentRepoName)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    if (error instanceof Error && error.message && error.message !== "fetch failed") {
      errorMessage = error.message;
    } else {
      errorMessage = "Unable to reach the GitHub API in this environment. Deployment on GitHub Actions should still populate the project list.";
    }
  }

  repos = mergeRepos(
    repos,
    FEATURED_REPOS.filter((repo) => repo.name !== currentRepoName),
  );

  const html = renderPage({
    owner,
    repos,
    generatedAt,
    sourceRepo,
    sourceRepoUrl,
    errorMessage,
  });

  await mkdir("dist", { recursive: true });
  await writeFile("dist/index.html", html, "utf8");
  await copyFile("favicon.svg", "dist/favicon.svg");
}

await main();
