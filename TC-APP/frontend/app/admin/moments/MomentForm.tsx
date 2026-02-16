'use client';

import { useState, useActionState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { createLiveMoment, updateLiveMoment } from '@/app/actions/admin';
import { TEAM_GROUPS } from '@/lib/teams';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

type MomentFormProps = {
    editingMoment?: any;
    defaultValues: {
        player: string;
        title: string;
        desc: string;
        intensity: string;
        visitor: string;
        home: string;
        scoreV: string;
        scoreH: string;
        progress: string;
        type: string;
    };
    isAutoFilled?: boolean;
};

export default function MomentForm({ editingMoment, defaultValues, isAutoFilled }: MomentFormProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null); // Base64
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    // AI Text Draft State
    const [isDrafting, setIsDrafting] = useState(false);
    const [draftKeywords, setDraftKeywords] = useState("");

    // Form State (Controlled for AI Auto-fill)
    const [playerName, setPlayerName] = useState(editingMoment?.player_name || defaultValues.player);
    const [title, setTitle] = useState(editingMoment?.title || defaultValues.title);
    const [type, setType] = useState(editingMoment?.type || (defaultValues.type || 'BIG_PLAY'));
    const [intensity, setIntensity] = useState(editingMoment?.intensity || defaultValues.intensity || "3");
    const [description, setDescription] = useState(editingMoment?.description || defaultValues.desc);

    // Auto-scroll to generate button if auto-filled
    useEffect(() => {
        if (isAutoFilled && !editingMoment) {
            const btn = document.getElementById('generate-btn');
            if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [isAutoFilled, editingMoment]);

    const handleAiDraft = async () => {
        setIsDrafting(true);
        try {
            // Combine inputs for context
            const contextKeywords = [
                playerName,
                type,
                draftKeywords
            ].filter(Boolean).join(", ");

            const res = await fetch('/api/ai/text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keywords: contextKeywords }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            // Auto-fill fields
            if (data.title) setTitle(data.title);
            if (data.desc) setDescription(data.desc);
            if (data.intensity) setIntensity(String(data.intensity));

        } catch (e: any) {
            alert(`AI Draft Error: ${e.message}`);
        } finally {
            setIsDrafting(false);
        }
    };

    const handleGenerate = async () => {
        if (!description) {
            alert("画像生成には「詳細説明」が必要です。");
            return;
        }
        setIsGenerating(true);
        setGeneratedImage(null);
        try {
            const res = await fetch('/api/ai/image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: description }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setGeneratedImage(`data:image/png;base64,${data.b64_json}`);
        } catch (e: any) {
            alert(`生成エラー: ${e.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSubmit = async (formData: FormData) => {
        setIsUploading(true);
        setUploadError(null);

        try {
            let imageUrl = editingMoment?.image_url || null;

            // If we have a new generated image, upload it
            if (generatedImage) {
                const supabase = createClient();
                const blob = await (await fetch(generatedImage)).blob();
                const fileExt = 'png';
                const fileName = `generated-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError, data } = await supabase.storage
                    .from('card-images')
                    .upload(filePath, blob, {
                        contentType: 'image/png',
                        upsert: false
                    });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('card-images')
                    .getPublicUrl(filePath);

                imageUrl = publicUrl;
            }

            if (imageUrl) {
                formData.append('imageUrl', imageUrl);
            }

            // Call Server Action
            if (editingMoment) {
                await updateLiveMoment(editingMoment.id, formData);
            } else {
                await createLiveMoment(formData);
            }

            // Reset only if successful create (update keeps user on page usually, but our action redirects/revalidates)
            // Ideally we'd reset state if we stay, but the server action revalidates path.

        } catch (e: any) {
            console.error(e);
            setUploadError(e.message);
            setIsUploading(false); // Stop loading on error
            return; // Don't proceed
        }

        setIsUploading(false);
    };

    return (
        <form action={handleSubmit} className="space-y-4">
            {uploadError && (
                <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded text-sm">
                    {uploadError}
                </div>
            )}

            {/* Player Name */}
            <div>
                <label className="block text-sm text-gray-400 mb-1">選手名 (Player Name)</label>
                <input
                    name="playerName"
                    required
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full bg-black/50 border border-white/20 rounded px-3 py-2 text-white focus:border-[#FFD700] outline-none"
                    placeholder="例: 大谷翔平 / Shohei Ohtani"
                />
            </div>

            {/* AI Text Generation Control */}
            <div className="bg-gray-800/50 p-3 rounded border border-gray-700/50 flex flex-col gap-2">
                <div className="flex gap-2 items-center">
                    <input
                        value={draftKeywords}
                        onChange={(e) => setDraftKeywords(e.target.value)}
                        placeholder="AI生成用キーワード (例: 甲子園, 場外弾, 逆転サヨナラ)"
                        className="flex-1 bg-black/50 border border-white/20 rounded px-3 py-2 text-white text-sm focus:border-[#FFD700] outline-none"
                    />
                    <button
                        type="button"
                        onClick={handleAiDraft}
                        disabled={isDrafting}
                        className="bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold px-4 py-2 rounded flex items-center gap-2 transition-colors whitespace-nowrap"
                    >
                        {isDrafting ? <Loader2 className="w-4 h-4 animate-spin" /> : '✨ AI Draft (Claude)'}
                    </button>
                </div>
                <p className="text-[10px] text-gray-500">
                    ※ 選手名とキーワードから、タイトル・説明・熱狂度を自動生成します。
                </p>
            </div>

            <div>
                <label className="block text-sm text-gray-400 mb-1">タイトル (Title)</label>
                <input
                    name="title"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
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
                        defaultValue={defaultValues.visitor}
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
                        defaultValue={defaultValues.scoreV}
                        className="w-16 bg-black/50 border border-white/20 rounded px-2 py-1 text-white text-center focus:border-[#FFD700]"
                    />
                </div>

                {/* Home */}
                <div className="flex gap-2 items-center">
                    <span className="text-xs text-gray-500 w-12">ホーム</span>
                    <select
                        name="teamHome"
                        required
                        defaultValue={defaultValues.home}
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
                        defaultValue={defaultValues.scoreH}
                        className="w-16 bg-black/50 border border-white/20 rounded px-2 py-1 text-white text-center focus:border-[#FFD700]"
                    />
                </div>

                {/* Progress */}
                <div className="flex gap-2 items-center">
                    <span className="text-xs text-gray-500 w-12">進行</span>
                    <select
                        name="progress"
                        defaultValue={editingMoment ? defaultValues.progress : (defaultValues.progress || 'Top 1st')}
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
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-black/50 border border-white/20 rounded px-3 py-2 text-white focus:border-[#FFD700] outline-none"
                >
                    <option value="HOMERUN">ホームラン (Homerun)</option>
                    <option value="STRIKEOUT">奪三振 (Strikeout)</option>
                    <option value="TIMELY">タイムリー/長打 (Timely/Hit)</option>
                    <option value="VICTORY">勝利 (Victory)</option>
                    <option value="RECORD_BREAK">記録達成 (Record Breaker)</option>
                    <option value="BIG_PLAY">好プレー/その他 (Big Play)</option>
                </select>
            </div>
            <div>
                <label className="block text-sm text-gray-400 mb-1">熱狂度 (Intensity 1-5)</label>
                <select
                    name="intensity"
                    value={intensity}
                    onChange={(e) => setIntensity(e.target.value)}
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
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-black/50 border border-white/20 rounded px-3 py-2 text-white focus:border-[#FFD700] outline-none"
                    placeholder="試合の文脈や詳細など..."
                />
            </div>

            {/* AI Image Generation Section */}
            <div className={`border rounded-lg p-4 transition-colors ${isAutoFilled ? 'border-purple-500/50 bg-purple-900/10' : 'border-white/10 bg-white/5'}`}>
                <div className="flex justify-between items-center mb-4">
                    <label className="text-sm font-bold text-gray-300 flex items-center gap-2">
                        <span>🖼️ カードアート (Card Art)</span>
                        {isAutoFilled && <span className="text-[10px] bg-purple-500 text-white px-2 py-0.5 rounded-full">Recommended</span>}
                    </label>
                </div>

                {/* Generated Image Preview */}
                {(generatedImage || editingMoment?.image_url) && (
                    <div className="mb-4 relative w-full aspect-square max-w-sm mx-auto rounded overflow-hidden border border-white/20">
                        <Image
                            src={generatedImage || editingMoment.image_url}
                            alt="Card Art"
                            fill
                            className="object-cover"
                        />
                        {generatedImage && (
                            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                Preview (Unsaved)
                            </div>
                        )}
                    </div>
                )}

                <button
                    id="generate-btn"
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating || !description}
                    className={`w-full py-2 rounded font-bold text-sm flex items-center justify-center gap-2 transition-all
                        ${isGenerating ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/50'}
                    `}
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating Art...
                        </>
                    ) : (
                        <>
                            <span>⚡ Generate Card Art (DALL-E 3)</span>
                        </>
                    )}
                </button>
                <p className="text-[10px] text-gray-500 mt-2 text-center">
                    ※ 生成には数秒かかります。気に入るまで何度でも再生成可能です。<br />
                    保存時に自動的にアップロードされます。
                </p>
            </div>

            <button
                type="submit"
                disabled={isUploading}
                className={`w-full font-bold py-3 rounded transition-colors flex items-center justify-center gap-2
                    ${editingMoment ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-[#FFD700] hover:bg-[#F0C000] text-black'}
                    ${isUploading ? 'opacity-70 cursor-wait' : ''}
                `}
            >
                {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingMoment ? '変更を保存 (Update)' : 'モーメントを発行 (Broadcast)'}
            </button>
        </form>
    );
}
