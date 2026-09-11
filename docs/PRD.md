# Growth Mentor — PRD

## Problem
Personal growth coaching is expensive ($200–$500/mo). Existing tools optimize for marginal 2x improvements, keeping users in safe, linear cycles. We force a 10x frame by anchoring every goal to a 10-year vision, so weekly action compounds toward exponential outcomes.

## Target User
The builder and their students — self-directed learners tracking goals across health, soft skills, and education, guided by an AI mentor instead of a human coach.

## Core Objects
- **Vision** — a single 10-year north-star statement; the system's primary constraint.
- **Goal** — long-term or short-term, linked to a domain (health, soft skill, education, other), aligned upward to the Vision.
- **Domain** — health, soft skill, education, other (taxonomy).
- **WeekScoreCard** — one record per user per week; aggregates scores across goals + health + soft-skill + education into a composite weekly score with a trend.
- **Activity** — atomic logged action (type, duration, value) linked to a goal; feeds the weekly scorecard.

## MVP (v1) Checklist
- [ ] Set / edit a 10-year Vision statement
- [ ] Create, edit, complete goals (short + long term), each tagged to a domain
- [ ] Log daily activities against goals
- [ ] Auto-generate weekly scorecard with composite score + per-domain breakdown + week-over-week trend
- [ ] Dashboard: current week scorecard, goal progress bars, activity feed
- [ ] Seed data so the app renders instantly for anonymous visitors

## Non-Goals (v1)
- No human-coach review or approval workflows
- No login / signup / auth wall
- No notifications, reminders, or messaging
- No payment, billing, or multi-tenant accounts
- No social / sharing features

## Success Criteria
A user opens the app (no login), sees a seeded vision and goals, logs a new activity against a goal, and the weekly scorecard recomputes — score, per-domain breakdown, and trend update on screen in real time.