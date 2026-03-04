import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params;

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    const queries = [
      supabaseAdmin.from('pocket-matip').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabaseAdmin.from('matip-memo').select('*', { count: 'exact', head: true }).eq('created_by', userId),
      supabaseAdmin.from('matip-memo').select('*', { count: 'exact', head: true }).eq('assignee', userId),
      supabaseAdmin.from('matip-memo-unread').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabaseAdmin.from('push_subscriptions').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabaseAdmin.from('notification_log').select('*', { count: 'exact', head: true }).eq('triggered_by_user_id', userId),
    ];

    const results = await Promise.all(queries);

    const counts = {
      pocket_matip: results[0].count ?? 0,
      memo_created: results[1].count ?? 0,
      memo_assigned: results[2].count ?? 0,
      memo_unread: results[3].count ?? 0,
      push_subs: results[4].count ?? 0,
      notif_triggered: results[5].count ?? 0,
    };

    const canDelete = Object.values(counts).every(c => c === 0);

    return NextResponse.json({ userId, counts, canDelete });
  } catch (e: unknown) {
    console.error('User refs check error:', e);
    const message = e instanceof Error ? e.message : '参照件数の取得に失敗しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
