import { createClient } from '@supabase/supabase-js';
import { createLiveMoment, finalizeMoment, updateLiveMoment, deleteLiveMoment } from '@/app/actions/admin';
import { TEAM_GROUPS } from '@/lib/teams';
import Link from 'next/link';
import DeleteMomentButton from './DeleteMomentButton';

// Admin Client for fetching list
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function AdminMomentsPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined };
}) {
    // Handle searchParams safely
    const params = await searchParams;
    const editId = typeof params?.edit === 'string' ? params.edit : null;

    // Fetch list
    const { data: momentsData } = await supabaseAdmin
        .from('live_moments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    // Fetch usage counts (N+1 tolerated for Admin UI)
    const moments = await Promise.all((momentsData || []).map(async (m) => {
        const { count } = await supabaseAdmin
            .from('listing_items')
            .select('id', { count: 'exact', head: true })
            .contains('moment_history', JSON.stringify([{ moment_id: m.id }]));
        return { ...m, usageCount: count || 0 };
    }));

    // Fetch editing item if needed
    let editingMoment = null;
    if (editId) {
        const { data } = await supabaseAdmin
            .from('live_moments')
            .select('*')
            .eq('id', editId)
            .single();
        editingMoment = data;
    }

    // Parse existing match result to pre-fill detailed fields if editing
    // match_result format example: "LAD 5 - 3 NYY (Top 9th)"
    let defaultVisitor = "";
    let defaultHome = "";
    let defaultScoreV = "";
    let defaultScoreH = "";
    let defaultProgress = "";

    // External Parameters (Auto-fill)
    const extPlayer = typeof params?.player === 'string' ? params.player : '';
    const extTitle = typeof params?.title === 'string' ? params.title : '';
    const extDesc = typeof params?.desc === 'string' ? params.desc : '';
    const extIntensity = typeof params?.intensity === 'string' ? params.intensity : '3';
    const extVisitor = typeof params?.visitor === 'string' ? params.visitor : '';
    const extHome = typeof params?.home === 'string' ? params.home : '';
    const extVisitorScore = typeof params?.visitorScore === 'string' ? params.visitorScore : '';
    const extHomeScore = typeof params?.homeScore === 'string' ? params.homeScore : '';
    // User requested defaults for these:
    // User requested defaults for these:
    const extType = typeof params?.type === 'string' ? params.type : '';
    const extProgress = typeof params?.progress === 'string' ? params.progress : '';

    // Check if any *meaningful* params are present for the banner (checking keys directly avoids default vals triggering it)
    const hasExternalParams = !editId && (
        !!params?.player || !!params?.title || !!params?.desc ||
        !!params?.visitor || !!params?.home ||
        !!params?.visitorScore || !!params?.homeScore ||
        !!params?.progress || !!params?.type
    );

    const isAutoFilled = hasExternalParams;

    if (editingMoment?.match_result) {
        try {
            const regex = /^(.+?)\s+(\d+)\s+-\s+(\d+)\s+(.+?)\s+\((.+)\)$/;
            const match = editingMoment.match_result.match(regex);
            if (match) {
                defaultVisitor = match[1];
                defaultScoreV = match[2];
                defaultScoreH = match[3];
                defaultHome = match[4];
                defaultProgress = match[5];
            }
        } catch (e) {
            console.error("Failed to parse match result", e);
        }
    } else if (isAutoFilled) {
        // Apply external params if valid
        console.log('[AutoFill] Applying external params:', { extVisitor, extHome, extProgress });
        defaultVisitor = extVisitor;
        defaultHome = extHome;
        defaultScoreV = extVisitorScore;
        defaultScoreH = extHomeScore;
        defaultProgress = extProgress;
    }

    return (
        <div className="p-8">
            <h2 className="text-2xl font-bold mb-6">ライブモーメント管理 (Live Matches)</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Form Section */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 h-fit">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className={`text-lg font-bold ${editingMoment ? 'text-blue-400' : 'text-[#FFD700]'}`}>
                            {editingMoment ? 'イベント登録情報の修正' : '新規イベント登録'}
                        </h3>
                        {isAutoFilled && (
                            <div className="ml-4 flex items-center gap-1 bg-purple-900/40 border border-purple-500/30 text-purple-300 text-xs px-2 py-1 rounded animate-pulse w-fit">
                                <span>⚡</span>
                                <span>外部データから自動入力</span>
                            </div>
                        )}
                        {editingMoment && (
                            <Link href="/admin/moments" className="text-xs text-gray-400 hover:text-white border border-gray-600 px-2 py-1 rounded">
                                キャンセル
                            </Link>
                        )}
                    </div>

                    <form action={editingMoment ? updateLiveMoment.bind(null, editingMoment.id) : createLiveMoment} className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">選手名 (Player Name)</label>
                            <input
                                name="playerName"
                                required
                                defaultValue={editingMoment?.player_name || extPlayer}
                                className="w-full bg-black/50 border border-white/20 rounded px-3 py-2 text-white focus:border-[#FFD700] outline-none"
                                placeholder="例: 大谷翔平 / Shohei Ohtani"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">タイトル (Title)</label>
                            <input
                                name="title"
                                required
                                defaultValue={editingMoment?.title || extTitle}
                                className="w-full bg-black/50 border border-white/20 rounded px-3 py-2 text-white focus:border-[#FFD700] outline-none"
                                placeholder="例: Walk-off Home Run"
                            />
                        </div>

                        {/* Match Status */}
                        <div className="bg-black/30 p-3 rounded border border-white/10 space-y-3">
                            <label className="block text-sm text-gray-400 -mb-2">試合状況 (Match Status)</label>

                            {/* Visitor */}
                            <div className="flex gap-2 items-center">
                                <span className="text-xs text-gray-500 w-12">ビジター</span>
                                <select
                                    name="teamVisitor"
                                    required
                                    defaultValue={defaultVisitor || ''}
                                    className="flex-1 bg-black/50 border border-white/20 rounded px-2 py-1 text-white text-sm focus:border-[#FFD700]"
                                >
                                    <option value="">チーム選択...</option>
                                    {TEAM_GROUPS.map((group) => (
                                        <optgroup key={group.label} label={group.label}>
                                            {group.teams.map((team) => (
                                                <option key={team.code} value={team.code}>{team.name}</option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                                <input
                                    name="scoreVisitor"
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    defaultValue={defaultScoreV || ''}
                                    className="w-16 bg-black/50 border border-white/20 rounded px-2 py-1 text-white text-center focus:border-[#FFD700]"
                                />
                            </div>

                            {/* Home */}
                            <div className="flex gap-2 items-center">
                                <span className="text-xs text-gray-500 w-12">ホーム</span>
                                <select
                                    name="teamHome"
                                    required
                                    defaultValue={defaultHome || ''}
                                    className="flex-1 bg-black/50 border border-white/20 rounded px-2 py-1 text-white text-sm focus:border-[#FFD700]"
                                >
                                    <option value="">チーム選択...</option>
                                    {TEAM_GROUPS.map((group) => (
                                        <optgroup key={group.label} label={group.label}>
                                            {group.teams.map((team) => (
                                                <option key={team.code} value={team.code}>{team.name}</option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                                <input
                                    name="scoreHome"
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    defaultValue={defaultScoreH || ''}
                                    className="w-16 bg-black/50 border border-white/20 rounded px-2 py-1 text-white text-center focus:border-[#FFD700]"
                                />
                            </div>

                            {/* Progress */}
                            <div className="flex gap-2 items-center">
                                <span className="text-xs text-gray-500 w-12">進行</span>
                                <select
                                    name="progress"
                                    defaultValue={editingMoment ? defaultProgress : (extProgress || 'Top 1st')}
                                    className="flex-1 bg-black/50 border border-white/20 rounded px-2 py-1 text-white text-sm focus:border-[#FFD700]"
                                >
                                    <option value="Top 1st">Top 1st (1回表)</option>
                                    <option value="Bot 1st">Bot 1st (1回裏)</option>
                                    <option value="Top 2nd">Top 2nd (2回表)</option>
                                    <option value="Bot 2nd">Bot 2nd (2回裏)</option>
                                    <option value="Top 3rd">Top 3rd (3回表)</option>
                                    <option value="Bot 3rd">Bot 3rd (3回裏)</option>
                                    <option value="Top 4th">Top 4th (4回表)</option>
                                    <option value="Bot 4th">Bot 4th (4回裏)</option>
                                    <option value="Top 5th">Top 5th (5回表)</option>
                                    <option value="Bot 5th">Bot 5th (5回裏)</option>
                                    <option value="Top 6th">Top 6th (6回表)</option>
                                    <option value="Bot 6th">Bot 6th (6回裏)</option>
                                    <option value="Top 7th">Top 7th (7回表)</option>
                                    <option value="Bot 7th">Bot 7th (7回裏)</option>
                                    <option value="Top 8th">Top 8th (8回表)</option>
                                    <option value="Bot 8th">Bot 8th (8回裏)</option>
                                    <option value="Top 9th">Top 9th (9回表)</option>
                                    <option value="Bot 9th">Bot 9th (9回裏)</option>
                                    <option value="Top 10th">Top 10th (10回表)</option>
                                    <option value="Bot 10th">Bot 10th (10回裏)</option>
                                    <option value="Top 11th">Top 11th (11回表)</option>
                                    <option value="Bot 11th">Bot 11th (11回裏)</option>
                                    <option value="Top 12th">Top 12th (12回表)</option>
                                    <option value="Bot 12th">Bot 12th (12回裏)</option>
                                    <option value="Final">Final (試合終了)</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-1">イベントタイプ (Type)</label>
                            <select
                                name="type"
                                defaultValue={editingMoment?.type || (extType || 'HOMERUN')}
                                className="w-full bg-black/50 border border-white/20 rounded px-3 py-2 text-white focus:border-[#FFD700] outline-none"
                            >
                                <option value="HOMERUN">ホームラン (Homerun)</option>
                                <option value="VICTORY">勝利 (Victory)</option>
                                <option value="RECORD_BREAK">記録達成 (Record Breaker)</option>
                                <option value="BIG_PLAY">ビッグプレイ/三振 (Big Play)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">熱狂度 (Intensity 1-5)</label>
                            <select
                                name="intensity"
                                defaultValue={editingMoment?.intensity || extIntensity}
                                className="w-full bg-black/50 border border-white/20 rounded px-3 py-2 text-white focus:border-[#FFD700] outline-none"
                            >
                                <option value="5">5 - Legendary (伝説級)</option>
                                <option value="4">4 - High (高)</option>
                                <option value="3">3 - Medium (中)</option>
                                <option value="2">2 - Low (低)</option>
                                <option value="1">1 - Minimal (最小)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">詳細説明 (Description)</label>
                            <textarea
                                name="description"
                                rows={5}
                                defaultValue={editingMoment?.description || extDesc}
                                className="w-full bg-black/50 border border-white/20 rounded px-3 py-2 text-white focus:border-[#FFD700] outline-none"
                                placeholder="試合の文脈や詳細など..."
                            />
                        </div>
                        <button type="submit" className={`w-full font-bold py-3 rounded transition-colors ${editingMoment ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-[#FFD700] hover:bg-[#F0C000] text-black'}`}>
                            {editingMoment ? '変更を保存 (Update)' : 'モーメントを発行 (Broadcast)'}
                        </button>
                    </form>
                </div>

                {/* List Section */}
                <div>
                    <h3 className="text-lg font-bold mb-4 text-gray-300">履歴ログ (History)</h3>
                    <div className="space-y-3">
                        {moments?.map((m: any) => (
                            <div key={m.id} className={`bg-white/5 border p-4 rounded flex justify-between items-start ${editingMoment?.id === m.id ? 'border-blue-500/50 bg-blue-900/10' : 'border-white/10'}`}>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="font-bold text-[#FFD700]">{m.player_name}</div>
                                        <div className="text-xs bg-white/10 px-1.5 py-0.5 rounded text-gray-300">{m.type}</div>
                                        {/* Usage Badge */}
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${m.usageCount > 0 ? 'bg-green-900/40 border-green-500/50 text-green-400' : 'bg-gray-800 border-gray-600 text-gray-500'}`}>
                                            配布数: {m.usageCount || 0}枚
                                        </span>
                                    </div>
                                    <div className="text-sm text-white font-medium">{m.title}</div>
                                    {m.match_result && (
                                        <div className="text-xs text-gray-400 mt-0.5">
                                            {m.match_result}
                                            {m.is_finalized && <span className="ml-2 text-green-400 font-bold">✓ 終了済</span>}
                                        </div>
                                    )}
                                    <div className="text-xs text-gray-500 mt-1">{new Date(m.created_at).toLocaleString('ja-JP')}</div>

                                    {/* Action Buttons */}
                                    <div className="mt-3 flex items-center gap-3">
                                        {m.usageCount > 0 ? (
                                            <div title="配布済み(使用中)のため編集不可" className="flex items-center gap-2 text-gray-500 cursor-not-allowed border border-transparent px-2 py-0.5">
                                                <span className="text-xs">🔒</span>
                                                <span className="text-xs">使用中 (不可)</span>
                                            </div>
                                        ) : (
                                            <>
                                                <Link
                                                    href={`/admin/moments?edit=${m.id}`}
                                                    scroll={false}
                                                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 border border-blue-500/30 px-2 py-0.5 rounded hover:bg-blue-500/10 transition-colors"
                                                >
                                                    ✏️ 編集
                                                </Link>

                                                <DeleteMomentButton id={m.id} />
                                            </>
                                        )}
                                    </div>

                                    {/* Finalize Form for Pending Moments */}
                                    {!m.is_finalized && (
                                        <form action={finalizeMoment.bind(null, m.id)} className="mt-2 pt-2 border-t border-white/5 flex items-center gap-2">
                                            <input
                                                name="finalScore"
                                                required
                                                placeholder="最終スコア (例: 5-3)"
                                                defaultValue={m.match_result || ''}
                                                className="bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white w-32 focus:border-[#FFD700] outline-none"
                                            />
                                            <button type="submit" className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-3 py-1 rounded transition-colors">
                                                試合終了を記録
                                            </button>
                                        </form>
                                    )}
                                </div>
                                <div className="ml-4 flex flex-col items-end gap-2">
                                    <div className="bg-white/10 px-2 py-1 rounded text-xs font-mono whitespace-nowrap">
                                        Lvl {m.intensity}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {moments?.length === 0 && (
                            <div className="text-gray-500 text-sm">記録されたモーメントはありません。</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
