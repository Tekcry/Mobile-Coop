export const meta = {
  name: 'operators-run',
  description: 'Night Shift operators run: steps 05-18, each implement -> Opus check -> up to 3 fix rounds -> commit, then a run summary',
  phases: [
    { title: 'Steps', detail: 'implement, Opus check, fix rounds, finish (commit, push, send) per step' },
    { title: 'Summary', detail: 'RUN-SUMMARY.md, commit, push, send to Michael' },
  ],
}

// Workflow script (Claude Code Workflow tool). Rules: docs/operators/RULES.md "Step loop".
// Run: Workflow({scriptPath: "C:\\NightShift\\Mobile-Coop-operators\\docs\\operators\\run.workflow.js", args: {from: "05"}})
// args.from: the first step not yet done (STATE.md). args.handover: optional handover text for that step.

const REPO = 'C:\\NightShift\\Mobile-Coop-operators'
const GUARD = 'cd /c/NightShift/Mobile-Coop-operators && test "$(git rev-parse --abbrev-ref HEAD)" = feature/operators && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-operators"'
const PORT_FREE = 'powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 4191 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"'

const COMMON = `You are one agent of the Night Shift operators run (building the Wren and Moth operator characters; pre-production only, no game integration). Michael is asleep: decide everything yourself, never wait for an answer, never ask questions.
- Work only in ${REPO} on branch feature/operators (Git Bash: /c/NightShift/Mobile-Coop-operators). Never switch branches; never touch C:\\NightShift\\Mobile-Coop or any other worktree; never merge into anything. Branch guard before any git command that writes: ${GUARD}
- Read, in this order and nothing more: CLAUDE.md, docs/operators/RULES.md (sections "Hard rules", "Unattended run", "Step loop"), docs/operators/STATE.md, the step file in docs/operators/steps/, then only the files the step file lists (grep and line ranges, not whole large files). DECISIONS.md by grep only. Ignore "Chaining", "start the next step" and the step file's "Finish": the workflow chains and commits.
- Michael's PC: GPU renders use E2E_GPU=1 and E2E_PORT=4191 (RTX 4090). Blender 5.2.2 LTS runs headless from C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe via scripts/operators/blender.mjs. Never claim a visual result that was not rendered on the hardware GPU.
- Pipeline: \`npm run operators:build [-- wren|moth] [--render]\`, then \`npm run operators:check\`. Lab and sheets: \`npm run operators\`, \`E2E_GPU=1 E2E_PORT=4191 npm run operators:sheet -- <id> [--only ...]\` (they serve their own on 4191; never start a server for them). New garments and kit items go in GARMENTS in scripts/operators/export-gltf.mjs.
- PORT 4191 HARD RULE: free it before any Lab, sheet or preview run and before you finish: ${PORT_FREE} ; then \`netstat -ano | grep ":4191 .*LISTENING"\` must print nothing. "Port 4191 is already in use" means you skipped this: run it and retry once.
- NO HANGS: every shell command has a timeout. Anything that may pass 10 minutes (operators:build --render, npm run check, sheets) runs in the background; wait for its notification, never sleep-poll. No dev server, no watch mode. A Blender run with no new output for 15 minutes: kill that PID only (never every blender.exe), log it, change approach. Same error twice with no progress: stop and return done / left. Logs: tail -40 or grep.
- Hard rules: do not edit src/player/characterRig.ts, src/anim/*, src/player/proportions.ts or anything feature/ct-locomotion touches. No Splinter Cell IP, no three-lens goggle, no real brands. Every external file (CC0) goes in docs/art-credits.md. Babylon only through src/core/babylon.ts; strict TS; pure logic in Babylon-free modules with Vitest tests. Never weaken a check to pass it.
- Never install software or download a file: if the step needs one, do everything else and record it as OPEN in the LOG.md draft with exactly what is needed and why.`

const STEPS = [
  { n: '05', title: 'Wren base layer and trousers', file: '05-wren-base-trousers.md', model: 'opus', effort: 'high' },
  { n: '06', title: 'Wren gloves and boots', file: '06-wren-hands-feet.md', model: 'opus', effort: 'high' },
  { n: '07', title: 'Wren hood, optic, mount and comms head kit', file: '07-wren-head.md', model: 'opus', effort: 'high' },
  { n: '08', title: 'Wren plate carrier, harness and belt', file: '08-wren-carrier-harness.md', model: 'opus', effort: 'high' },
  { n: '09', title: 'Wren thigh holster, pack, cables and strobe', file: '09-wren-holster-pack-comms.md', model: 'opus', effort: 'high' },
  { n: '10', title: 'Wren baked maps, LODs, glTF and costs', file: '10-wren-bake-lod-export.md', model: 'opus', effort: 'high' },
  { n: '11', title: 'Wren full render set and self-review', file: '11-wren-final.md', model: 'opus', effort: 'high' },
  { n: '12', title: 'Moth shirt with rolled sleeves, base layer, trousers', file: '12-moth-garments.md', model: 'opus', effort: 'high' },
  { n: '13', title: 'Moth gloves, boots, hood and round optic', file: '13-moth-hands-feet-head.md', model: 'opus', effort: 'high' },
  { n: '14', title: 'Moth climbing harness, chest rig, hardware, pack, comms', file: '14-moth-climbing-kit.md', model: 'opus', effort: 'high' },
  { n: '15', title: 'Moth baked maps, LODs, glTF and costs', file: '15-moth-bake-lod-export.md', model: 'opus', effort: 'high' },
  { n: '16', title: 'Moth full render set and self-review', file: '16-moth-final.md', model: 'opus', effort: 'high' },
  { n: '17', title: 'Shared sheets and the review page', file: '17-shared-and-review.md', model: 'sonnet', effort: 'medium' },
  { n: '18', title: 'Final spec and integration plan', file: '18-final-spec.md', model: 'opus', effort: 'high' },
]

const IMPL_SCHEMA = {
  type: 'object',
  properties: {
    step: { type: 'string' },
    done: { type: 'boolean' },
    summary: { type: 'string' },
    checks: { type: 'object', properties: { operatorsCheck: { type: 'string' }, npmCheck: { type: 'string' } }, required: ['operatorsCheck', 'npmCheck'] },
    renders: { type: 'array', items: { type: 'string' } },
    openItems: { type: 'array', items: { type: 'string' } },
    handover: { type: 'string' },
  },
  required: ['step', 'done', 'summary', 'checks', 'renders', 'openItems', 'handover'],
}

const CHECK_SCHEMA = {
  type: 'object',
  properties: {
    pass: { type: 'boolean' },
    fixes: { type: 'array', items: { type: 'string' } },
    fixFile: { type: 'string' },
    evidence: { type: 'string' },
    rendersReviewed: { type: 'array', items: { type: 'string' } },
  },
  required: ['pass', 'fixes', 'fixFile', 'evidence', 'rendersReviewed'],
}

const FIN_SCHEMA = {
  type: 'object',
  properties: { ok: { type: 'boolean' }, commit: { type: 'string' }, failures: { type: 'array', items: { type: 'string' } } },
  required: ['ok', 'commit', 'failures'],
}

function implPrompt(s, handover, verdict, round, prevDied) {
  let p = `${COMMON}\n\nYOUR ROLE: implementer. Step ${s.n}: ${s.title}. Follow docs/operators/steps/${s.file}.`
  if (round === 0) {
    p += `\nBudget: about 100 tool calls; over budget, stop and return done=false with what is left.`
  } else {
    p += `\nFIX ROUND ${round} of 3. Budget: about 60 tool calls. An independent checker failed the step. Read its fix list (${verdict && verdict.fixFile ? verdict.fixFile : 'below'}) and fix exactly those items; do not redo finished work (git status and git diff HEAD show what is already built). Fix list:\n- ${verdict ? verdict.fixes.join('\n- ') : 'the checker returned nothing: re-run the step checks and fix what fails'}`
  }
  if (prevDied) p += `\nThe previous agent of this step died mid-work: check git status and continue from what is there.`
  p += `\n\nHANDOVER from the previous step (verbatim):\n${handover}`
  p += `\n\nDo the step, render on the GPU, make the step file's checks, \`npm run operators:check\` and \`npm run check\` pass. Record judgement calls in DECISIONS.md as assumed decisions (next free A-number). Draft the "## Step ${s.n} - ${s.title}" record in docs/operators/LOG.md (built, numbers, open items) and rewrite docs/operators/STATE.md short (now: the next step, key facts, open questions). Do NOT commit, push or send files: the checker reviews your uncommitted work, then the workflow commits. Free port 4191 before you return.
Return JSON: {step, done, summary (<=80 words), checks: {operatorsCheck, npmCheck} (result lines), renders: [absolute PNG paths of this step's renders], openItems, handover (<=150 words: facts the next step needs: new files, commands, numbers, gotchas)}.`
  return p
}

function checkPrompt(s, impl, round) {
  const fixFile = `docs/operators/steps/${s.n}-fixes-r${round + 1}.md`
  return `${COMMON}\n\nYOUR ROLE: independent checker for step ${s.n} (${s.title}), check round ${round}. You did not build it; be strict and fair. Edit nothing except your fix list file. Budget: about 60 tool calls.
The implementer's report: ${JSON.stringify(impl)}
1. Read the step file docs/operators/steps/${s.file} (its Checks), ART-DIRECTION.md (the render check section, grep for it) and SPEC.md Section 1 (the detail standard and checklist; grep and line ranges).
2. Inspect the uncommitted work: git status -s, git diff HEAD --stat, then the diffs that matter. Fail on: edits to forbidden files (src/player/characterRig.ts, src/anim/*, src/player/proportions.ts), any loosened threshold in scripts/operators/check.mjs or tests, real brands or Splinter Cell shapes, new external files missing from docs/art-credits.md, new items missing from GARMENTS, a missing LOG.md draft for step ${s.n}.
3. Re-run \`npm run operators:check\` and \`npm run check\` yourself (background if long; wait for the notification).
4. Read every render PNG of this step with the Read tool (the implementer's list, plus anything new under docs/operators/mockups/). Confirm they are newer than HEAD and were made with E2E_GPU=1. Judge each against the step's Checks, the ART-DIRECTION render check and SPEC 1; cite file and view for each verdict. Look hard for: clipping and interpenetration, floating or detached parts, stretched or swimming textures, missing seams / stitches / hardware the step asks for, wrong materials (plastic sheen on fabric), silhouettes that read as generic or as a copied product.
5. A FAIL is anything the step file's Checks, ART-DIRECTION or SPEC 1 require that is missing or wrong. Cosmetic preferences beyond those are notes, not fails.
If FAIL: write a numbered fix list to ${fixFile} (each item: what is wrong, where (file:line or render + view), what done looks like), and return pass=false, fixes (the same items), fixFile="${fixFile}". If PASS: return pass=true, fixes=[], fixFile="".
evidence: <=100 words (check results, render verdict). Free port 4191 before you return.`
}

function finishPrompt(s, impl, verdict, passed, rounds, next) {
  return `You finish step ${s.n} (${s.title}) of the Night Shift operators run in ${REPO} on branch feature/operators. Never switch branches, never touch other worktrees, never merge. Budget: about 30 tool calls. Every shell command has a timeout.
Result: ${passed ? `PASSED the independent check after ${rounds} fix round(s).` : `OPEN: still failing after 3 fix rounds. Last fix list: ${verdict && verdict.fixFile ? verdict.fixFile : '(none written)'}.`}
Implementer report: ${JSON.stringify(impl)}
Checker verdict: ${JSON.stringify(verdict)}
1. Branch guard: ${GUARD}
2. docs/operators/LOG.md: make sure a "## Step ${s.n} - ${s.title}" record exists (write a short one from the reports if missing) and ends with a status line: ${passed ? `"Status: passed the independent check (fix rounds: ${rounds})."` : `"Status: OPEN after 3 fix rounds; evidence: <fix list path>; remaining: <items>."`}
3. docs/operators/STATE.md: "Now" is ${next ? `step ${next.n} (${next.title})` : 'the run is complete: Michael reviews (RUN-SUMMARY.md)'}.${passed ? '' : ' Add this step\'s remaining failures under "Open questions for Michael".'}
4. Free port 4191: ${PORT_FREE}
5. git add -A, then git status -s: if anything unexpected appears (large binaries outside docs/operators/mockups, files under build/), unstage it and note it. Commit with message "operators: step ${s.n} - ${s.title}${passed ? '' : ' (OPEN)'}" ending with a blank line and "Co-Authored-By: Claude ${s.model === "sonnet" ? "Sonnet" : "Opus"} 5.5 <noreply@anthropic.com>". Then git push -u origin feature/operators.
6. Confirm git status -sb shows a clean tree, not ahead of origin/feature/operators. If push fails, retry once.
7. Send Michael the step's renders (up to 6 of the most telling PNGs from the reports; for a tooling step, its screenshots) with SendUserFile (status proactive, display render) and a three-line caption: built, ${passed ? 'passed' : 'OPEN'}, open items.
Return {ok (true only if committed, pushed, clean and not ahead), commit (HEAD hash), failures}.`
}

phase('Steps')
const from = (args && args.from) || '05'
const todo = STEPS.filter(s => s.n >= from)
let handover = (args && args.handover) || 'Steps 1-4 and 03b are done (LOG.md); see docs/operators/STATE.md. Earlier steps passed their own checks; from this run on, an independent Opus checker reviews each step.'
const results = []
let stopped = null

for (let i = 0; i < todo.length; i++) {
  const s = todo[i]
  const next = todo[i + 1] || null
  const implOpts = r => ({ label: r === 0 ? `step ${s.n}` : `step ${s.n} fix r${r}`, phase: 'Steps', schema: IMPL_SCHEMA, model: s.model, effort: s.effort })
  const checkOpts = r => ({ label: `check ${s.n} r${r}`, phase: 'Steps', schema: CHECK_SCHEMA, model: 'opus', effort: 'high' })
  log(`Step ${s.n}: ${s.title}`)

  let impl = await agent(implPrompt(s, handover, null, 0, false), implOpts(0))
  let verdict = await agent(checkPrompt(s, impl, 0), checkOpts(0))
  let rounds = 0
  while ((!verdict || !verdict.pass) && rounds < 3) {
    rounds++
    log(`Step ${s.n}: check failed, fix round ${rounds} of 3`)
    const fixed = await agent(implPrompt(s, handover, verdict, rounds, !impl), implOpts(rounds))
    if (fixed) impl = fixed
    verdict = await agent(checkPrompt(s, impl, rounds), checkOpts(rounds))
  }
  const passed = !!(verdict && verdict.pass)

  let fin = await agent(finishPrompt(s, impl, verdict, passed, rounds, next), { label: `finish ${s.n}`, phase: 'Steps', schema: FIN_SCHEMA, model: 'sonnet', effort: 'medium' })
  if (!fin || !fin.ok) {
    fin = await agent(finishPrompt(s, impl, verdict, passed, rounds, next) + `\nA previous finish attempt failed: ${JSON.stringify(fin)}. Fix that first.`, { label: `finish ${s.n} retry`, phase: 'Steps', schema: FIN_SCHEMA, model: 'sonnet', effort: 'medium' })
  }
  results.push({ step: s.n, title: s.title, status: passed ? 'passed' : 'open', fixRounds: rounds, commit: fin ? fin.commit : '', openItems: impl ? impl.openItems : [], renders: impl ? impl.renders : [], fixFile: verdict ? verdict.fixFile : '' })
  if (!fin || !fin.ok) {
    stopped = { step: s.n, why: fin ? fin.failures : ['finish agent returned nothing'] }
    log(`Step ${s.n}: could not commit and push cleanly; stopping the run`)
    break
  }
  handover = JSON.stringify({ previousStep: s.n, status: passed ? 'passed' : 'OPEN', commit: fin.commit, handover: impl ? impl.handover : 'implementer returned nothing', openItems: impl ? impl.openItems : [], remainingFixes: passed ? [] : (verdict ? verdict.fixes : []) })
}

phase('Summary')
const summary = await agent(`Write the run summary for the Night Shift operators run in ${REPO} on branch feature/operators (never switch branches, never touch other worktrees). Every shell command has a timeout.
Per-step results (JSON): ${JSON.stringify(results)}
${stopped ? `The run STOPPED early at step ${stopped.step}: ${JSON.stringify(stopped.why)}. Say so first, with the exact resume command: Workflow({scriptPath: "${REPO}\\\\docs\\\\operators\\\\run.workflow.js", args: {from: "<first step not done>"}}).` : ''}
1. Branch guard: ${GUARD}
2. Write docs/operators/RUN-SUMMARY.md: a short intro (steps run by the workflow, each checked by an independent Opus checker with up to 3 fix rounds), then a table per step: step, title, passed / OPEN, fix rounds, commit (short hash), open items, where the renders are. Then "Open questions for Michael" (also read the list in docs/operators/STATE.md) and "What Michael does next" (the review page from step 17, the final spec from step 18). Plain language; hyphens, never em dashes.
3. Commit with message "operators: run summary" ending with a blank line and "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>", and git push -u origin feature/operators.
4. Send it to Michael with SendUserFile (files: ["${REPO}\\docs\\operators\\RUN-SUMMARY.md"], status proactive, caption: one line with passed / open counts).
Return {commit, passedCount, openCount, path}.`, {
  label: 'run summary', phase: 'Summary', model: 'sonnet', effort: 'medium',
  schema: { type: 'object', properties: { commit: { type: 'string' }, passedCount: { type: 'number' }, openCount: { type: 'number' }, path: { type: 'string' } }, required: ['commit', 'passedCount', 'openCount', 'path'] },
})

return { stopped, results: results.map(r => ({ step: r.step, status: r.status, fixRounds: r.fixRounds, commit: r.commit })), summary }
