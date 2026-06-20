/**
 * scripts/push-github.ts
 *
 * Initializes git (if needed) and pushes the current state of the monorepo
 * to the repository configured in GITHUB_REPO_URL.
 *
 * Usage:
 *   GITHUB_REPO_URL=https://github.com/you/duskvorn.git npm run push
 *
 * Or set GITHUB_REPO_URL in your .env file (loaded automatically).
 */
import "dotenv/config";
import * as path from "path";
import { simpleGit, SimpleGit } from "simple-git";

const ROOT = path.resolve(__dirname, "..");

async function main(): Promise<void> {
  const repoUrl = process.env.GITHUB_REPO_URL;

  if (!repoUrl) {
    console.error("");
    console.error("✖ GITHUB_REPO_URL is not set.");
    console.error("");
    console.error("  Set it in your .env file, e.g.:");
    console.error("    GITHUB_REPO_URL=https://github.com/your-org/duskvorn.git");
    console.error("");
    console.error("  Or pass it inline:");
    console.error("    GITHUB_REPO_URL=https://github.com/your-org/duskvorn.git npm run push");
    console.error("");
    process.exit(1);
  }

  const git: SimpleGit = simpleGit(ROOT);
  const isRepo = await git.checkIsRepo();

  if (!isRepo) {
    console.log("[push-github] no git repo found — running git init");
    await git.init();
  }

  console.log("[push-github] staging all files (git add .)");
  await git.add(".");

  const status = await git.status();
  if (status.staged.length === 0 && status.files.length === 0) {
    console.log("[push-github] nothing to commit — working tree is clean");
  } else {
    console.log("[push-github] committing");
    try {
      await git.commit("Initial DuskvorN commit");
    } catch (err) {
      console.log("[push-github] commit skipped (likely nothing new to commit):", (err as Error).message);
    }
  }

  console.log("[push-github] ensuring branch is named main");
  await git.branch(["-M", "main"]);

  const remotes = await git.getRemotes(true);
  const origin = remotes.find((r) => r.name === "origin");

  if (!origin) {
    console.log(`[push-github] adding remote origin -> ${repoUrl}`);
    await git.addRemote("origin", repoUrl);
  } else if (origin.refs.push !== repoUrl) {
    console.log(`[push-github] updating remote origin -> ${repoUrl}`);
    await git.remote(["set-url", "origin", repoUrl]);
  }

  console.log("[push-github] pushing to origin/main");
  await git.push(["-u", "origin", "main"]);

  console.log("");
  console.log("PUSH COMPLETE");
  console.log(`  -> ${repoUrl}`);
}

main().catch((err) => {
  console.error("[push-github] failed:", err.message || err);
  console.error("  If this is an auth error, make sure your git credentials");
  console.error("  (SSH key or a credential helper / PAT) are configured for this host.");
  process.exit(1);
});
