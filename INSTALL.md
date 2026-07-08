# Installing the Beacon GitHub Action

The Action runs Beacon's triage when your deploy workflow fails and comments an
evidence-cited root-cause report on the pull request that triggered the deploy.
**You bring your own LLM key and choose the model** (any LangChain provider) —
see the [model-efficiency table in the README](README.md#model-efficiency) to
pick a tier. Delivering to a Beacon dashboard is optional.

## 1. Add your LLM provider key as a repository secret

Pick a model and set the matching key. In your repository:
**Settings → Secrets and variables → Actions → New repository secret**.

| Model (`llm_model`)                    | Secret to set    | Get a key                                             |
| -------------------------------------- | ---------------- | ----------------------------------------------------- |
| `google_genai:gemini-3.1-flash-lite`   | `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |
| `openai:gpt-4o`                        | `OPENAI_API_KEY` | [OpenAI](https://platform.openai.com/api-keys)         |

> Without any provider key the Action still runs — it falls back to a bundled
> mock that emits a canned demo report, so you can wire up the workflow before
> committing a key.

## 2. Add the workflow

Create `.github/workflows/beacon-triage.yml`. The recommended trigger is
`workflow_run` on your deploy workflow, filtered to failures. **Check out your
repo first** — the agent reads your log file and recent commit history from the
workspace:

```yaml
name: Beacon triage

on:
  workflow_run:
    workflows: ["Deploy"]        # name of your deploy workflow
    types: [completed]

permissions:
  contents: read
  issues: write                  # comment on the triggering PR/issue
  pull-requests: write

jobs:
  triage:
    if: ${{ github.event.workflow_run.conclusion == 'failure' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 5         # recent commits are evidence for the agent

      # Fetch the logs you want triaged into the workspace here, e.g. from
      # your log shipper, a deploy artifact, or the failed run's artifacts.

      - name: Triage the failure
        uses: harshcodesss/Beacon@main
        with:
          llm_model: google_genai:gemini-3.1-flash-lite   # see README
          gemini_api_key: ${{ secrets.GEMINI_API_KEY }}
          log_path: ./logs/app.log
          window_minutes: 30
```

Per-agent model tiering (strong model on the generator/reporter, cheap on the
call-heavy investigator — the benchmark's cost-optimal split) is available by
setting step `env`:

```yaml
        env:
          BEACON_GENERATOR_MODEL: google_genai:gemini-3.5-flash
          BEACON_REPORTER_MODEL: google_genai:gemini-3.5-flash
          BEACON_INVESTIGATOR_MODEL: google_genai:gemini-3.1-flash-lite
```

## Inputs

| Input            | Required | Default                              | Description                                             |
| ---------------- | -------- | ------------------------------------ | ------------------------------------------------------- |
| `llm_model`      | no       | `google_genai:gemini-3.1-flash-lite` | Provider-prefixed model string (any LangChain provider) |
| `gemini_api_key` | no\*     | —                                    | Google/Gemini key, for `google_genai:` models           |
| `openai_api_key` | no\*     | —                                    | OpenAI key, for `openai:` models                        |
| `log_path`       | no       | `./logs/app.log`                     | Log file to triage, relative to the workspace           |
| `window_minutes` | no       | `30`                                 | Trailing minutes of logs handed to the agent            |
| `beacon_api_key` | no       | —                                    | Beacon dashboard key; omit to skip dashboard delivery   |
| `api_url`        | no       | `https://api.beacon.dev`             | Beacon API base URL (point at your own deployment)      |
| `github_token`   | no       | workflow token                       | Token used to comment; pass `""` to disable commenting  |

\* Set the key matching your `llm_model`. Without any provider key the Action
runs the bundled mock.

## Customizing what gets triaged

Drop a `beacon.yml` at your repo root to override defaults (otherwise the
Action synthesizes one from the inputs):

```yaml
service: my-api
logs:
  adapter: file
  path: ./logs/app.log
repo:
  path: .
  diff_window: 5      # how many recent commits to inspect as evidence
budget:
  max_tool_calls: 15  # hard per-incident cap on the investigator loop
  max_tokens: 60000
```

## Outputs

| Output        | Description                                          |
| ------------- | ---------------------------------------------------- |
| `incident_id` | ID of the incident created in Beacon                 |
| `report_path` | Path to the rendered markdown report in the workspace |

## What the Action does

1. Picks the engine: the **real agent core** when `gemini_api_key` is set
   (it ships inside the Action image), otherwise the bundled **mock**.
2. Points the agent at your checked-out workspace — its own log file and git
   history — clusters the log window, generates and verifies competing
   root-cause hypotheses under a hard tool-call budget, and writes the
   evidence-cited report to `beacon-report.md` in the workspace.
3. Comments the report on the pull request associated with the failed run
   (or the triggering issue/PR for `issues` / `pull_request` events).
4. If `beacon_api_key` is set, also POSTs the report to
   `{api_url}/webhook/github` so it appears in your Beacon dashboard as a
   *Done* incident. Omit the key to skip dashboard delivery entirely.

Delivery and comment problems (unreachable API, missing permission) surface as
workflow warnings; only a triage failure fails the step.

## Notes

- Rate limit: webhook calls are limited per key
  (`WEBHOOK_RATE_LIMIT_PER_MINUTE`, default 30/min).
- Self-hosting: set `api_url` to your deployment's API origin and make sure
  it is reachable from your runners.
- You can also hit the webhook directly (`X-Beacon-Key: beacon_sk_...`):
  POST with a `report_md` body ingests a finished report; POST with an empty
  body enqueues a server-side triage run.
