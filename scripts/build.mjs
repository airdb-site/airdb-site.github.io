import { mkdir, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";

const DEFAULT_REPO = "airdb-site/airdb-site.github.io";

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

function inferProjectUrl(repo, owner) {
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

function renderPage({ owner, repos, generatedAt, sourceRepo, errorMessage }) {
  const items = repos
    .map((repo) => {
      const projectUrl = inferProjectUrl(repo, owner);
      const description = repo.description || "Frontend project";
      const topics = Array.isArray(repo.topics) ? repo.topics.slice(0, 4) : [];

      return `
        <article class="card">
          <div class="card-top">
            <div>
              <p class="eyebrow">public repo</p>
              <h2>${escapeHtml(repo.name)}</h2>
            </div>
            <a class="visit" href="${escapeHtml(projectUrl)}">Visit</a>
          </div>
          <p class="description">${escapeHtml(description)}</p>
          <div class="meta">
            <a href="${escapeHtml(repo.html_url)}">GitHub</a>
            <span>Updated ${escapeHtml(new Date(repo.updated_at).toLocaleDateString("en-CA"))}</span>
          </div>
          ${
            topics.length
              ? `<div class="topics">${topics
                  .map((topic) => `<span>${escapeHtml(topic)}</span>`)
                  .join("")}</div>`
              : ""
          }
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
        gap: 18px;
        margin-bottom: 40px;
      }

      .kicker {
        margin: 0;
        font-size: 0.85rem;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--accent);
      }

      h1 {
        margin: 0;
        max-width: 10ch;
        font-family: Georgia, "Times New Roman", serif;
        font-size: clamp(3rem, 7vw, 5.5rem);
        line-height: 0.94;
      }

      .lead {
        margin: 0;
        max-width: 700px;
        font-size: 1.1rem;
        line-height: 1.7;
        color: var(--muted);
      }

      .summary {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 4px;
        color: var(--muted);
        font-size: 0.95rem;
      }

      .pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.72);
        backdrop-filter: blur(8px);
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

      .card-top {
        display: flex;
        align-items: start;
        justify-content: space-between;
        gap: 16px;
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
        white-space: nowrap;
        padding: 10px 14px;
        border-radius: 999px;
        border: 1px solid rgba(0, 95, 115, 0.22);
        background: rgba(0, 95, 115, 0.08);
      }

      .description {
        min-height: 3.4em;
        margin: 18px 0;
        color: var(--muted);
        line-height: 1.6;
      }

      .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        font-size: 0.92rem;
        color: var(--muted);
      }

      .topics {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 16px;
      }

      .topics span {
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(202, 103, 2, 0.1);
        color: #9b4d00;
        font-size: 0.84rem;
      }

      footer {
        margin-top: 28px;
        color: var(--muted);
        font-size: 0.92rem;
      }

      @media (max-width: 640px) {
        main {
          width: min(100% - 20px, 1120px);
          padding: 48px 0 64px;
        }

        .card-top {
          flex-direction: column;
        }

        .visit {
          align-self: flex-start;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <p class="kicker">${escapeHtml(owner)} on GitHub Pages</p>
        <h1>Projects you can open directly.</h1>
        <p class="lead">
          This homepage is generated during GitHub Pages deployment and lists the public
          repositories in the <strong>${escapeHtml(owner)}</strong> organization. Repositories
          like <strong>airdb.net</strong> and <strong>airdb.group</strong> can be surfaced here
          automatically.
        </p>
        <div class="summary">
          <span class="pill">${repos.length} public projects</span>
          <span class="pill">source repo: ${escapeHtml(sourceRepo)}</span>
          <span class="pill">generated: ${escapeHtml(generatedAt)}</span>
        </div>
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

  const html = renderPage({
    owner,
    repos,
    generatedAt,
    sourceRepo,
    errorMessage,
  });

  await mkdir("dist", { recursive: true });
  await writeFile("dist/index.html", html, "utf8");
}

await main();
