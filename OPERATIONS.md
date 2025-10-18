# Operations Guide: Make webhook dispatch

## Workflow entry point
- File: `.github/workflows/dispatch-post-make.yml`
- Trigger: `workflow_dispatch`
- Inputs:
  - `action` (string, required): Logical operation to run in Make, e.g., `send_otp`.
  - `payload_json` (string, optional): JSON payload forwarded to Make. Defaults to an empty object when omitted.

The dispatcher calls `.github/workflows/reusable-post-make.yml`, which signs the payload and enforces the `prod` environment protections before delivering the request to Make.

## Triggering the workflow
1. **GitHub UI**
  - Navigate to **Actions → Dispatch Make Webhook → Run workflow**.
  - Select the target branch (usually `main`).
  - Fill in `action` and, when needed, paste a compact JSON string into `payload_json`.
  - Click **Run workflow**. Monitor the run until the environment approver authorizes execution.
2. **GitHub CLI**
  ```bash
  gh workflow run dispatch-post-make.yml \
    --ref main \
    --field action=send_otp \
    --field payload_json='{"phone":"+5511987654321"}'
  ```
  Approvers will receive a notification to unblock the `prod` environment. Use `gh run watch` to stream the logs after approval.

## Example payloads
- `user.register`: payload enviado pelo cliente via `/api/github/dispatch`, consulte `shared/js/auth/register.js` para o formato completo.
- `send_otp`: `{ "phone": "+5511987654321", "channel": "sms" }`
- `sync_catalog`: `{ "force": true }`
- `noop`: `{}` (relies on Make defaults)

Remember to keep the JSON single-line to avoid parsing issues in the workflow dispatch dialog.

## Expected responses
When the workflow succeeds you will see:
- Step **Prepare signed payload** finishing with status `success`.
- Step **Invoke Make webhook** returning HTTP 200/202. Failures throw `curl` errors with the upstream HTTP status in the log tail.
- The `post-make` job summary will echo the headers (`X-Signature`, `X-Timestamp`, `X-Nonce`) for auditing without revealing the payload body.

Any failure in signature preparation halts before the webhook call, preventing partial deliveries.

## Curl smoke test
Use the GitHub REST API to emulate the UI trigger. Replace `${TOKEN}` with a PAT that has `workflow` scope.
```bash
curl -sSf -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/<org>/Projeto-marco/actions/workflows/dispatch-post-make.yml/dispatches \
  -d '{
    "ref": "main",
    "inputs": {
      "action": "send_otp",
      "payload_json": "{\"phone\":\"+5511987654321\",\"channel\":\"sms\"}"
    }
  }'
```
A `204 No Content` response confirms the dispatch was accepted. Approval is still required before the Make call runs.

## Troubleshooting
- **`Missing required secret` errors**: Confirm `HMAC_SHARED_SECRET`, `MAKE_WEBHOOK_URL`, and `MAKE_API_KEY` are stored in the `prod` environment secrets.
- **`payload_json must be valid JSON`**: Ensure the string is valid JSON. Escape double quotes when using CLI or API calls.
- **HTTP 401/403 from Make**: Rotate `MAKE_API_KEY` and confirm the `x-make-apikey` header is present. Check for recent key scoping changes inside Make.
- **Stalled in `Waiting` state**: Ping an environment approver to authorize the `prod` environment.
