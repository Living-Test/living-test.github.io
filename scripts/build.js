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
fs.copyFileSync(path.join(root, "team.json"), path.join(dist, "team.json"));
copyDir(path.join(root, "admin"), path.join(dist, "admin"));
copyDir(path.join(root, "projects"), path.join(dist, "projects"));

const projectsDir = path.join(root, "projects");
const projects = [];
if (fs.existsSync(projectsDir)) {
  for (const name of fs.readdirSync(projectsDir)) {
    if (!name.endsWith(".json")) continue;
    const project = JSON.parse(fs.readFileSync(path.join(projectsDir, name), "utf8"));
    const description = project.description || project.summary || "";
    const liveLink = project.live_link ? String(project.live_link).trim() : "";
    if (!project.title || !/^https?:\/\//i.test(liveLink)) continue;
    projects.push({
      title: String(project.title),
      author: project.author ? String(project.author) : "",
      description: String(description),
      thumbnail: project.thumbnail ? String(project.thumbnail) : "",
      live_link: liveLink
    });
  }
}
projects.sort((a, b) => a.title.localeCompare(b.title));
const manifest = JSON.stringify(projects, null, 2);
fs.writeFileSync(path.join(dist, "projects.json"), manifest);
fs.writeFileSync(path.join(root, "projects.json"), manifest);
console.log(`Wrote ${projects.length} project(s) to projects.json`);
console.log("Copied index.html, team/, admin/, and projects/ to dist/");
