---
name: Sprint 57 — Lead-magnet → BP-01 autowire + Hot-Leads deep-link
description: enroll-subscriber treats BP-01 as global welcome (parity with master_nurture); submit-funnel logs nurture_autowired and seeds quiz finishers at score 5; Revenue Dashboard Hot Leads rows deep-link to CRM contact panel via author-crm?contactId=
type: feature
---

## Rules

- `enroll-subscriber` matches every flow where `flow_type === 'master_nurture'`, `flow_type === 'BP-01'`, `node_id === 'BP-01'`, OR `node_id === body.node_id`. De-dupe by `flow.id`. BP-01 is the always-on welcome/nurture engine — never gate it behind a node match.
- `submit-funnel`: quiz finishers (quiz_responses.length > 0) seed `crm_contacts.abby_score=5`; raw opt-ins stay at 2. Existing contacts upgrade to `MAX(current, baseScore)`.
- After enroll-subscriber returns, `submit-funnel` writes one `lead_activities` row with `activity_type='nurture_autowired'` and `metadata.enrollments` = the array returned by enroll-subscriber. Use this to show the autowire chip on the contact timeline.
- Dashboard `handleNavigate(section)` accepts a `"section?key=val"` shorthand. The query string is merged into URL params and `setActiveSectionState` is called with the resolved section. Use this to deep-link from any child component without coupling to react-router.
- Revenue Dashboard "Hot Leads Today" rows are buttons that call `onNavigate('author-crm?contactId=<id>')`. The CRM page (Sprint 36b code at line 104-124 of AuthorCRMPage.tsx) consumes `?contactId=` and opens the ContactDetailPanel automatically, then strips the param.

## Why

BP-02 lead-magnet submissions previously only enrolled into `master_nurture` + the BP-02 flow itself. The actual welcome series lives in BP-01, so newly captured leads silently received no follow-up. Treating BP-01 as global parity with master_nurture closes the gap without forcing authors to wire anything per-node.

## How to apply

- New flow types added in the future: classify them as either node-specific (filtered by `node_id`) OR global (add to the BP-01/master_nurture allowlist).
- Any future lead-capture entry point should call `enroll-subscriber` with `node_id` set; do not duplicate the BP-01 enrollment logic at the call site.
