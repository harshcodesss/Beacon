# Installing the Beacon GitHub Action

The Action runs Beacon's triage when your deploy workflow fails, delivers the
report to your Beacon dashboard, and comments it on the pull request that
triggered the deploy.

## 1. Get a project API key

1. Sign in to Beacon and open your project's **Settings**.
2. Under **API keys**, click **Generate API key**.
3. Copy the `beacon_sk_...` value immediately — it is stored hashed and shown
   only once.

## 2. Add the key as a repository secret

In your repository: **Settings → Secrets and variables → Actions → New
repository secret**, name it `BEACON_API_KEY`, paste the key.

## 3. Add the workflow

Create `.github/workflows/beacon-triage.yml`. The recommended trigger is
`workflow_run` on your deploy workflow, filtered to failures:

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

      # Fetch the logs you want triaged into the workspace here, e.g. from
      # your log shipper, a deploy artifact, or the failed run's artifacts.

      - name: Triage the failure
        uses: harshcodesss/Beacon/action@main
        with:
          beacon_api_key: ${{ secrets.BEACON_API_KEY }}
          log_path: ./logs/app.log
          window_minutes: 30
```

## Inputs

| Input            | Required | Default                  | Description                                             |
| ---------------- | -------- | ------------------------ | ------------------------------------------------------- |
| `beacon_api_key` | yes      | —                        | Project API key from Beacon settings                    |
| `log_path`       | no       | `./logs/app.log`         | Log file to triage, relative to the workspace           |
| `window_minutes` | no       | `30`                     | Trailing minutes of logs handed to the agent            |
| `api_url`        | no       | `https://api.beacon.dev` | Beacon API base URL (point at your own deployment)      |
| `github_token`   | no       | workflow token           | Token used to comment; pass `""` to disable commenting  |

## Outputs

| Output        | Description                                          |
| ------------- | ---------------------------------------------------- |
| `incident_id` | ID of the incident created in Beacon                 |
| `report_path` | Path to the rendered markdown report in the workspace |

## What the Action does

1. Collects the trailing `window_minutes` of `log_path` (falls back to the
   last 2000 lines when log lines carry no ISO timestamps).
2. Runs triage in its own container and POSTs the finished report to
   `{api_url}/webhook/github`, authenticated with your API key — it appears
   in the dashboard as a *Done* incident with trigger `action`.
3. Comments the report on the pull request associated with the failed run
   (or the triggering issue/PR for `issues` / `pull_request` events).

Delivery problems (unreachable API, comment permission missing) surface as
workflow warnings; only a triage failure fails the step.

## Notes

- Rate limit: webhook calls are limited per key
  (`WEBHOOK_RATE_LIMIT_PER_MINUTE`, default 30/min).
- Self-hosting: set `api_url` to your deployment's API origin and make sure
  it is reachable from your runners.
- You can also hit the webhook directly (`X-Beacon-Key: beacon_sk_...`):
  POST with a `report_md` body ingests a finished report; POST with an empty
  body enqueues a server-side triage run.
