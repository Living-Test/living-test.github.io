const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

fs.mkdirSync(dist, { recursive: true });
for (const entry of fs.readdirSync(dist)) {
  fs.rmSync(path.join(dist, entry), { recursive: true, force: true });
}
fs.copyFileSync(path.join(root, "index.html"), path.join(dist, "index.html"));
fs.mkdirSync(path.join(dist, "team"), { recursive: true });
fs.copyFileSync(path.join(root, "team", "index.html"), path.join(dist, "team", "index.html"));
fs.copyFileSync(path.join(root, "events.json"), path.join(dist, "events.json"));
copyDir(path.join(root, "assets"), path.join(dist, "assets"));
copyDir(path.join(root, "projects"), path.join(dist, "projects"));
copyDir(path.join(root, "events"), path.join(dist, "events"));

function fieldValue(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") return String(value.src || value.path || value.url || "").trim();
  return "";
}

function isHttp(value) {
  return /^https?:\/\//i.test(value);
}

function localHtmlPath(value) {
  if (!value || isHttp(value)) return "";
  const queryAt = value.search(/[?#]/);
  const filePath = (queryAt === -1 ? value : value.slice(0, queryAt)).replace(/\\/g, "/");
  const suffix = queryAt === -1 ? "" : value.slice(queryAt);
  const withSlash = filePath.startsWith("projects/media/") ? `/${filePath}` : filePath;
  if (!withSlash.startsWith("/projects/media/") || withSlash.includes("..") || !/\.html?$/i.test(withSlash)) return "";
  return withSlash + suffix;
}

function projectType(value) {
  const type = String(value || "").toLowerCase();
  if (type === "html" || type === "html file") return "html";
  if (type === "app" || type === "deployed app") return "app";
  return "";
}

function nameList(value) {
  if (!value) return [];
  const items = Array.isArray(value) ? value : [value];
  return items.flatMap((item) => {
    if (typeof item === "string") {
      const text = item.trim();
      return text ? [text] : [];
    }
    if (item && typeof item === "object") {
      const text = String(item.name || item.label || item.value || "").trim();
      return text ? [text] : [];
    }
    return [];
  });
}

function projectLink(project) {
  const type = projectType(project.project_type);
  const appLink = fieldValue(project.live_link);
  const htmlValue = fieldValue(project.html_file || project.student_file);
  const htmlLink = localHtmlPath(htmlValue) || (isHttp(htmlValue) && /\.html?($|[?#])/i.test(htmlValue) ? htmlValue : "");
  if (type === "html") return htmlLink;
  if (type === "app") return isHttp(appLink) ? appLink : "";
  if (isHttp(appLink)) return appLink;
  return htmlLink;
}

const projectsDir = path.join(root, "projects");
const projects = [];
if (fs.existsSync(projectsDir)) {
  for (const name of fs.readdirSync(projectsDir)) {
    if (!name.endsWith(".json")) continue;
    const project = JSON.parse(fs.readFileSync(path.join(projectsDir, name), "utf8"));
    const description = project.description || project.summary || "";
    const liveLink = projectLink(project);
    if (!project.title || !liveLink) continue;
    projects.push({
      title: String(project.title),
      authors: nameList(project.author),
      guest_authors: nameList(project.guest_authors),
      description: String(description),
      thumbnail: project.thumbnail ? String(project.thumbnail) : "",
      project_type: projectType(project.project_type) || (isHttp(liveLink) ? "app" : "html"),
      live_link: liveLink
    });
  }
}
projects.sort((a, b) => a.title.localeCompare(b.title));
const manifest = JSON.stringify(projects, null, 2);
fs.writeFileSync(path.join(dist, "projects.json"), manifest);
fs.writeFileSync(path.join(root, "projects.json"), manifest);
console.log(`Wrote ${projects.length} project(s) to projects.json`);

const teamDir = path.join(root, "team");
const rootTeamPath = path.join(root, "team.json");
const team = [];
if (fs.existsSync(teamDir)) {
  for (const name of fs.readdirSync(teamDir)) {
    if (!name.endsWith(".json")) continue;
    const person = JSON.parse(fs.readFileSync(path.join(teamDir, name), "utf8"));
    if (!person || !person.name) continue;
    team.push({
      name: String(person.name),
      role: person.role ? String(person.role) : "",
      focused_role: person.focused_role ? String(person.focused_role) : (person.focus ? String(person.focus) : ""),
      photo: fieldValue(person.photo),
      link: person.link ? String(person.link).trim() : ""
    });
  }
}
if (team.length > 0) {
  const teamManifest = JSON.stringify(team, null, 2);
  fs.writeFileSync(path.join(dist, "team.json"), teamManifest);
  fs.writeFileSync(rootTeamPath, teamManifest);
  console.log(`Wrote ${team.length} team member(s) to team.json`);
} else if (fs.existsSync(rootTeamPath)) {
  fs.copyFileSync(rootTeamPath, path.join(dist, "team.json"));
  const saved = JSON.parse(fs.readFileSync(rootTeamPath, "utf8"));
  const count = Array.isArray(saved) ? saved.length : 0;
  console.log(`No team member files found; copied existing team.json (${count} member(s)) to dist/`);
} else {
  fs.writeFileSync(path.join(dist, "team.json"), "[]\n");
  console.log("No team members found; wrote an empty team.json to dist/");
}
console.log("Copied index.html, assets/, team/, events/, and projects/ to dist/");
