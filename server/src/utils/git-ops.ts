import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import fs from 'fs';
import path from 'path';

async function initAndCommit(repoDir: string) {
  console.log(`\n===========================================================`);
  console.log(`  📦 Initializing Git Repository at: ${repoDir}`);
  console.log(`===========================================================`);

  // Remove existing .git if in subfolder
  const subGit = path.join(repoDir, 'server', 'src', '.git');
  if (fs.existsSync(subGit)) {
    fs.rmSync(subGit, { recursive: true, force: true });
  }

  await git.init({ fs, dir: repoDir, defaultBranch: 'main' });
  console.log('✓ Git repository initialized with branch main');

  // Recursively add all project files
  const ignoredPatterns = [
    '.git',
    'node_modules',
    'dist',
    '.DS_Store',
    'Thumbs.db',
    '.env',
    '.env.local'
  ];

  const ignoredExtensions = [
    '.db',
    '.db-wal',
    '.db-shm',
    '.sqlite',
    '.sqlite3',
    '.log'
  ];

  async function stageDirectory(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relPath = path.relative(repoDir, fullPath).replace(/\\/g, '/');

      const isIgnored = ignoredPatterns.some(
        (p) => relPath === p || relPath.startsWith(p + '/') || relPath.includes('/' + p + '/') || relPath.endsWith('/' + p)
      );

      const hasIgnoredExt = ignoredExtensions.some((ext) => relPath.endsWith(ext));

      if (isIgnored || hasIgnoredExt) {
        continue;
      }

      if (entry.isDirectory()) {
        await stageDirectory(fullPath);
      } else if (entry.isFile()) {
        try {
          await git.add({ fs, dir: repoDir, filepath: relPath });
        } catch (e: any) {
          console.warn(`  - Warning staging ${relPath}: ${e.message}`);
        }
      }
    }
  }

  console.log('Staging project files...');
  await stageDirectory(repoDir);

  const files = await git.listFiles({ fs, dir: repoDir });
  console.log(`✓ Staged ${files.length} project files.`);

  const sha = await git.commit({
    fs,
    dir: repoDir,
    author: {
      name: 'BorderGuard AI Developer',
      email: 'developer@borderguard.ai'
    },
    message: 'feat: Complete BorderGuard AI - full-stack biometric & document forensic verification platform'
  });
  console.log(`✓ Initial commit created successfully! Commit SHA: ${sha}`);
  return sha;
}

export async function pushToRemote(repoDir: string, remoteUrl: string, token: string, branch = 'main') {
  console.log(`\n===========================================================`);
  console.log(`  🚀 Pushing to Remote: ${remoteUrl} [branch: ${branch}]`);
  console.log(`===========================================================`);

  // Add remote
  try {
    await git.deleteRemote({ fs, dir: repoDir, remote: 'origin' });
  } catch {}

  await git.addRemote({
    fs,
    dir: repoDir,
    remote: 'origin',
    url: remoteUrl
  });
  console.log(`✓ Remote 'origin' configured: ${remoteUrl}`);

  console.log('Pushing commits to GitHub...');
  const pushResult = await git.push({
    fs,
    http,
    dir: repoDir,
    remote: 'origin',
    ref: branch,
    force: true,
    onAuth: () => ({
      username: token,
      password: ''
    })
  });

  console.log('✓ Push response:', pushResult);
  console.log(`🎉 Successfully pushed to ${remoteUrl}!`);
}

// Run init & commit for current project directory
const targetDir = path.resolve(process.cwd());
initAndCommit(targetDir).catch(console.error);
