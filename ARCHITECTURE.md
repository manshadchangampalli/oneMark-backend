# oneMark — Backend Architecture

A complete design for the oneMark study app backend. Reverse-engineered from the 5 frontend screens (Home, Practice, Question, Progress, Profile) so every UI element has a backing endpoint and every endpoint has a backing table.

---

## 1. Tech stack

| Layer            | Choice                                               | Why                                                                 |
| ---------------- | ---------------------------------------------------- | ------------------------------------------------------------------- |
| Language         | TypeScript                                           | Same as frontend; share DTO types via a `shared/` package.          |
| Framework        | **NestJS 10**                                        | Module system, DI, validation, OpenAPI generation out of the box.   |
| Database         | **PostgreSQL 16**                                    | Relational fits the domain; JSONB for flexible payloads.            |
| ORM              | **Prisma**                                           | Schema-first migrations, great DX with NestJS, type-safe queries.   |
| Cache / queues   | **Redis 7**                                          | Leaderboard, daily challenge cache, rate-limit counters, BullMQ.    |
| Background jobs  | **BullMQ**                                           | NestJS first-class integration via `@nestjs/bullmq`.                |
| Auth             | JWT access + rotating refresh tokens; OAuth (Google) | Stateless, mobile-friendly, supports `Linked accounts` UI.          |
| Realtime         | **Socket.IO** gateway                                | Chat between buddies + live notification badge.                     |
| Object storage   | S3 / Cloudflare R2                                   | Avatars (future), data exports.                                     |
| Email            | Resend / Postmark                                    | Password reset, weekly digest.                                      |
| Push             | FCM (Android/Web) + APNs (iOS)                       | Daily reminders, streak warnings.                                   |
| Observability    | Pino logs + OpenTelemetry → Grafana                  | Structured logs, traces.                                            |
| Testing          | Jest + Supertest + Testcontainers                    | Unit + e2e against a real Postgres.                                 |

---

## 2. Module layout

```
src/
├── app.module.ts
├── main.ts
├── common/                  # filters, interceptors, decorators, guards
├── prisma/                  # PrismaService, schema.prisma, migrations
├── search/                  # SearchService (abstraction over Postgres FTS → Meilisearch later)
├── modules/
│   ├── auth/                # register, login, refresh, oauth, password, email-change
│   ├── users/               # profile, settings, privacy, linked accounts, export
│   ├── content/             # subjects, topics, questions, revisions (admin-authored)
│   ├── tracks/              # exam tracks, question↔track mappings, user↔track
│   ├── practice/            # sessions, attempts, recent history
│   ├── daily-challenge/     # today's question + attempt
│   ├── explanations/        # official + community explanations, votes, comments
│   ├── bookmarks/
│   ├── progress/            # stats, mastery, accuracy, heatmap, streak, weekly
│   ├── achievements/
│   ├── leaderboard/
│   ├── social/              # friendships, conversations, messages
│   ├── notifications/       # in-app + push devices
│   ├── mocks/               # blueprints, scheduled events, user reminders
│   ├── sync/                # offline pull-sync endpoint
│   ├── organizations/       # cohorts, school dashboards (B2B)
│   └── admin/               # question authoring, moderation, feature flags
└── jobs/                    # BullMQ processors (cron + queued)
```

---

## 3. Database design

### 3.1 Conventions

- All tables use `id uuid` primary keys (`gen_random_uuid()`), unless explicitly composite.
- All tables have `created_at timestamptz default now()`. Mutable rows also have `updated_at`.
- Soft-delete only where review/audit is needed (explanations, messages). Otherwise hard delete.
- Prefer `citext` for emails / handles.
- Time stored UTC; date-only fields use `date`.
- Use **denormalized counters** (`upvotes_count`, `attempts_count`) updated in transactions, validated by a nightly reconcile job.

### 3.2 Tables

#### Auth & identity

**users**
| col              | type         | notes                                              |
| ---------------- | ------------ | -------------------------------------------------- |
| id               | uuid pk      |                                                    |
| email            | citext uniq  | nullable for OAuth-only accounts                   |
| password_hash    | text         | argon2id; null for OAuth-only                      |
| name             | text         | "Riya Subramanian"                                 |
| avatar_initial   | char(1)      | derived from name; cached for the Avatar component |
| avatar_tone      | text         | "accent" \| "neutral"                              |
| school           | text         | "St. Xavier's, Mumbai"                             |
| grade            | text         | "Class 12"                                         |
| target_exam      | text         | "JEE 2026"                                         |
| joined_at        | timestamptz  | shown as "Joined Jan 2025"                         |
| last_active_at   | timestamptz  | drives streak + active presence                    |
| email_verified_at| timestamptz  |                                                    |
| is_suspended     | bool default false | moderator action; 403 on all authenticated endpoints
| deleted_at       | timestamptz null | soft-delete; set on `DELETE /me`; rows retained for audit/legal
| created_at, updated_at |        |                                                    |

Soft-delete filter: all queries add `WHERE deleted_at IS NULL` via Prisma middleware. Hard deletes never happen on users.

Indexes: `users_email_uniq`, `users_last_active_at_idx`, partial `users_active_idx WHERE deleted_at IS NULL`.

**linked_accounts** — Profile → "Linked accounts: Google · Active"
| col              | type        |
| ---------------- | ----------- |
| id               | uuid pk     |
| user_id          | uuid fk     |
| provider         | text        | enum('google','apple')
| provider_user_id | text        |
| email_at_link    | citext      |
| created_at       | timestamptz |

Unique: (provider, provider_user_id). Index: (user_id).

**refresh_tokens** — rotation
| col          | type        |
| ------------ | ----------- |
| id           | uuid pk     |
| user_id      | uuid fk     |
| token_hash   | text uniq   | sha-256 of the opaque token
| device_id    | uuid fk null|
| expires_at   | timestamptz |
| revoked_at   | timestamptz |
| created_at   | timestamptz |

**device_tokens** — push
| col          | type        |
| ------------ | ----------- |
| id           | uuid pk     |
| user_id      | uuid fk     |
| platform     | text        | enum('ios','android','web')
| token        | text uniq   |
| last_seen_at | timestamptz |
| created_at   | timestamptz |

**password_reset_tokens** — `{ token_hash, user_id, expires_at, used_at }`.

#### User-owned settings

**user_settings** — 1:1 with users
| col                 | type    | notes                                       |
| ------------------- | ------- | ------------------------------------------- |
| user_id             | uuid pk |                                             |
| theme               | text    | enum('light','dark','system')               |
| notifications_enabled | bool  | drives Switch toggle                        |
| notify_frequency    | text    | enum('daily','weekly','streak')             |
| language            | text    | BCP-47, e.g. 'en-IN'                        |
| offline_subjects    | uuid[]  | "2 subjects downloaded"                     |
| timezone            | text    | for streak roll-over (e.g. 'Asia/Kolkata')  |
| updated_at          |         |                                             |

#### Exam tracks (M:M — promotes §8 open question to schema)

**tracks** — JEE, NEET, IB, A-Levels, etc.
| col         | type     |
| ----------- | -------- |
| id          | uuid pk  |
| code        | text uniq| 'jee', 'neet', 'ib', 'a-levels', 'generic'
| label       | text     | 'JEE Advanced 2026'
| description | text     |
| is_active   | bool default true |

**subject_tracks** — which subjects belong to which track(s)
| col          | type    | notes |
| ------------ | ------- | ----- |
| subject_id   | uuid fk |       |
| track_id     | uuid fk |       |
| sort_order   | int     | order within this track's subject list |

PK (subject_id, track_id).

Examples:
- Physics → JEE, NEET, KEAM
- Mathematics → JEE, KEAM  (not NEET)
- Biology → NEET  (not JEE, KEAM)
- General Knowledge → PSC
- Malayalam → PSC
- Current Affairs → PSC

**topic_tracks** — which topics belong to which track(s)
| col          | type    | notes |
| ------------ | ------- | ----- |
| topic_id     | uuid fk |       |
| track_id     | uuid fk |       |
| sort_order   | int     |       |

PK (topic_id, track_id).

Topics under the same subject can differ by track:
- "Projectile Motion" (Physics) → JEE, NEET, KEAM
- "Kerala History" (General Knowledge) → PSC only
- "Genetics" (Biology) → NEET only

**question_tracks** — which questions belong to which track(s)
| col          | type    |
| ------------ | ------- |
| question_id  | uuid fk |
| track_id     | uuid fk |

PK (question_id, track_id).

A question can belong to multiple tracks (a Physics MCQ could be valid for both JEE and KEAM).

**user_tracks** — which exams a user is preparing for
| col        | type        |
| ---------- | ----------- |
| user_id    | uuid fk     |
| track_id   | uuid fk     |
| is_primary | bool default false | only one primary per user; drives default scoping of all content, daily challenge, leaderboard, recommendations |
| enrolled_at| timestamptz |

PK (user_id, track_id). Partial unique index: `(user_id) WHERE is_primary` — enforces exactly one primary.

> **Track resolution rule for all content APIs:** if the request includes `?trackId=`, use it (validate user is enrolled). Otherwise use the user's primary track. This means a user enrolled in both JEE and NEET can switch context in the UI with a single query param.

#### Content (admin-authored, read-only for students)

**subjects** — Math, Physics, Chemistry, Biology, English, Reasoning
| col       | type   |
| --------- | ------ |
| id        | uuid pk |
| code      | text uniq | 'phys'
| label     | text  | 'Physics'
| short     | text  | 'PH'
| color_hex | text  | '#D4541A'
| sort_order| int   |

**topics**
| col        | type       |
| ---------- | ---------- |
| id         | uuid pk    |
| subject_id | uuid fk    |
| code       | text       | 'projectile-motion'
| label      | text       | 'Projectile motion'
| sort_order | int        |

Unique (subject_id, code).

**questions**
| col                 | type        | notes                                     |
| ------------------- | ----------- | ----------------------------------------- |
| id                  | uuid pk     |                                           |
| subject_id          | uuid fk     |                                           |
| topic_id            | uuid fk     |                                           |
| difficulty          | text        | enum('easy','medium','hard')              |
| type                | text        | enum('mcq') — extensible later            |
| prompt              | text        | markdown + inline math (`$..$`)           |
| correct_option_id   | uuid        | fk question_options (deferred constraint) |
| official_explanation| jsonb       | `{ steps: string[] }`                     |
| xp_reward           | int default 50 |                                       |
| success_rate        | numeric(5,2) null | % correct across all attempts; updated nightly
| avg_time_seconds    | int null      | average solve time; updated nightly           |
| discrimination_index| numeric(5,2) null | IRT-style: how well it separates high/low performers |
| status              | text default 'published' | enum('draft','published','archived') |
| current_revision_id | uuid null     | FK to question_revisions (deferred); null until first publish |
| created_by          | uuid fk users null | author/admin                       |
| created_at, updated_at |          |                                           |

Indexes: `(subject_id, topic_id)`, `(difficulty)`, `(status)`.

**question_revisions** — append-only, immutable after insert
| col                  | type        |
| -------------------- | ----------- |
| id                   | uuid pk     |
| question_id          | uuid fk     |
| version              | int         | 1, 2, 3…
| prompt               | text        |
| correct_option_label | text        | 'A','B','C','D' (snapshot — option rows can't be mutated)
| official_explanation | jsonb       | `{ steps: string[] }`
| difficulty           | text        |
| xp_reward            | int         |
| created_at           | timestamptz |
| created_by           | uuid fk users null |

Unique (question_id, version). `questions.current_revision_id` always points to the latest.

> **Why both FK directions?** `questions.current_revision_id → question_revisions` for fast "get current" reads. `question_revisions.question_id → questions` for history listing. Both are needed; the deferred constraint breaks the circular dependency at migration time.

**question_options**
| col          | type    |
| ------------ | ------- |
| id           | uuid pk |
| question_id  | uuid fk |
| label        | text    | 'A', 'B', 'C', 'D'
| text         | text    |
| sub          | text    | "≈ 34.64 m"
| sort_order   | int     |

Unique (question_id, label).

#### Daily challenge

**daily_challenges** — one question per (date, track)
| col           | type     | notes |
| ------------- | -------- | ----- |
| id            | uuid pk  |       |
| date          | date     |       |
| track_id      | uuid fk  | PSC students get a GK question; JEE students get a Physics/Math/Chem question |
| question_id   | uuid fk  |       |
| total_solvers | int default 0 | denormalized for "2,148 solved today" |

Unique: (date, track_id).

#### Practice & attempts

**practice_sessions** — one row per Quick Practice / Mock Test / Topic Drill / daily / custom
| col              | type       |
| ---------------- | ---------- |
| id               | uuid pk    |
| user_id          | uuid fk    |
| track_id         | uuid fk    | which exam context this session belongs to |
| mode             | text       | enum('quick','mock','drill','daily','custom')
| subject_id       | uuid fk null | null = "All subjects"
| topic_id         | uuid fk null |
| difficulty       | text       | enum('easy','medium','hard','mixed')
| question_count   | int        |
| time_limit_sec   | int null   | null = untimed
| started_at       | timestamptz|
| finished_at      | timestamptz null |
| score            | int        | correct count
| total            | int        |
| accuracy         | numeric(5,2) generated `(score::numeric/NULLIF(total,0))*100`
| time_spent_sec   | int        |

Indexes: `(user_id, started_at desc)` — drives "Recent attempts".

**session_questions** — fixed ordering of questions in a session
| col          | type    |
| ------------ | ------- |
| session_id   | uuid fk |
| question_id  | uuid fk |
| sort_order   | int     |

PK (session_id, sort_order). Index (session_id, question_id).

**attempts** — one per submitted question
| col                      | type        |
| ------------------------ | ----------- |
| id                       | uuid pk     |
| user_id                  | uuid fk     |
| question_id              | uuid fk     | logical FK for aggregations
| question_revision_id     | uuid fk     | **snapshot FK** — which exact version the user saw
| session_id               | uuid fk null| null for ad-hoc daily challenge
| sort_order_in_session    | int null    | position within session; enables review screen ordering
| selected_option_id       | uuid fk null| null = skipped (option belongs to the revision snapshot)
| is_correct               | bool        |
| time_seconds             | int         |
| xp_awarded               | int         |
| attempted_at             | timestamptz |

Indexes:
- `(user_id, attempted_at desc)` — recent activity
- `(user_id, question_id)` — "have I solved this?"
- `(session_id, sort_order_in_session)` — ordered review screen
- `(question_id, attempted_at desc)` — per-question stats (uses logical FK for aggregations)
- `(question_revision_id)` — per-revision analytics

#### Bookmarks

**bookmarks**
| col          | type        |
| ------------ | ----------- |
| user_id      | uuid fk     |
| question_id  | uuid fk     |
| created_at   | timestamptz |

PK (user_id, question_id).

#### Explanations (Question screen tabs)

**explanations** — both official and community in one table, `kind` discriminates
| col              | type        |
| ---------------- | ----------- |
| id               | uuid pk     |
| question_id      | uuid fk     |
| author_id        | uuid fk null| null for official
| kind             | text        | enum('official','community')
| body             | text        | markdown
| tone             | text null   | enum('steps','analogy','short') — UI hint
| pinned           | bool default false | top community pick
| upvotes_count    | int default 0 | denormalized
| helpful_count    | int default 0 | denormalized
| comments_count   | int default 0 | denormalized
| moderation_status| text default 'visible' | enum('visible','hidden','flagged')
| spam_score       | numeric(5,2) null | 0.0–1.0; set by async classifier; auto-flag if > 0.8
| created_at, updated_at |       |

Index: `(question_id, kind, pinned desc, upvotes_count desc)`.

**explanation_votes**
| col              | type        |
| ---------------- | ----------- |
| explanation_id   | uuid fk     |
| user_id          | uuid fk     |
| value            | smallint    | 1 = upvote, -1 = downvote (future), 2 = "helpful"
| created_at       | timestamptz |

PK (explanation_id, user_id, value).

**explanation_comments**
| col            | type        |
| -------------- | ----------- |
| id             | uuid pk     |
| explanation_id | uuid fk     |
| author_id      | uuid fk     |
| body           | text        |
| spam_score     | numeric(5,2) null |
| created_at, deleted_at |     |

#### Progress, achievements, gamification

**activity_days** — pre-aggregated for the heatmap
| col              | type       |
| ---------------- | ---------- |
| user_id          | uuid fk    |
| date             | date       |
| attempts_count   | int        |
| correct_count    | int        |
| time_spent_sec   | int        |
| xp_earned        | int        |
| intensity_level  | smallint   | 0..4, computed from attempts_count

PK (user_id, date). Index (user_id, date desc).

**streaks** — one row per user
| col                  | type   |
| -------------------- | ------ |
| user_id              | uuid pk|
| current_streak       | int default 0 |
| longest_streak       | int default 0 |
| last_activity_date   | date   |
| total_active_days    | int default 0 |
| freezes_available    | int default 0 | drives StreakCard "2 freezes available"
| freezes_used_total   | int default 0 |
| freeze_last_earned_at| timestamptz null | when last freeze was granted

**streak_freeze_events** — audit log for freeze grants and uses
| col          | type        |
| ------------ | ----------- |
| id           | uuid pk     |
| user_id      | uuid fk     |
| kind         | text        | enum('granted','consumed','expired')
| reason       | text null   | 'weekly_grant', 'achievement', 'consumed_2026-05-09'
| created_at   | timestamptz |

**xp_events** — audit / animation source
| col       | type        |
| --------- | ----------- |
| id        | uuid pk     |
| user_id   | uuid fk     |
| amount    | int         |
| source    | text        | enum('attempt_correct','daily_complete','streak_bonus','achievement','community_top')
| source_id | uuid null   | attempt_id, achievement_id, etc.
| created_at| timestamptz |

**achievements** — definitions
| col         | type        |
| ----------- | ----------- |
| id          | uuid pk     |
| code        | text uniq   | 'first_100', 'streak_7', 'streak_30', 'mock_perfect', 'night_owl', 'explainer'
| label       | text        |
| description | text        |
| icon        | text        | 'medal','flame','trophy','moon','message-square'
| criteria    | jsonb       | `{ type: 'streak', days: 30 }` etc.
| sort_order  | int         |

**user_achievements**
| col            | type        |
| -------------- | ----------- |
| user_id        | uuid fk     |
| achievement_id | uuid fk     |
| unlocked_at    | timestamptz |
| seen_at        | timestamptz null | null = "new" badge in UI

PK (user_id, achievement_id).

**mastery_snapshots** — for the "Mastery by subject" bars, scoped per track
| col        | type       | notes |
| ---------- | ---------- | ----- |
| user_id    | uuid fk    |       |
| subject_id | uuid fk    |       |
| track_id   | uuid fk    | same subject (e.g. Physics) has separate mastery per exam — JEE questions differ from NEET questions |
| pct        | numeric(5,2) |     |
| computed_at| timestamptz |      |

PK (user_id, subject_id, track_id).
Recomputed on attempt write or nightly. Formula = weighted accuracy over recent attempts **within this track's question pool** × coverage factor.

#### Leaderboard

**leaderboard_entries** — weekly snapshot per track
| col         | type        | notes |
| ----------- | ----------- | ----- |
| id          | uuid pk     |       |
| user_id     | uuid fk     |       |
| track_id    | uuid fk     | JEE leaderboard is separate from PSC leaderboard |
| week_start  | date        | Monday |
| points      | int         |       |
| rank        | int         |       |
| prev_rank   | int null    | drives ↑↓ arrow |
| updated_at  | timestamptz |       |

Unique (user_id, track_id, week_start). Index (track_id, week_start, rank).

#### Social

**friendships**
| col           | type        |
| ------------- | ----------- |
| id            | uuid pk     |
| requester_id  | uuid fk     |
| addressee_id  | uuid fk     |
| status        | text        | enum('pending','accepted','blocked')
| created_at, updated_at |   |

Unique (requester_id, addressee_id). Index on `addressee_id, status` for incoming requests.

**conversations** — 1:1 chat
| col            | type        |
| -------------- | ----------- |
| id             | uuid pk     |
| user_a_id      | uuid fk     | always the smaller uuid
| user_b_id      | uuid fk     | always the larger uuid
| last_message_at| timestamptz |

Unique (user_a_id, user_b_id). Constraint: `user_a_id < user_b_id`.

**messages**
| col            | type        |
| -------------- | ----------- |
| id             | uuid pk     |
| conversation_id| uuid fk     |
| sender_id      | uuid fk     |
| body           | text        |
| spam_score     | numeric(5,2) null |
| read_at        | timestamptz null |
| created_at     | timestamptz |

Index (conversation_id, created_at desc).

#### Notifications

**notifications**
| col       | type        | notes                                        |
| --------- | ----------- | -------------------------------------------- |
| id        | uuid pk     |                                              |
| user_id   | uuid fk     |                                              |
| type      | text        | 'friend_request','badge_unlocked','streak_warning','explanation_reply','daily_reminder' |
| payload   | jsonb       | type-specific data                           |
| read_at   | timestamptz null |                                         |
| created_at| timestamptz |                                              |

Index (user_id, created_at desc), partial index (user_id) WHERE read_at IS NULL.

#### Mocks & scheduled events

**mock_test_blueprints** — predefined mock tests (e.g. "JEE-style · 90 questions · 3 hours")
| col              | type        | notes |
| ---------------- | ----------- | ----- |
| id               | uuid pk     |       |
| code             | text uniq   | 'jee-full-1', 'neet-full-1', 'psc-ldc-1', 'keam-pcm-1' |
| label            | text        | 'JEE-style full mock' |
| description      | text        |       |
| track_id         | uuid fk     | proper FK to tracks — not a string enum |
| total_questions  | int         |       |
| duration_sec     | int         |       |
| section_blueprint| jsonb       | `[{ subjectId, topicIds?, count, marksPerQ, negativeMarks }]` |
| is_active        | bool default true | |

**scheduled_mocks** — admin-published upcoming mock events users see ("Full mock in 3 days")
| col          | type        |
| ------------ | ----------- |
| id           | uuid pk     |
| blueprint_id | uuid fk     |
| starts_at    | timestamptz |
| ends_at      | timestamptz |
| visibility   | text        | enum('public','track','cohort')
| cohort_id    | uuid null   | future segmentation
| created_at   | timestamptz |

**mock_reminders** — user opt-ins ("Set reminder" / "Remind me")
| col              | type        |
| ---------------- | ----------- |
| user_id          | uuid fk     |
| scheduled_mock_id| uuid fk     |
| created_at       | timestamptz |

PK (user_id, scheduled_mock_id).

#### Curated content

**tips** — daily tip rotation (Home right rail "Tip of the day")
| col          | type        |
| ------------ | ----------- |
| id           | uuid pk     |
| body         | text        | markdown
| topic_id     | uuid fk null| optional binding
| difficulty   | text null   |
| active_from  | date null   | scheduling window
| active_to    | date null   |
| weight       | int default 1 | rotation weight
| created_at   | timestamptz |

**tip_impressions** — avoid showing the same tip twice in a row
| col       | type        |
| --------- | ----------- |
| user_id   | uuid fk     |
| tip_id    | uuid fk     |
| shown_on  | date        |

PK (user_id, shown_on).

#### Topic progress (drives "Continue learning")

**user_topic_progress** — derived snapshot, recomputed on attempt write, scoped per track
| col            | type        | notes |
| -------------- | ----------- | ----- |
| user_id        | uuid fk     |       |
| topic_id       | uuid fk     |       |
| track_id       | uuid fk     | "Projectile Motion" progress for JEE vs KEAM can differ since question pools differ |
| done_count     | int         | distinct questions correctly attempted within this track's question pool |
| total_count    | int         | snapshot of track-scoped question count for this topic |
| pct            | numeric(5,2) generated `(done_count::numeric/NULLIF(total_count,0))*100` | |
| last_attempted | timestamptz null | |
| in_progress    | bool generated `done_count > 0 AND done_count < total_count` | |
| updated_at     | timestamptz |       |

PK (user_id, topic_id, track_id). Index `(user_id, track_id, in_progress) WHERE in_progress` for the Home query.

`topics` table gains a per-track question count via the `topic_tracks` junction (no single `questions_count` column — compute `SELECT COUNT(*) FROM question_tracks WHERE track_id = ? AND question_id IN (SELECT id FROM questions WHERE topic_id = ?)`).

#### Recommendations

**recommendation_candidates** — server-computed, refreshed nightly + on attempt, scoped per track
| col          | type        | notes |
| ------------ | ----------- | ----- |
| id           | uuid pk     |       |
| user_id      | uuid fk     |       |
| track_id     | uuid fk     | recommendations are always within one exam's topic set |
| topic_id     | uuid fk     |       |
| reason_code  | text        | enum('weak_area','peers_stuck','last_attempted_long_ago','prereq_for_target','new_topic') |
| reason_meta  | jsonb       | `{ masteryPct: 47 }`, `{ stuckCount: 12 }`, etc. |
| score        | numeric     | for ranking |
| computed_at  | timestamptz |       |

Index `(user_id, track_id, score desc)`. Top N served by `GET /me/recommendations?trackId=`.

#### Privacy & feedback

**privacy_settings** — separate from `user_settings` because audit/legal-relevant
| col                  | type        |
| -------------------- | ----------- |
| user_id              | uuid pk     |
| profile_visibility   | text default 'friends' | enum('public','friends','private')
| show_in_leaderboard  | bool default true |
| searchable_by_email  | bool default true |
| share_streak         | bool default true |
| allow_friend_requests| bool default true |
| analytics_opt_out    | bool default false |
| updated_at           | timestamptz |

**feedback_submissions** — Profile → "Help & feedback"
| col          | type        |
| ------------ | ----------- |
| id           | uuid pk     |
| user_id      | uuid fk null| null for unauthenticated submissions
| category     | text        | enum('bug','suggestion','content_error','other')
| body         | text        |
| screen       | text null   | 'progress', 'question:<id>'
| device_info  | jsonb       | platform, version, viewport
| status       | text default 'open' | enum('open','triaged','resolved')
| created_at   | timestamptz |

#### Recommendation feedback loop

**recommendation_interactions** — closes the loop on what the engine recommended
| col                        | type        |
| -------------------------- | ----------- |
| id                         | uuid pk     |
| user_id                    | uuid fk     |
| recommendation_candidate_id| uuid fk     |
| action                     | text        | enum('opened','ignored','completed','dismissed')
| created_at                 | timestamptz |

Index (user_id, created_at desc). Used to retrain recommendation scoring weekly.

#### Feature flags

**feature_flags** — server-side feature gates
| col          | type        |
| ------------ | ----------- |
| id           | uuid pk     |
| key          | text uniq   | 'new_streak_ui', 'batch_attempts'
| description  | text        |
| rollout_pct  | int default 0 | 0–100; random bucket assignment if no user override
| enabled      | bool default false |
| created_at, updated_at |   |

**user_feature_flags** — per-user overrides (QA, beta testers)
| col       | type        |
| --------- | ----------- |
| user_id   | uuid fk     |
| flag_key  | text        |
| enabled   | bool        |

PK (user_id, flag_key).

Evaluation: `GET /me/flags` returns `{ [key]: bool }` for the current user, resolving user override → rollout bucket → global default. Cached in Redis 5 min per user.

#### Organizations & cohorts (B2B / schools)

**organizations** — schools, coaching institutes
| col          | type        |
| ------------ | ----------- |
| id           | uuid pk     |
| name         | text        |
| slug         | text uniq   |
| plan         | text default 'free' | enum('free','school','enterprise')
| created_at   | timestamptz |

**cohorts** — classrooms within an org
| col              | type        |
| ---------------- | ----------- |
| id               | uuid pk     |
| organization_id  | uuid fk     |
| name             | text        | 'XII-A Science'
| track_id         | uuid fk null|
| created_at       | timestamptz |

**user_cohorts**
| col          | type        |
| ------------ | ----------- |
| user_id      | uuid fk     |
| cohort_id    | uuid fk     |
| role         | text default 'student' | enum('student','teacher','admin')
| joined_at    | timestamptz |

PK (user_id, cohort_id). Enables school leaderboards, teacher dashboards, and institutional analytics without touching core user tables.

#### Domain events (event sourcing lite)

**domain_events** — append-only, never deleted
| col            | type        |
| -------------- | ----------- |
| id             | uuid pk     |
| aggregate_type | text        | 'attempt','streak','achievement','explanation','session'
| aggregate_id   | uuid        |
| event_type     | text        | 'attempt.created','streak.updated','achievement.unlocked', etc.
| payload        | jsonb       | full event data (enough to replay)
| user_id        | uuid null   | denormalized for fast user-scoped queries
| created_at     | timestamptz |

Indexes: `(aggregate_type, aggregate_id)`, `(user_id, created_at desc)`, `(event_type, created_at desc)`.

Value: debugging, audit replay, future ML feature extraction, rebuilding aggregates when recompute logic changes. Write to this in the same transaction as the state change.

#### Email change

**email_change_tokens**
| col          | type        |
| ------------ | ----------- |
| id           | uuid pk     |
| user_id      | uuid fk     |
| new_email    | citext      |
| token_hash   | text uniq   |
| expires_at   | timestamptz |
| confirmed_at | timestamptz null |
| created_at   | timestamptz |

#### Audit

**audit_log** — for password change, data export, account deletion
`{ id, user_id, action, ip, user_agent, metadata jsonb, created_at }`.

**data_export_jobs** — Profile → "Export my data"
`{ id, user_id, status('pending'|'processing'|'ready'|'failed'), download_url, expires_at, created_at }`.

### 3.3 ER summary

```
users 1───1 user_settings
users 1───* linked_accounts
users 1───* refresh_tokens
users 1───* device_tokens

subjects 1───* topics 1───* questions 1───* question_options
questions 1───* explanations 1───* explanation_votes
                            1───* explanation_comments
questions 1───* attempts (per user)
questions M───M users via bookmarks

users 1───* practice_sessions 1───* session_questions ───* questions
practice_sessions 1───* attempts

users 1───1 streaks
users 1───* activity_days
users 1───* xp_events
users M───M achievements via user_achievements
users 1───* mastery_snapshots (one per subject)

users 1───* leaderboard_entries (one per week)

users M───M users via friendships
users 1───* conversations 1───* messages

users 1───* notifications
users 1───* audit_log
users 1───* data_export_jobs
users 1───1 privacy_settings
users 1───* feedback_submissions
users 1───* email_change_tokens
users 1───* streak_freeze_events
users 1───* tip_impressions

mock_test_blueprints 1───* scheduled_mocks 1───* mock_reminders ───* users
tips 1───* tip_impressions
topics 1───* user_topic_progress ───* users
users 1───* recommendation_candidates ───* topics
users 1───* recommendation_interactions

questions 1───* question_revisions
attempts M───1 question_revisions (snapshot FK)
attempts M───1 questions (logical FK for aggregations)

tracks M───M subjects via subject_tracks
tracks M───M topics via topic_tracks
tracks M───M questions via question_tracks
tracks M───M users via user_tracks (primary flag)
tracks 1───* daily_challenges (one question per date per track)
tracks 1───* leaderboard_entries (separate ranking per track)
tracks 1───* mastery_snapshots (Physics mastery for JEE ≠ Physics mastery for NEET)
tracks 1───* user_topic_progress (progress scoped per track)
tracks 1───* mock_test_blueprints

organizations 1───* cohorts 1───* user_cohorts ───* users

domain_events N───1 (aggregate_type, aggregate_id) [polymorphic log]
feature_flags 1───* user_feature_flags ───* users
```

---

## 4. API design

### 4.1 Conventions

- Base URL: `/api/v1`
- Auth: `Authorization: Bearer <accessToken>` for everything except `/auth/*` (some) and `/health`.
- Errors: `{ error: { code, message, details? } }` with HTTP status codes.
  - 400 validation, 401 missing/invalid token, 403 forbidden, 404 not found, 409 conflict, 422 semantic, 429 rate limited, 500 internal.
- Pagination: cursor-based — `?limit=20&cursor=<opaque>` → `{ data: [...], nextCursor: string|null }`.
- Sorting: `?sort=field,-other` where `-` = desc.
- IDs: uuid v4 unless noted.
- Time: ISO 8601 UTC strings.
- Idempotency: `Idempotency-Key` header on POST endpoints that create user-visible state (attempt submission, friend request). Server stores the (user_id, key) → response for 24h.

**Track resolution (applies to all content, progress, and leaderboard endpoints):**

Every content-scoped endpoint resolves a track in this priority order:
1. Explicit `?trackId=<uuid>` query param — validated that the user is enrolled in that track.
2. User's primary track from `user_tracks WHERE is_primary = true`.
3. Error 422 if the user has no tracks set (force onboarding).

This means a student enrolled in both JEE and PSC can switch context by passing `?trackId=` and the server returns the correct subjects, topics, questions, recommendations, and leaderboard for that exam without any other changes.

### 4.2 Endpoint catalogue

Format: `METHOD path` — short purpose. Followed by request/response sketch where non-obvious. Auth required unless marked `(public)`.

#### Auth `/auth`

- `POST /auth/register` `(public)` — `{ email, password, name }` → `{ user, accessToken, refreshToken }`
- `POST /auth/login` `(public)` — `{ email, password }` → tokens
- `POST /auth/refresh` `(public)` — `{ refreshToken }` → new pair, old refresh revoked
- `POST /auth/logout` — revokes the presented refresh token (and optionally device)
- `POST /auth/oauth/google` `(public)` — `{ idToken }` → tokens; creates `linked_accounts` row
- `POST /auth/password/forgot` `(public)` — `{ email }` → 202; emails reset link
- `POST /auth/password/reset` `(public)` — `{ token, newPassword }`
- `POST /auth/change-password` — `{ currentPassword, newPassword }` → 204; revokes all other refresh tokens

Rate limits: `/auth/login` 10/min/IP, `/auth/password/forgot` 3/hour/email.

#### Me & settings `/me`

- `GET /me` → full profile (the hero card on Profile)
- `PATCH /me` → update name, school, grade, target_exam (no email change here)
- `GET /me/settings` → drives Appearance + Notifications cards
- `PATCH /me/settings` → `{ theme?, notificationsEnabled?, notifyFrequency?, language?, offlineSubjects? }`
- `GET /me/linked-accounts`
- `DELETE /me/linked-accounts/:provider`
- `POST /me/data-export` → `{ jobId, status:'pending' }`
- `GET /me/data-export/:id` → status + signed URL when ready
- `DELETE /me` — soft delete account (Profile expansion); requires password confirm

#### Offline sync `/sync`

Replaces the naive "download a subject bundle" approach with a pull-based delta sync:

- `GET /sync/pull?lastPulledAt=<ISO8601>&trackId=` → incremental response containing only rows modified **since** `lastPulledAt`:
  ```json
  {
    "subjects":   [ /* updated rows */ ],
    "topics":     [ /* updated rows */ ],
    "questions":  [ /* updated rows — correct_option omitted */ ],
    "options":    [ /* updated rows */ ],
    "deletedIds": { "questions": ["..."] },
    "pulledAt":   "2026-05-10T08:00:00Z"
  }
  ```
  Client stores in IndexedDB / SQLite, queries locally. Next pull passes `lastPulledAt = pulledAt` from previous response.
- `GET /me/settings` includes `offlineSubjects: uuid[]` — the user's download selection.
- No question answers are included offline; submission always requires network.

#### Content (read) `/subjects` `/questions`

All content endpoints apply **track resolution** (see §4.1 conventions).

- `GET /subjects` → `[{ id, code, label, short, color }]` filtered to the resolved track only (PSC users never see Biology; JEE users never see Malayalam). Cacheable per `(trackId, ETag)`.
- `GET /subjects/:id/topics` → `[{ id, code, label }]` filtered to the resolved track
- `GET /questions/:id` → question + options (correct_option hidden until attempt); `{ myStatus: 'unattempted'|'correct'|'incorrect', myAttemptId? }`
- `GET /questions?subjectId=&topicId=&difficulty=&trackId=&limit=&cursor=` — always requires trackId resolution; returns only questions in that track
- `GET /tracks` → `[{ id, code, label }]` — all active tracks (used in onboarding screen)
- `GET /me/tracks` → `[{ track, isPrimary, enrolledAt }]` — user's enrolled exams
- `POST /me/tracks` — `{ trackId, isPrimary? }` — enrol in an exam
- `PATCH /me/tracks/:trackId` — `{ isPrimary: true }` — switch primary exam
- `DELETE /me/tracks/:trackId` — leave an exam (only if not the last track)

#### Daily challenge `/daily-challenge`

- `GET /daily-challenge` → today's question + `{ totalSolvers, myAttempt|null, topSolvers:[{name,time,avatar,you?}] }` (drives the right rail of the Question screen pre-submit)
- `POST /daily-challenge/attempt` — `{ selectedOptionId, timeSeconds }` → `{ attempt, isCorrect, xpAwarded, streak: { current, gained }, achievementsUnlocked:[] }`

Idempotent via `Idempotency-Key`. Server enforces "one attempt per user per day"; second call returns 409 with the existing attempt.

#### Practice `/practice`

- `POST /practice/sessions` — body: `{ mode: 'quick'|'mock'|'drill'|'custom', trackId?, subjectId?, topicId?, difficulty: 'easy'|'medium'|'hard'|'mixed', questionCount?, blueprintId? }` → `{ session, questions: [...] }`. `trackId` defaults to user's primary; questions are drawn only from that track's pool.
- `GET /practice/sessions/:id` → session state + per-question my-status
- `POST /practice/sessions/:id/attempts` — `{ questionId, selectedOptionId, timeSeconds }` → `{ attempt, isCorrect, runningScore }`
- `POST /practice/sessions/:id/finish` — closes session, returns final breakdown:
  ```json
  {
    "score": 8, "total": 10, "accuracy": 80,
    "timeSpentSec": 684,
    "byTopic": [{ "topicId":"...", "correct":3, "total":4 }],
    "xpAwarded": 240,
    "streak": { "current": 24, "gained": 1 },
    "achievementsUnlocked": []
  }
  ```
- `GET /practice/sessions?limit=&cursor=` — recent attempts list (Practice screen "History" card)
- `GET /practice/attempts/:id` — single review with explanation

#### Explanations `/questions/:id/explanations` and `/explanations/:id`

- `GET /questions/:id/explanations?type=official|community|all&limit=&cursor=` → ordered as Official then pinned then by upvotes. Each item carries `{ id, kind, body, author?, upvotesCount, helpfulCount, commentsCount, myVote: 'up'|'helpful'|null }`.
- `POST /questions/:id/explanations` — `{ body, tone? }` (community only). Goes through profanity / spam filter; returns the pending row.
- `DELETE /explanations/:id` — author or moderator
- `POST /explanations/:id/vote` — `{ value: 'up'|'helpful' }` (toggling: re-POST removes)
- `POST /explanations/:id/comments` — `{ body }`
- `GET /explanations/:id/comments?limit=&cursor=`

#### Bookmarks `/me/bookmarks`

- `GET /me/bookmarks?subjectId=&limit=&cursor=`
- `POST /me/bookmarks` — `{ questionId }` → 201 idempotent
- `DELETE /me/bookmarks/:questionId` → 204

#### Progress `/me/...` (drives Progress screen + Home stat tiles)

- `GET /me/stats` → `{ solved, accuracy, currentStreak, rank }` (the 4 hero tiles)
- `GET /me/mastery` → `[{ subjectId, label, pct }]`
- `GET /me/accuracy/by-subject` → `[{ subjectId, label, pct }]` (Practice right rail)
- `GET /me/activity?weeks=13` → `{ totalDays: 412, grid: number[][] }` — grid is 13 cols × 7 rows of intensity 0..4 (or -1 for "future")
- `GET /me/streak` → `{ current, longest, totalDays, freezesAvailable, thisMonth: { active, total }, thisWeek: [{ date, active, isToday }] }` (the `thisWeek` array drives the StreakCard expand-grid)
- `POST /me/streak/freeze` — manually consume a freeze for a missed day; `{ date }` (auto-consumption usually preferred — see §6)
- `GET /me/in-progress-topics` → `[{ topicId, subjectLabel, title, done, total, color, lastAttempted }]` (drives Home → "Continue learning")
- `GET /me/recommendations?limit=3` → `[{ topicId, subjectLabel, title, reason: { code, meta } }]` where `reason.code ∈ {'weak_area','peers_stuck','last_attempted_long_ago','prereq_for_target','new_topic'}`
- `GET /me/weekly-stats` → `[{ day:'Mon', count: 12 }, ...]` (Practice right-rail bar chart)
- `GET /me/xp/events?limit=&cursor=`

All `/me/*` analytics endpoints support `?asOf=YYYY-MM-DD` for time-travel debugging in admin.

#### Achievements `/achievements`

- `GET /achievements` → `[{ id, code, label, sub, icon, unlocked, unlockedAt?, progress: { current, target } | null }]` — `progress` is non-null for criteria with countable progress (e.g. `streak_30` → `{ current: 23, target: 30 }`, `night_owl` → `{ current: 7, target: 10 }`)
- `POST /achievements/:code/seen` → mark "new" indicator as seen

(No claim flow — unlocks happen automatically server-side when criteria are met.)

#### Leaderboard `/leaderboard`

- `GET /leaderboard?scope=week|month` → `{ track: { id, label }, top: [...up to 50], me: { rank, points, prevRank } }` — scoped to resolved track; a JEE student never competes with a PSC student
- `GET /leaderboard/full?scope=week&limit=&cursor=` → paginated full list for the resolved track

Cached in Redis for 60s per `(trackId, scope)`; bumped after each session finish.

#### Social `/me/friends` `/users`

- `GET /users/search?q=` — name/email prefix search; returns `[{ id, name, avatar, school, grade, isFriend, hasPendingRequest }]`
- `GET /users/:id` — public profile (limited fields)
- `GET /me/friends` → accepted buddies (drives Profile → "Study buddies")
- `GET /me/friends/requests` → incoming pending requests
- `POST /me/friends/requests` — `{ userId }` → creates pending row (or 409 if exists)
- `POST /me/friends/requests/:id/accept`
- `POST /me/friends/requests/:id/decline`
- `DELETE /me/friends/:userId` — unfriend / cancel outgoing

#### Messages `/me/conversations`

- `POST /me/conversations` — `{ userId }` → existing or new conversation (only between accepted friends)
- `GET /me/conversations` → list with last message + unread count
- `GET /me/conversations/:id/messages?limit=&cursor=`
- `POST /me/conversations/:id/messages` — `{ body }` → broadcasts via WebSocket
- `POST /me/conversations/:id/read` → marks messages up to last as read

WebSocket namespace `/ws`:
- `chat:join` `{ conversationId }`
- `chat:message` `{ message }` (push)
- `notification:new` `{ notification }` (push)

#### Notifications `/me/notifications`

- `GET /me/notifications?limit=&cursor=` → `{ data, unreadCount, nextCursor }`
- `POST /me/notifications/read-all`
- `POST /me/notifications/:id/read`
- `POST /me/devices` — register push token `{ platform, token }`
- `DELETE /me/devices/:id`

#### Mocks `/mocks` `/me/mock-reminders`

- `GET /mocks/upcoming` → `[{ id, blueprint: { label, description, totalQuestions, durationSec, track }, startsAt, daysUntil, reminderSet }]` (drives Home → "Full mock in 3 days")
- `GET /mocks/blueprints` — list available blueprints (for "Custom mock" creation)
- `POST /me/mock-reminders` — `{ scheduledMockId }` → 201
- `DELETE /me/mock-reminders/:scheduledMockId` → 204
- `POST /practice/sessions` with `{ mode: 'mock', blueprintId }` to actually start a mock

#### Tips `/tips`

- `GET /tips/today` → `{ id, body, topic? }` — server picks one weighted by recency + topic relevance, writes a `tip_impressions` row
- `POST /tips/:id/dismiss` → 204 (don't show this one again for a while)

#### Feedback `/feedback`

- `POST /feedback` — `{ category, body, screen?, deviceInfo? }` → 201 (auth optional; rate-limit 3/hour/IP for unauth, 10/hour/user for auth)

#### Privacy `/me/privacy`

- `GET /me/privacy` → full `privacy_settings`
- `PATCH /me/privacy` — partial update; immediately affects search, leaderboard membership, friend-request acceptance

#### Email change `/me/email`

- `POST /me/email/change` — `{ newEmail, currentPassword }` → sends verification email to the new address; rate-limited
- `POST /me/email/change/confirm` `(public)` — `{ token }` → swaps email, revokes all refresh tokens, audits

#### Admin `/admin/*` (role: admin)

- CRUD `/admin/questions`, `/admin/topics`, `/admin/subjects`, `/admin/achievements`, `/admin/tips`, `/admin/mock-blueprints`, `/admin/scheduled-mocks`
- `POST /admin/daily-challenge` — `{ date, questionId }`
- `POST /admin/streaks/:userId/grant-freeze` — manual freeze grant (support tickets)
- Moderation: `POST /admin/explanations/:id/hide`, `POST /admin/users/:id/suspend`, `GET/POST /admin/feedback`

### 4.3 Endpoint → screen traceability

| Frontend element                                  | Endpoint(s)                                         |
| ------------------------------------------------- | --------------------------------------------------- |
| Home: greeting + hero stats                       | `GET /me`, `GET /me/stats`                          |
| Home: daily challenge card                        | `GET /daily-challenge`                              |
| Home: continue learning / topics                  | `GET /me/in-progress-topics` (backed by `user_topic_progress`) |
| Home: recommendations + reasons                   | `GET /me/recommendations` (backed by `recommendation_candidates`) |
| Home: streak summary + freezes + week grid        | `GET /me/streak` (returns `freezesAvailable`, `thisWeek`) |
| Home: mock test reminder card                     | `GET /mocks/upcoming`, `POST /me/mock-reminders`    |
| Home: tip of the day                              | `GET /tips/today`                                   |
| Practice: subject chips                           | `GET /subjects`                                     |
| Practice: difficulty + mode                       | client-only until `POST /practice/sessions`        |
| Practice: weekly bar chart                        | `GET /me/weekly-stats`                              |
| Practice: subject accuracy                        | `GET /me/accuracy/by-subject`                       |
| Practice: recent attempts                         | `GET /practice/sessions`                            |
| Question: load                                    | `GET /daily-challenge` or `GET /questions/:id`      |
| Question: top solvers                             | included in `GET /daily-challenge`                  |
| Question: submit                                  | `POST /daily-challenge/attempt` or `.../attempts`   |
| Question: tabs (official / community / all)       | `GET /questions/:id/explanations?type=`             |
| Question: bookmark                                | `POST /me/bookmarks`, `DELETE /me/bookmarks/:id`    |
| Progress: 4 stat tiles                            | `GET /me/stats`                                     |
| Progress: mastery bars                            | `GET /me/mastery`                                   |
| Progress: achievements grid                       | `GET /achievements`                                 |
| Progress: heatmap                                 | `GET /me/activity?weeks=13`                         |
| Progress: leaderboard                             | `GET /leaderboard?scope=week`                       |
| Progress: streak history                          | `GET /me/streak`                                    |
| Profile: hero card                                | `GET /me`                                           |
| Profile: appearance / notifications               | `GET /me/settings`, `PATCH /me/settings`            |
| Profile: language / offline                       | `PATCH /me/settings`                                |
| Profile: privacy                                  | `GET/PATCH /me/privacy`                             |
| Profile: help & feedback                          | `POST /feedback`                                    |
| Profile: change password                          | `POST /auth/change-password`                        |
| Profile: change email (future)                    | `POST /me/email/change` + `/confirm`                |
| Profile: linked accounts                          | `GET/DELETE /me/linked-accounts`                    |
| Profile: export data                              | `POST/GET /me/data-export`                          |
| Profile: study buddies                            | `GET /me/friends`                                   |
| Profile: achievements (with progress)             | `GET /achievements`                                 |
| Profile: sign out                                 | `POST /auth/logout`                                 |

---

## 5. Cross-cutting concerns

### 5.1 Authentication & sessions

- Access JWT (15 min) signed RS256 with key rotation via JWKS endpoint.
- Refresh token: 30 days, rotated on every use, stored hashed (`token_hash`) in `refresh_tokens`. Reuse detection → revoke entire family + force logout.
- Password hashing: argon2id with sane params; pepper from env.
- OAuth (Google) verifies `idToken`, then either links to existing email or creates account.

### 5.2 Authorization

- Default guard on all controllers: `JwtAuthGuard`.
- Role guard: `student` (default), `admin` (set in DB).
- Ownership guard: parameter-based, e.g. `@OwnedBy('user_id')` on `/practice/sessions/:id` ensures `session.user_id === req.user.id`.

### 5.3 Validation

- DTO classes with `class-validator` + `class-transformer`.
- Global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.

### 5.4 Rate limiting

`@nestjs/throttler` with Redis store. Per-route overrides:

| Route                          | Limit            |
| ------------------------------ | ---------------- |
| `/auth/login`                  | 10/min/IP        |
| `/auth/password/forgot`        | 3/hour/email     |
| `/auth/register`               | 5/hour/IP        |
| `POST /practice/sessions/:id/attempts` | 60/min/user |
| `POST /me/conversations/:id/messages`  | 30/min/user |
| `POST /questions/:id/explanations`     | 5/hour/user |
| Default                        | 120/min/user     |

### 5.5 Atomic write operations

Never use read-modify-write in application code for shared counters. Always push arithmetic to Postgres:

```ts
// ✅ Correct — single atomic SQL UPDATE
prisma.explanation.update({ where: { id }, data: { upvotes_count: { increment: 1 } } })

// ❌ Wrong — race condition between two simultaneous upvotes
const e = await prisma.explanation.findUnique({ where: { id } });
await prisma.explanation.update({ data: { upvotes_count: e.upvotes_count + 1 } });
```

Applies to: `upvotes_count`, `helpful_count`, `comments_count`, `replies_count`, `daily_challenges.total_solvers`, `user_topic_progress.done_count`, leaderboard `points`. The nightly reconcile job is a safety net, not a substitute.

### 5.6 Caching

- Redis-cached, 5 min TTL: `GET /subjects`, `GET /achievements` definitions.
- Redis-cached, 60 s: `GET /leaderboard?scope=week`, `GET /daily-challenge` (without `myAttempt`).
- ETag on read-only resources.

### 5.7 Search abstraction

All search goes through a single `SearchService` (`src/search/search.service.ts`) that wraps Postgres full-text initially:

```
SearchService.searchUsers(q)   → users (trigram pg_trgm index)
SearchService.searchQuestions(q) → questions (full-text tsvector)
SearchService.searchTopics(q)  → topics
```

When volume justifies it, swap the implementation to Meilisearch or Typesense **without touching controllers or use-cases** — only `SearchService` changes.

### 5.8 WebSocket scaling

Socket.IO with Redis adapter (`@socket.io/redis-adapter`) from day one — even on a single node it costs nothing and enables horizontal scaling later without code changes:

```ts
const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```

### 5.9 Background jobs (BullMQ queues)

| Queue              | Trigger             | Purpose                                          |
| ------------------ | ------------------- | ------------------------------------------------ |
| `streak.rollover`  | cron 00:05 user-tz  | mark streak break if no activity yesterday       |
| `daily.dispatch`   | cron 19:30 user-tz  | daily reminder push (if `notify_frequency=daily`)|
| `weekly.digest`    | cron Sun 09:00      | weekly digest email                              |
| `leaderboard.recompute` | cron hourly + on session finish | rebuild weekly leaderboard          |
| `mastery.recompute`| on attempt batch    | refresh `mastery_snapshots`                      |
| `achievement.eval` | on attempt / streak | unlock badges                                    |
| `data.export`      | on demand           | build user data zip → S3, mark job ready         |
| `notification.fan` | on event            | write `notifications` rows + push                |
| `spam.score`       | on explanation/message write | run classifier, write `spam_score`, auto-flag |
| `difficulty.calibrate` | nightly         | update `success_rate`, `avg_time_seconds`, `discrimination_index` on questions |
| `recommendation.recompute` | nightly + on mastery update | refresh `recommendation_candidates` |
| `domain.event.fan` | on state change     | write to `domain_events` table for debugging/analytics |
| `feature.flag.sync`| on flag change      | bust per-user flag caches in Redis              |

**Future endpoint (design service layer for it now):**
`POST /practice/sessions/:id/attempts/batch` — accepts an array of attempt submissions, useful for offline sync and unstable-network scenarios. The `PracticeService.submitAttempt()` method should be side-effect-free and callable in a loop without introducing transaction issues.

### 5.10 Real-time

- Socket.IO gateway namespaces: `/ws/chat`, `/ws/notifications`.
- Auth via JWT in handshake.
- Presence: writes `users.last_active_at` every minute.

### 5.11 Observability

- Pino JSON logs with `traceId` injected via `nestjs-cls`.
- OpenTelemetry HTTP + Prisma instrumentation → OTLP exporter.
- `/health` (liveness) and `/ready` (DB + Redis ping).
- Sentry for unhandled errors.

### 5.12 Security

- Helmet + CORS allowlist (frontend origins).
- CSRF not required (token in `Authorization` header, not cookie).
- All input length-bounded; markdown sanitized server-side before storing explanations/messages.
- PII export & deletion endpoints (DPDP / GDPR).

### 5.13 Schema migrations

- `prisma migrate` for forward migrations checked into git.
- Backfills are written as separate scripts in `prisma/backfills/` and run via a `migrate:data` npm script.

---

## 6. Domain rules worth pinning

These are the non-obvious business rules the API enforces — keep them in one place so they don't drift.

1. **One attempt per user per question per session.** Re-submitting the same `(session_id, question_id)` returns the existing attempt; no new row.
2. **Daily challenge: one attempt per user per UTC day** (or per user-timezone day if `user_settings.timezone` is set — the same rule applies for streak roll-over).
3. **Streak math:** active day = `attempts_count >= 3` OR daily challenge attempted (within any enrolled track — you don't have to do PSC *and* JEE to keep a streak). Streak increments if today is active and yesterday was active; resets to 1 if yesterday was inactive; unchanged if today inactive.
3a. **Streak freezes:** if a user misses a day and `freezes_available > 0`, the `streak.rollover` job auto-consumes one freeze and keeps the streak intact. Logged in `streak_freeze_events`. Freezes are granted weekly (cap at 2) and as achievement rewards. `POST /me/streak/freeze` is for manual application within a 24h grace window if auto-consumption was disabled in user settings.
4. **XP awards:**
   - Correct attempt: 50 (configurable per question).
   - Daily challenge complete: +20 bonus.
   - Streak milestones (7, 30, 100): +200 / +500 / +1000.
   - Top community explanation of the week: +300.
5. **Mastery formula (per subject):** weighted accuracy of last 100 attempts × coverage factor (topics attempted / topics in subject). Recomputed on attempt write asynchronously.
6. **Leaderboard scope:** ISO week (Mon–Sun) in user's timezone; points = sum of `xp_events` in that window. Recompute pushes ranks; `prev_rank` carried over from the previous run for arrow direction.
7. **Friend requests** are unique on `(requester_id, addressee_id)`. Reverse direction creates a separate row; accepting either auto-resolves both.
8. **Conversations** require both users in `friendships.status='accepted'` to send messages. If unfriended, old messages remain readable but new posts are 403.
9. **Bookmarks** are private; never expose to other users.
10. **Soft delete** on `explanation_comments` and `messages` (kept for moderation), hard delete elsewhere.
11. **Helpful vs upvote on explanations:** `upvote` is a single toggle stored as `value=1` in `explanation_votes`. `helpful` is a separate toggle stored as `value=2`. The "No" button in the CommunityCard is UI-only — it suppresses the prompt for that user but does **not** record a downvote. (When real downvoting is added later, use `value=-1`.)
12. **Mock reminders:** when a user opts in via `POST /me/mock-reminders`, three notifications are scheduled — 24h, 1h, and at-start. `notification.fan` queue handles dispatch. Cancelling the reminder clears all three.
13. **Tip rotation:** `GET /tips/today` picks weighted-random from active tips, excluding any shown in the last 7 days for that user (`tip_impressions` lookup). Same tip is stable across requests on the same UTC day.
14. **Topic progress recompute:** `user_topic_progress` is recomputed in the same transaction as `attempts` insert (cheap — single topic + track touched).
15. **Track scoping invariant:** every query that returns content (subjects, topics, questions, recommendations, leaderboard, mastery, daily challenge) MUST filter by a resolved `track_id`. No endpoint should ever mix PSC and JEE content in a single response. The `TrackResolutionInterceptor` (NestJS interceptor) attaches `req.resolvedTrackId` before any controller runs, so individual services never need to re-resolve.
16. **Onboarding gate:** any authenticated user with no rows in `user_tracks` gets a 422 with `{ code: 'TRACK_REQUIRED' }` from the interceptor. The frontend redirects to the exam-selection onboarding screen. This ensures the track invariant can never be violated by a partially registered user.

---

## 7. Implementation order (suggested)

A pragmatic order so the frontend can integrate screen-by-screen:

1. **Foundation** — Nest scaffold, Prisma, Postgres, Redis, auth (register/login/refresh), `/me`, settings.
2. **Content** — admin seeds + `GET /subjects`, `GET /questions/:id`. Lets the Question screen render.
3. **Practice & attempts** — `POST /practice/sessions`, attempts, finish. Lets the Practice + Question flow work end-to-end.
4. **Daily challenge** — small layer over questions + attempts.
5. **Progress & analytics** — stats, mastery, heatmap, weekly. Powers the Progress + Home stats.
6. **Explanations** — official + community + votes + comments.
7. **Achievements + leaderboard** — unlock engine + weekly recompute.
8. **Social + chat + notifications** — friendships, conversations, WebSocket, push.
9. **Admin authoring + moderation.**
10. **Hardening** — rate limits, observability, exports, account deletion.

---

## 8. Remaining open questions

The four major open questions from the first draft are now resolved in schema. These are the genuine unknowns that remain:

| Question | Status | Decision needed |
| -------- | ------ | --------------- |
| Multi-tenant exam tracks | **Resolved** — `tracks`, `question_tracks`, `user_tracks` in §3.2 | Pick initial track codes and seed data before content import |
| Question versioning | **Resolved** — `question_revisions`, `attempts.question_revision_id` in §3.2 | Agree on versioning trigger: every save vs. only published changes |
| Offline mode | **Resolved** — pull-sync API `GET /sync/pull` in §4.2 | Decide which fields are included in offline bundle (hide `correct_option_id` always) |
| Mock test integrity | **Open** | Anti-cheat (tab-switch detection, copy-paste block, time-tamper detection) needed for Mock mode? Decision affects session schema (add `integrity_violations jsonb`?) |
| Localization of questions | **Open** | If multilingual content (Hindi, Tamil) is planned, `questions` needs a `locale` column and a `question_translations` join table |
| B2B / cohort pricing | **Open** | Does `organizations.plan` map to a `subscriptions` table with Stripe integration, or is billing handled externally? |
| Adaptive difficulty | **Open** | Using `discrimination_index` for adaptive question selection requires a routing algorithm (IRT / ELO). Out of scope for MVP but schema is ready |
