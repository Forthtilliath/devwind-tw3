// Release en deux temps, sans jamais pousser sur main : tout passe par une PR intégrée en
// rebase, qui réécrit les SHA → le tag ne peut être posé qu'une fois la PR intégrée.
//   1. `npm version patch|minor|major` : `.npmrc` (git-tag-version=false) limite npm au bump de
//      package.json/package-lock.json ; `preversion` lance `check`, `postversion` lance `open`
//      (branche release/vX.Y.Z + commit + push de la branche + PR).
//   2. Après intégration de la PR : `npm run release:tag` pose le tag vX.Y.Z sur le commit de
//      release de main et le pousse, ce qui déclenche .github/workflows/release.yml.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'

const run = (cmd: string, args: string[]) => {
  execFileSync(cmd, args, { stdio: 'inherit' })
}
const read = (cmd: string, args: string[]) => execFileSync(cmd, args, { encoding: 'utf8' }).trim()

function fail(message: string): never {
  console.error(`release : ${message}`)
  process.exit(1)
}

function currentVersion(): string {
  return JSON.parse(fs.readFileSync('package.json', 'utf8')).version
}

function ensureSyncedMain() {
  if (read('git', ['branch', '--show-current']) !== 'main') fail('à lancer depuis main')
  if (read('git', ['status', '--porcelain'])) fail('working directory non propre')
  run('git', ['fetch', 'origin', 'main'])
  if (read('git', ['rev-parse', 'HEAD']) !== read('git', ['rev-parse', 'origin/main'])) {
    fail('main local différent de origin/main (git pull --rebase)')
  }
}

function openReleasePr() {
  const tag = `v${currentVersion()}`
  const branch = `release/${tag}`
  run('git', ['switch', '-c', branch])
  run('git', ['add', 'package.json', 'package-lock.json'])
  run('git', ['commit', '-m', `chore: release ${tag}`])
  run('git', ['push', '-u', 'origin', branch])
  run('gh', [
    'pr', 'create', '--base', 'main', '--head', branch,
    '--title', `chore: release ${tag}`,
    '--body', `Release ${tag}. Après intégration (rebase) : \`npm run release:tag\` pour poser et pousser le tag.`,
  ])
  run('git', ['switch', 'main'])
}

function tagRelease() {
  run('git', ['switch', 'main'])
  run('git', ['pull', '--rebase', 'origin', 'main'])
  const tag = `v${currentVersion()}`
  if (read('git', ['tag', '--list', tag])) fail(`le tag ${tag} existe déjà`)
  // Le commit de release n'est pas forcément HEAD si d'autres PR ont été intégrées depuis.
  const sha = read('git', ['log', '-1', '--format=%H', '--fixed-strings', `--grep=chore: release ${tag}`])
  if (!sha) fail(`commit "chore: release ${tag}" introuvable sur main (PR pas encore intégrée ?)`)
  run('git', ['tag', '-a', tag, sha, '-m', tag])
  run('git', ['push', 'origin', tag])
}

const commands: Record<string, () => void> = {
  check: ensureSyncedMain,
  open: openReleasePr,
  tag: tagRelease,
}
const command = commands[process.argv[2] ?? '']
if (!command) fail('usage : tsx scripts/release.ts check|open|tag')
command()
