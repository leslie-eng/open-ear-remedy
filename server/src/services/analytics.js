import { query } from '../db.js';

/** Paystack stores purchase amounts in minor units (cents/kobo). */
export function minorToMajor(amount) {
  return Math.round((Number(amount) || 0)) / 100;
}

export function rangeToSince(range) {
  if (!range || range === 'all') return null;
  const days = { '7d': 7, '30d': 30, '90d': 90 }[range] ?? 30;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function previousRangeSince(range) {
  if (!range || range === 'all') return { current: null, previous: null };
  const days = { '7d': 7, '30d': 30, '90d': 90 }[range] ?? 30;
  const end = new Date();
  const currentStart = new Date(end);
  currentStart.setUTCDate(currentStart.getUTCDate() - days);
  const previousStart = new Date(currentStart);
  previousStart.setUTCDate(previousStart.getUTCDate() - days);
  return {
    current: currentStart.toISOString(),
    previous: previousStart.toISOString(),
    currentEnd: end.toISOString(),
  };
}

export async function getOverviewAnalytics(range = '30d') {
  const since = rangeToSince(range);
  const bounds = previousRangeSince(range);

  const userFilter = since ? 'AND u.created_at >= $1' : '';
  const params = since ? [since] : [];

  const { rows: userRows } = await query(
    since
      ? `SELECT
          COUNT(*) FILTER (WHERE email_verified_at IS NOT NULL) AS total_users,
          COUNT(*) FILTER (WHERE email_verified_at IS NOT NULL AND created_at >= $1) AS new_users
         FROM users`
      : `SELECT
          COUNT(*) FILTER (WHERE email_verified_at IS NOT NULL) AS total_users,
          COUNT(*) FILTER (WHERE email_verified_at IS NOT NULL) AS new_users
         FROM users`,
    params,
  );

  const activeSince = since ? 'WHERE started_at >= $1' : '';
  const txSince = since ? 'WHERE created_at >= $1' : '';
  const moodSince = since ? 'WHERE created_at >= $1' : '';
  const { rows: activeRows } = await query(
    `SELECT COUNT(DISTINCT user_id) AS active_users FROM (
       SELECT user_id FROM call_history ${activeSince}
       UNION
       SELECT user_id FROM credit_transactions ${txSince}
       UNION
       SELECT user_id FROM mood_logs ${moodSince}
     ) t`,
    params,
  );

  const purchaseFilter = since ? "AND created_at >= $1 AND type = 'purchase' AND status = 'completed'" : "AND type = 'purchase' AND status = 'completed'";
  const { rows: revenueRows } = await query(
    `SELECT COALESCE(SUM(amount), 0) AS total_minor FROM credit_transactions WHERE 1=1 ${purchaseFilter}`,
    params,
  );

  let revenueGrowth = 0;
  if (bounds.current && bounds.previous) {
    const { rows: cur } = await query(
      `SELECT COALESCE(SUM(amount), 0) AS v FROM credit_transactions
       WHERE type = 'purchase' AND status = 'completed' AND created_at >= $1 AND created_at <= $2`,
      [bounds.current, bounds.currentEnd],
    );
    const { rows: prev } = await query(
      `SELECT COALESCE(SUM(amount), 0) AS v FROM credit_transactions
       WHERE type = 'purchase' AND status = 'completed' AND created_at >= $1 AND created_at < $2`,
      [bounds.previous, bounds.current],
    );
    const prevVal = Number(prev[0]?.v) || 0;
    const curVal = Number(cur[0]?.v) || 0;
    revenueGrowth = prevVal > 0 ? Math.round(((curVal - prevVal) / prevVal) * 100) : curVal > 0 ? 100 : 0;
  }

  const { rows: sessionRows } = await query(
    `SELECT COUNT(*) AS total_sessions,
            COUNT(*) FILTER (WHERE status = 'completed') AS completed_sessions
     FROM call_history WHERE 1=1 ${activeSince}`,
    params,
  );

  const { rows: durationRows } = await query(
    `SELECT COALESCE(AVG(NULLIF(duration_seconds, 0)), 0) AS avg_seconds
     FROM call_history WHERE status = 'completed' ${activeSince}`,
    params,
  );

  const totalRevenue = minorToMajor(revenueRows[0]?.total_minor);
  const avgSeconds = Math.round(Number(durationRows[0]?.avg_seconds) || 0);

  return {
    totalUsers: Number(userRows[0]?.total_users) || 0,
    newUsers: Number(userRows[0]?.new_users) || 0,
    activeUsers: Number(activeRows[0]?.active_users) || 0,
    totalRevenue,
    revenueGrowth,
    totalSessions: Number(sessionRows[0]?.total_sessions) || 0,
    completedSessions: Number(sessionRows[0]?.completed_sessions) || 0,
    avgSessionDurationSeconds: avgSeconds,
    paidSessions: Number(sessionRows[0]?.completed_sessions) || 0,
    freeSessions: Math.max(
      0,
      Number(sessionRows[0]?.total_sessions) - Number(sessionRows[0]?.completed_sessions),
    ),
  };
}

export async function getRevenueSeries(groupBy = 'month', range = '30d') {
  const since = rangeToSince(range);
  const trunc =
    groupBy === 'day' ? 'day' : groupBy === 'year' ? 'year' : 'month';
  const params = since ? [since] : [];
  const filter = since ? 'AND created_at >= $1' : '';

  const { rows: purchaseRows } = await query(
    `SELECT date_trunc('${trunc}', created_at) AS period,
            COALESCE(SUM(amount), 0) AS revenue_minor,
            COUNT(*) AS purchases
     FROM credit_transactions
     WHERE type = 'purchase' AND status = 'completed' ${filter}
     GROUP BY 1 ORDER BY 1`,
    params,
  );

  const sessionFilter = since ? 'AND started_at >= $1' : '';
  const { rows: sessionRows } = await query(
    `SELECT date_trunc('${trunc}', started_at) AS period,
            COUNT(*) AS sessions
     FROM call_history WHERE 1=1 ${sessionFilter}
     GROUP BY 1 ORDER BY 1`,
    params,
  );

  const sessionMap = new Map(
    sessionRows.map((r) => [new Date(r.period).toISOString(), Number(r.sessions)]),
  );

  const series = purchaseRows.map((r) => {
    const key = new Date(r.period).toISOString();
    const label = formatLabel(r.period, groupBy);
    return {
      label,
      period: key,
      amount: minorToMajor(r.revenue_minor),
      sessions: sessionMap.get(key) || 0,
      purchases: Number(r.purchases) || 0,
    };
  });

  return { series, groupBy, range };
}

function formatLabel(period, groupBy) {
  const d = new Date(period);
  if (groupBy === 'day') {
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
  if (groupBy === 'year') {
    return String(d.getFullYear());
  }
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export async function getRevenueBreakdown(range = '30d') {
  const since = rangeToSince(range);
  const params = since ? [since] : [];
  const filter = since ? 'AND created_at >= $1' : '';

  const { rows: callUsage } = await query(
    `SELECT COALESCE(SUM(ABS(credits)), 0) AS credits
     FROM credit_transactions
     WHERE type = 'usage' AND description ILIKE 'Call duration%' ${filter}`,
    params,
  );

  const { rows: chatUsage } = await query(
    `SELECT COALESCE(SUM(ABS(credits)), 0) AS credits
     FROM credit_transactions
     WHERE type = 'usage' AND description = 'Chat message' ${filter}`,
    params,
  );

  const { rows: topDays } = await query(
    `SELECT TRIM(TO_CHAR(created_at, 'Day')) AS day_name,
            COALESCE(SUM(amount), 0) AS revenue_minor
     FROM credit_transactions
     WHERE type = 'purchase' AND status = 'completed' ${filter}
     GROUP BY 1 ORDER BY revenue_minor DESC LIMIT 5`,
    params,
  );

  const callCredits = Number(callUsage[0]?.credits) || 0;
  const chatCredits = Number(chatUsage[0]?.credits) || 0;
  const totalUsageCredits = callCredits + chatCredits;

  return {
    usageByType: [
      { type: 'Voice Calls', credits: callCredits, percent: totalUsageCredits ? Math.round((callCredits / totalUsageCredits) * 100) : 0 },
      { type: 'Chat Sessions', credits: chatCredits, percent: totalUsageCredits ? Math.round((chatCredits / totalUsageCredits) * 100) : 0 },
    ],
    topEarningDays: topDays.map((r) => ({
      day: r.day_name,
      amount: minorToMajor(r.revenue_minor),
    })),
  };
}

export async function getUsersList(limit = 100) {
  const { rows } = await query(
    `SELECT
      u.id,
      u.email,
      COALESCE(u.full_name, '') AS name,
      u.created_at AS join_date,
      COALESCE(uc.credits, 0) AS credits,
      (SELECT COUNT(*)::int FROM call_history ch WHERE ch.user_id = u.id) AS total_sessions,
      (SELECT COALESCE(SUM(ct.amount), 0)::bigint FROM credit_transactions ct
        WHERE ct.user_id = u.id AND ct.type = 'purchase' AND ct.status = 'completed') AS total_spent_minor,
      (SELECT GREATEST(
        COALESCE((SELECT MAX(ch.started_at) FROM call_history ch WHERE ch.user_id = u.id), 'epoch'::timestamptz),
        COALESCE((SELECT MAX(ct.created_at) FROM credit_transactions ct WHERE ct.user_id = u.id), 'epoch'::timestamptz),
        COALESCE((SELECT MAX(ml.created_at) FROM mood_logs ml WHERE ml.user_id = u.id), 'epoch'::timestamptz)
      )) AS last_active
     FROM users u
     LEFT JOIN user_credits uc ON uc.user_id = u.id
     WHERE u.email_verified_at IS NOT NULL
     ORDER BY u.created_at DESC
     LIMIT $1`,
    [Math.min(limit, 500)],
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name || r.email.split('@')[0],
    email: r.email,
    credits: Number(r.credits) || 0,
    totalSessions: Number(r.total_sessions) || 0,
    totalSpent: minorToMajor(r.total_spent_minor),
    joinDate: r.join_date,
    lastActive: r.last_active,
  }));
}

export async function getMonthlyRevenueInRange(range = '30d') {
  const since = rangeToSince(range);
  const params = since ? [since] : [];
  const filter = since ? 'AND created_at >= $1' : '';
  const { rows } = await query(
    `SELECT COALESCE(SUM(amount), 0) AS v FROM credit_transactions
     WHERE type = 'purchase' AND status = 'completed' ${filter}`,
    params,
  );
  return minorToMajor(rows[0]?.v);
}
