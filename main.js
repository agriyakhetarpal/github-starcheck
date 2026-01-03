const defaultTitle = "GitHub Star Checker";
const usernameInput = document.querySelector(".username-input");
const repoInput = document.querySelector(".repo-input");
const checkButton = document.querySelector(".check-button");
const workingStatusText = document.querySelector(".working-status-text");
const resultText = document.querySelector(".result-text");

const validUsernameRegex = /^[a-z\d](?:[a-z\d]|-(?!-)){0,38}$/i;
const validRepoRegex = /^[a-z\d._-]+\/[a-z\d._-]+$/i;

let working;

const GITHUB_API = "https://api.github.com";
const CACHE_TTL_SECONDS = 3600;

if (typeof window !== "undefined" && window.ls) {
  window.ls.config.ttl = CACHE_TTL_SECONDS;
}

function getCached(key) {
  try {
    if (!window.ls) return null;
    return window.ls.get(key);
  } catch (err) {
    console.error("Cache read error:", err);
    return null;
  }
}

function setCached(key, value) {
  try {
    if (!window.ls) return;
    window.ls.set(key, value, { ttl: CACHE_TTL_SECONDS });
  } catch (err) {
    console.error("Cache write error:", err);
  }
}

function sanitizeString(string) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };
  const reg = /[&<>"'/]/gi;
  return string.replace(reg, (match) => map[match]);
}

class HTTPError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "HTTPError";
    this.status = code;
  }
}

async function getUserInfo(username) {
  const cacheKey = `github_user_${username}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`Using cached user info for ${username}`);
    return cached;
  }

  const response = await fetch(`${GITHUB_API}/users/${username}`);
  const data = await response.json();
  if (!response.ok) {
    console.error("HTTPError", response);
    throw new HTTPError(response.status, data.message || "Unknown error");
  }

  setCached(cacheKey, data);
  console.log(`Cached user info for ${username}`);

  return data;
}

async function getRepoInfo(owner, repo) {
  const cacheKey = `github_repo_${owner}_${repo}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`Using cached repo info for ${owner}/${repo}`);
    return cached;
  }

  const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`);
  const data = await response.json();
  if (!response.ok) {
    console.error("HTTPError", response);
    throw new HTTPError(response.status, data.message || "Unknown error");
  }

  setCached(cacheKey, data);
  console.log(`Cached repo info for ${owner}/${repo}`);

  return data;
}

async function getUserStarredRepos(username) {
  const allRepos = [];
  let page = 1;

  while (true) {
    const response = await fetch(
      `${GITHUB_API}/users/${username}/starred?per_page=100&page=${page}`,
      {
        headers: {
          Accept: "application/vnd.github.star+json",
        },
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new HTTPError(response.status, data.message || "Unknown error");
    }

    const data = await response.json();
    if (!data || data.length === 0) {
      break;
    }

    allRepos.push(...data);
    page++;
  }

  return allRepos;
}

async function getRepoStargazers(owner, repo) {
  const allStargazers = [];
  let page = 1;

  while (true) {
    const response = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/stargazers?per_page=100&page=${page}`,
      {
        headers: {
          Accept: "application/vnd.github.star+json",
        },
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new HTTPError(response.status, data.message || "Unknown error");
    }

    const data = await response.json();
    if (!data || data.length === 0) {
      break;
    }

    allStargazers.push(...data);
    page++;
  }

  return allStargazers;
}

async function findStarTimestamp(username, owner, repo) {
  const [userInfo, repoInfo] = await Promise.all([
    getUserInfo(username),
    getRepoInfo(owner, repo),
  ]);

  const userStarredCount = userInfo.public_repos;
  const repoStargazersCount = repoInfo.stargazers_count;

  console.log(
    `User has starred ${userStarredCount} repos, repo has ${repoStargazersCount} stargazers`
  );

  let starredAt = null;

  if (userStarredCount <= repoStargazersCount) {
    console.log("Querying user's starred repos (smaller list)");
    const starredRepos = await getUserStarredRepos(username);

    for (const item of starredRepos) {
      const repoFullName = item.repo.full_name;
      if (repoFullName.toLowerCase() === `${owner}/${repo}`.toLowerCase()) {
        starredAt = item.starred_at;
        break;
      }
    }
  } else {
    console.log("Querying repo's stargazers (smaller list)");
    const stargazers = await getRepoStargazers(owner, repo);

    for (const item of stargazers) {
      if (item.user.login.toLowerCase() === username.toLowerCase()) {
        starredAt = item.starred_at;
        break;
      }
    }
  }

  return starredAt;
}

function formatTimestamp(isoTimestamp) {
  const date = new Date(isoTimestamp);
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  };
  return date.toLocaleString("en-US", options);
}

function parseRepoInput(input) {
  const trimmed = input.trim();
  const parts = trimmed.split("/");
  if (parts.length === 2) {
    return { owner: parts[0], repo: parts[1] };
  }
  return null;
}

function checkInputValidity() {
  const username = usernameInput.value.trim();
  const repoInput_value = repoInput.value.trim();

  if (!username.length) {
    usernameInput.setCustomValidity("Please enter a GitHub username");
    usernameInput.reportValidity();
    return false;
  }

  if (!validUsernameRegex.test(username)) {
    usernameInput.setCustomValidity("Invalid GitHub username");
    usernameInput.reportValidity();
    return false;
  }

  if (!repoInput_value.length) {
    repoInput.setCustomValidity(
      "Please enter a repository in owner/repo format"
    );
    repoInput.reportValidity();
    return false;
  }

  if (!validRepoRegex.test(repoInput_value)) {
    repoInput.setCustomValidity("Invalid repository format (use owner/repo)");
    repoInput.reportValidity();
    return false;
  }

  return true;
}

function setWorkingStatus() {
  working = true;
  let workingStep = 1;
  usernameInput.readOnly = true;
  repoInput.readOnly = true;
  checkButton.disabled = true;
  function showWorkingDots() {
    if (working) {
      workingStatusText.textContent = `working${" .".repeat(workingStep)}`;
      if (workingStep === 3) {
        workingStep = 1;
      } else {
        workingStep++;
      }
      setTimeout(showWorkingDots, 150);
    }
  }
  showWorkingDots();
}

function setFinishedStatus(errored, details) {
  working = false;
  workingStatusText.textContent = errored ? "ERROR!!!" : "done!";
  if (errored) {
    workingStatusText.classList.add("error");
    resultText.classList.add("error");
  }
  resultText.innerHTML = details;
  usernameInput.readOnly = false;
  repoInput.readOnly = false;
  checkButton.disabled = false;
}

function updateQueryParamsAndTitle(username, repoFullName) {
  const url = new URL(window.location.href);
  const searchParams = url.searchParams;
  searchParams.set("username", username);
  searchParams.set("repo", repoFullName);
  window.history.replaceState(null, null, url);
  document.title = `${username} ★ ${repoFullName} | ${defaultTitle}`;
}

function removeQueryParamsAndTitle() {
  const url = new URL(window.location.href);
  const searchParams = url.searchParams;
  for (let key of Array.from(searchParams.keys())) {
    searchParams.delete(key);
  }
  window.history.replaceState(null, null, url);
  document.title = defaultTitle;
}

function resetOutputStatus() {
  workingStatusText.innerHTML = "";
  workingStatusText.classList.remove("error");
  resultText.innerHTML = "";
  resultText.classList.remove("error");
  removeQueryParamsAndTitle();
}

async function copyToClipboard(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    const originalText = button.textContent;
    button.textContent = "Copied!";
    button.classList.add("copied");
    setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove("copied");
    }, 1500);
  } catch (err) {
    console.error("Failed to copy to clipboard:", err);
  }
}

function createResultHTML(username, repoFullName, starredAt) {
  const formattedDate = formatTimestamp(starredAt);
  const isoDate = starredAt;

  let html = `<div class="star-info">`;
  html += `<div class="star-info-line"><strong>${sanitizeString(
    username
  )}</strong> starred <strong>${sanitizeString(repoFullName)}</strong></div>`;
  html += `<div class="star-info-line">on <strong>${sanitizeString(
    formattedDate
  )}</strong></div>`;
  html += `</div>`;
  html += `<button class="copy-button" data-timestamp="${sanitizeString(
    isoDate
  )}">Copy ISO timestamp</button>`;

  return html;
}

async function onSubmit() {
  if (!checkInputValidity()) {
    return;
  }

  const username = usernameInput.value.trim();
  const repoData = parseRepoInput(repoInput.value);

  if (!repoData) {
    repoInput.setCustomValidity("Invalid repository format");
    repoInput.reportValidity();
    return;
  }

  const { owner, repo } = repoData;
  const repoFullName = `${owner}/${repo}`;

  resetOutputStatus();
  setWorkingStatus();
  let resultString;

  try {
    const starredAt = await findStarTimestamp(username, owner, repo);

    if (starredAt) {
      resultString = createResultHTML(username, repoFullName, starredAt);
      setFinishedStatus(false, resultString);
      updateQueryParamsAndTitle(username, repoFullName);

      document.querySelector(".copy-button").addEventListener("click", (e) => {
        const timestamp = e.target.dataset.timestamp;
        copyToClipboard(timestamp, e.target);
      });
    } else {
      resultString = `<strong>${sanitizeString(
        username
      )}</strong> has not starred <strong>${sanitizeString(
        repoFullName
      )}</strong>`;
      setFinishedStatus(false, resultString);
      updateQueryParamsAndTitle(username, repoFullName);
    }
  } catch (err) {
    if (err.name === "HTTPError") {
      if (err.status === 404) {
        resultString =
          "User or repository not found. Please check the inputs and try again.";
      } else if (
        err.status === 403 &&
        err.message.toLowerCase().includes("api rate limit exceeded")
      ) {
        resultString =
          "API rate limit exceeded. Please wait and try again later.";
      } else {
        resultString = `unexpected error: ${sanitizeString(err.toString())}`;
      }
    } else {
      resultString = `unexpected error: ${sanitizeString(err.toString())}`;
    }
    setFinishedStatus(true, resultString);
  }
}

usernameInput.addEventListener("keydown", (event) => {
  usernameInput.setCustomValidity("");
  if (event.key === "Enter") {
    onSubmit();
  }
});

repoInput.addEventListener("keydown", (event) => {
  repoInput.setCustomValidity("");
  if (event.key === "Enter") {
    onSubmit();
  }
});

checkButton.addEventListener("click", onSubmit);

function maybeUseParamsFromURL() {
  const params = new URLSearchParams(document.location.search.substring(1));
  const username = params.get("username");
  const repo = params.get("repo");

  if (!username || !repo) {
    return;
  }

  usernameInput.blur();
  repoInput.blur();

  const tipAdmonition = document.querySelector("#tip-admonition");
  if (tipAdmonition) {
    tipAdmonition.remove();
  }

  usernameInput.value = username;
  repoInput.value = repo;
  checkButton.click();
}

window.addEventListener("DOMContentLoaded", maybeUseParamsFromURL);
