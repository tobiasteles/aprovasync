import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

/**
 * Convenções:
 *  - Datas de estudo/prova são `date` em modo 'string' ('YYYY-MM-DD'): casam 1:1 com o motor puro (src/core/schedule).
 *  - Tempo sempre em minutos inteiros.
 *  - weekday: 0 = domingo ... 6 = sábado (igual ao motor).
 *  - A tabela de usuários de autenticação (Better Auth / Auth.js) pode estender `users`.
 */

/* ------------------------------- enums ------------------------------- */

export const planStatusEnum = pgEnum('plan_status', ['active', 'paused', 'finished', 'archived']);
/** pending: a fazer · completed: concluída · skipped: atrasada e já re-alocada pelo "Imprevisto". */
export const sessionStatusEnum = pgEnum('session_status', ['pending', 'completed', 'skipped']);
export const sessionOriginEnum = pgEnum('session_origin', ['generated', 'rescheduled', 'review']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['trialing', 'active', 'past_due', 'canceled']);

/* ------------------------------- users ------------------------------- */

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  passwordHash: text('password_hash').notNull(),
  stripeCustomerId: text('stripe_customer_id'),
  /** Evidência do aceite (LGPD/CDC): quando e qual versão dos Termos/Privacidade. */
  termsAcceptedAt: timestamp('terms_accepted_at', { withTimezone: true }),
  termsVersion: text('terms_version'),
  /** Sessões emitidas antes desta data são invalidadas (troca de senha). */
  passwordChangedAt: timestamp('password_changed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Tokens de recuperação de senha. Guardamos só o HASH (SHA-256); o token real vai apenas no e-mail. */
export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('password_reset_tokens_hash_uq').on(t.tokenHash), index('password_reset_tokens_user_idx').on(t.userId)],
);

/* ------------------------------- planos ------------------------------- */

export const studyPlans = pgTable(
  'study_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    startDate: date('start_date', { mode: 'string' }).notNull(),
    examDate: date('exam_date', { mode: 'string' }).notNull(),
    granularityMinutes: smallint('granularity_minutes').notNull().default(30),
    /** % da capacidade planejada (o resto é folga p/ imprevistos). 85 = 0.85 no motor. */
    utilizationPct: smallint('utilization_pct').notNull().default(85),
    timezone: text('timezone').notNull().default('America/Sao_Paulo'),
    status: planStatusEnum('status').notNull().default('active'),
    /** Preenchido quando o plano nasceu de um PDF de edital enviado pelo usuário (ver core/edital). */
    editalMeta: jsonb('edital_meta').$type<import('../../core/edital').EditalMeta | null>(),
    /** Quantas matérias diferentes por dia, no máximo. null = sem limite (comportamento antigo). */
    maxSubjectsPerDay: smallint('max_subjects_per_day'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('study_plans_user_idx').on(t.userId, t.status),
    check('study_plans_exam_after_start', sql`${t.examDate} > ${t.startDate}`),
    check('study_plans_utilization_range', sql`${t.utilizationPct} between 1 and 100`),
    check('study_plans_granularity_range', sql`${t.granularityMinutes} between 1 and 240`),
  ],
);

/** Horas disponíveis por dia da semana (7 linhas por plano). */
export const planAvailability = pgTable(
  'plan_availability',
  {
    planId: uuid('plan_id').notNull().references(() => studyPlans.id, { onDelete: 'cascade' }),
    weekday: smallint('weekday').notNull(),
    minutes: smallint('minutes').notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.planId, t.weekday] }),
    check('plan_availability_weekday', sql`${t.weekday} between 0 and 6`),
    check('plan_availability_minutes', sql`${t.minutes} between 0 and 1440`),
  ],
);

export const subjects = pgTable(
  'subjects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    planId: uuid('plan_id').notNull().references(() => studyPlans.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    weight: smallint('weight').notNull().default(1),
    color: text('color'),
    position: smallint('position').notNull().default(0),
    /** Tópicos-chave extraídos do edital para esta matéria (opcional). */
    topics: text('topics').array(),
  },
  (t) => [
    uniqueIndex('subjects_plan_name_uq').on(t.planId, t.name),
    check('subjects_weight_pos', sql`${t.weight} > 0`),
  ],
);

/* ------------------------------ sessões ------------------------------- */

export const studySessions = pgTable(
  'study_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    planId: uuid('plan_id').notNull().references(() => studyPlans.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
    date: date('date', { mode: 'string' }).notNull(),
    minutes: smallint('minutes').notNull(),
    status: sessionStatusEnum('status').notNull().default('pending'),
    origin: sessionOriginEnum('origin').notNull().default('generated'),
    /** Sessão original (atrasada) da qual esta foi derivada pelo "Imprevisto". */
    rescheduledFromId: uuid('rescheduled_from_id').references((): AnyPgColumn => studySessions.id, {
      onDelete: 'set null',
    }),
    /** Para origin='review': em quantos dias após o estudo original esta revisão cai (1, 7 ou 30). */
    reviewOffsetDays: smallint('review_offset_days'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    /** Evita gerar revisões de novo se a pessoa desmarcar e remarcar a mesma sessão como concluída. */
    reviewsGenerated: boolean('reviews_generated').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('study_sessions_plan_date_idx').on(t.planId, t.date),
    index('study_sessions_plan_status_idx').on(t.planId, t.status),
    check('study_sessions_minutes_pos', sql`${t.minutes} > 0`),
  ],
);

/** Histórico de cada clique em "Imprevisto" (auditoria + métricas de produto). */
export const planAdjustments = pgTable(
  'plan_adjustments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    planId: uuid('plan_id').notNull().references(() => studyPlans.id, { onDelete: 'cascade' }),
    fromDate: date('from_date', { mode: 'string' }).notNull(),
    movedMinutes: integer('moved_minutes').notNull(),
    unallocatedMinutes: integer('unallocated_minutes').notNull().default(0),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('plan_adjustments_plan_idx').on(t.planId, t.createdAt)],
);

/* ------------------------- cobrança / licenças ------------------------- */

export const paymentProviderEnum = pgEnum('payment_provider', ['stripe', 'mercadopago']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'approved', 'failed']);

/** Pagamentos únicos (Passe do Edital). Pix (Mercado Pago) e cartão (Stripe). Garante idempotência dos webhooks. */
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    planId: uuid('plan_id').references(() => studyPlans.id, { onDelete: 'set null' }),
    provider: paymentProviderEnum('provider').notNull(),
    providerPaymentId: text('provider_payment_id').notNull(),
    amountCents: integer('amount_cents').notNull(),
    status: paymentStatusEnum('status').notNull().default('pending'),
    pixQrCode: text('pix_qr_code'),
    pixQrBase64: text('pix_qr_base64'),
    pixExpiresAt: timestamp('pix_expires_at', { withTimezone: true }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('payments_provider_id_uq').on(t.provider, t.providerPaymentId),
    index('payments_user_idx').on(t.userId),
  ],
);

/** Licença de um plano específico ("Passe do Edital"): vale até a data da prova + carência. */
export const planLicenses = pgTable(
  'plan_licenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    planId: uuid('plan_id').notNull().references(() => studyPlans.id, { onDelete: 'cascade' }),
    paymentId: uuid('payment_id').references(() => payments.id, { onDelete: 'set null' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('plan_licenses_plan_uq').on(t.planId)],
);

/** Assinatura mensal (Stripe, cartão recorrente). Libera todos os planos. */
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    providerSubscriptionId: text('provider_subscription_id').notNull(),
    status: subscriptionStatusEnum('status').notNull().default('trialing'),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('subscriptions_provider_sub_uq').on(t.providerSubscriptionId),
    index('subscriptions_user_idx').on(t.userId),
  ],
);

/* ----------------------------- relations ------------------------------ */

export const studyPlansRelations = relations(studyPlans, ({ one, many }) => ({
  user: one(users, { fields: [studyPlans.userId], references: [users.id] }),
  availability: many(planAvailability),
  subjects: many(subjects),
  sessions: many(studySessions),
  adjustments: many(planAdjustments),
}));

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  plan: one(studyPlans, { fields: [subjects.planId], references: [studyPlans.id] }),
  sessions: many(studySessions),
}));

export const studySessionsRelations = relations(studySessions, ({ one }) => ({
  plan: one(studyPlans, { fields: [studySessions.planId], references: [studyPlans.id] }),
  subject: one(subjects, { fields: [studySessions.subjectId], references: [subjects.id] }),
}));

export const planAvailabilityRelations = relations(planAvailability, ({ one }) => ({
  plan: one(studyPlans, { fields: [planAvailability.planId], references: [studyPlans.id] }),
}));

export type StudyPlan = typeof studyPlans.$inferSelect;
export type NewStudyPlan = typeof studyPlans.$inferInsert;
export type Subject = typeof subjects.$inferSelect;
export type User = typeof users.$inferSelect;
export type StudySession = typeof studySessions.$inferSelect;
export type NewStudySession = typeof studySessions.$inferInsert;
