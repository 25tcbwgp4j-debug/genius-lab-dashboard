# AI Diagnosis Module — Audit & Finalization

**Date:** 2025-03-10  
**Scope:** Provider abstraction, prompt builder, Zod schema, response structure, storage, logging, error handling, retry, guarantees, UI.

---

## 1. Verification Summary

| Area | Status | Notes |
|------|--------|--------|
| Provider abstraction | ✅ | `IAIDiagnosisProvider` in `lib/ai/provider.ts`; `OpenAIDiagnosisAdapter` implements it. |
| Prompt builder | ✅ | `buildDiagnosisPrompt()` in `lib/ai/prompt-builder.ts`; system + user messages, Italian, structured JSON. |
| Zod validation schema | ✅ | `aiDiagnosisResponseSchema` in `lib/ai/schemas.ts`; hypotheses, suggested_checks, probable_parts, complexity, risk_notes, confidence_score (0–1), next_actions. |
| AI response structure | ✅ | `AIDiagnosisResult` in provider; `parseAIResponse()` normalizes (strips markdown code block) and parses. |
| AI result storage | ✅ | Insert into `ticket_ai_diagnosis`; update only `tickets.ai_*` (never `diagnosis`). |
| AI logging | ✅ | `services/ai-diagnosis/logger.ts`; structured log (ticketId, success, durationMs, diagnosisId, errorCode, errorMessage) on start/fail/success. |
| AI error handling | ✅ | Typed `RunAIDiagnosisErrorCode`: ticket_not_found, device_not_found, provider_error, validation_error, storage_error. |
| AI retry handling | ✅ | Up to 3 attempts with exponential backoff (800ms, 1.6s, 3.2s, cap 6s) in `run-diagnosis.ts`. |

---

## 2. Guarantees

### AI never overwrites technician diagnosis

- **Storage:** `runAIDiagnosis()` writes only to:
  - `ticket_ai_diagnosis` (new row per run)
  - `tickets.ai_diagnosis_summary`, `ai_recommended_actions`, `ai_risk_flags`, `status`
- **Never written:** `tickets.diagnosis` is not touched by any AI code. It is technician-only.

### AI results are optional suggestions

- AI output is stored as suggestions (ai_* fields and ticket_ai_diagnosis rows).
- The ticket’s main **Diagnosi e note** content comes from `tickets.diagnosis` (technician field).
- The UI labels the block as “Suggerimento diagnosi AI” and states that the AI does not overwrite the technician’s diagnosis.

### Technician can accept / discard / regenerate

- **Accept:** `acceptAIDiagnosisSuggestionAction(ticketId, suggestionText)` appends to `tickets.diagnosis` with a separator “--- Suggerimento AI accettato ---”. Does not overwrite.
- **Discard:** `discardAIDiagnosisSuggestionAction(ticketId)` clears `ai_diagnosis_summary`, `ai_recommended_actions`, `ai_risk_flags`. History remains in `ticket_ai_diagnosis`.
- **Regenerate:** `generateAIDiagnosisAction(ticketId)` runs a new diagnosis; new row in `ticket_ai_diagnosis` and ticket ai_* fields updated. RBAC: `canUseAIDiagnosis`, `canEditDiagnosis` enforced in actions.

---

## 3. UI Improvements

- **Risk flags:** Shown in a dedicated “Avvertenze e rischi” box (amber border/background). Uses `latestDiagnosis.risk_notes` when available, otherwise `ticket.ai_risk_flags` (split by `;`).
- **Confidence score:** Shown as a progress bar (0–100%), numeric percentage, and badge (Alta / Media / Bassa) with color (green / amber / red).
- **Suggested actions:** “Prossime azioni consigliate” is a dedicated section listing `latestDiagnosis.next_actions` with an icon. Accept button still copies hypotheses + next_actions into diagnosis notes.

---

## 4. Data Flow

1. **Generate:** User clicks “Genera suggerimento” / “Rigenera” → `generateAIDiagnosisAction` → `runAIDiagnosis(ticketId)`.
2. **Run:** Load ticket + device + prior repairs → build input → call provider with retry (3 attempts) → parse with Zod → insert `ticket_ai_diagnosis` → update ticket ai_* and status → insert `ticket_events` (ai_diagnosis_generated) → log success/failure.
3. **Accept:** User clicks “Accetta nelle note” → `acceptAIDiagnosisSuggestionAction` → append to `tickets.diagnosis`.
4. **Discard:** User clicks “Scarta” → `discardAIDiagnosisSuggestionAction` → clear ticket ai_* only.

---

## 5. Files Touched (Finalization)

- `services/ai-diagnosis/logger.ts` — new; structured AI diagnosis logging.
- `services/ai-diagnosis/run-diagnosis.ts` — retry loop, error codes, logging, storage error handling.
- `components/tickets/ai-diagnosis-block.tsx` — risk alert box, confidence bar + badge, “Prossime azioni consigliate” section.
- `docs/AI-DIAGNOSIS-AUDIT.md` — this audit.

---

## 6. Finalization (audit pass)

- **Single event:** `generateAIDiagnosisAction` no longer inserts `ticket_events`; only `runAIDiagnosis` does (avoids duplicate `ai_diagnosis_generated`).
- **Request logging:** `runAIDiagnosis` logs at start (`AI diagnosis request started`) and on success/failure for full request/result audit.
- **Provider factory:** `getProvider()` in `run-diagnosis.ts` reads `AI_DIAGNOSIS_PROVIDER` (default `openai`); throws if unsupported.
- **Zod parsing:** `parseAIResponse()` uses `safeParse` and returns clear errors for JSON vs schema failures.
- **No overwrite:** Ticket update in `runAIDiagnosis` uses an explicit object (no `diagnosis` key). Accept action comment: append-only to `tickets.diagnosis`.
- **UI labels:** Hypotheses section titled “Ipotesi di guasto (probabili cause)”; suggested checks “Controlli consigliati”.

## 7. Optional Next Steps

- **Persist logs:** If required, add table `ai_request_log` (ticket_id, success, duration_ms, error_code, created_at) and write from `logAIDiagnosis`.
- **Rate limit:** Throttle generate/regenerate per ticket or per user to avoid API overuse.
