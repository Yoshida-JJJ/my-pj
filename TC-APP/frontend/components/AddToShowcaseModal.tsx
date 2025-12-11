'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// --- Data Constants (Mirrored from SellPage) ---
const MLB_TEAMS = [
    "アリゾナ・ダイヤモンドバックス", "アトランタ・ブレーブス", "ボルチモア・オリオールズ", "ボストン・レッドソックス", "シカゴ・カブス",
    "シカゴ・ホワイトソックス", "シンシナティ・レッズ", "クリーブランド・ガーディアンズ", "コロラド・ロッキーズ", "デトロイト・タイガース",
    "ヒューストン・アストロズ", "カンザスシティ・ロイヤルズ", "ロサンゼルス・エンゼルス", "ロサンゼルス・ドジャース", "マイアミ・マーリンズ",
    "ミルウォーキー・ブルワーズ", "ミネソタ・ツインズ", "ニューヨーク・メッツ", "ニューヨーク・ヤンキース", "オークランド・アスレチックス",
    "フィラデルフィア・フィリーズ", "ピッツバーグ・パイレーツ", "サンディエゴ・パドレス", "サンフランシスコ・ジャイアンツ", "シアトル・マリナーズ",
    "セントルイス・カージナルス", "タンパベイ・レイズ", "テキサス・レンジャーズ", "トロント・ブルージェイズ", "ワシントン・ナショナルズ"
];

const NPB_TEAMS = [
    "読売ジャイアンツ", "阪神タイガース", "中日ドラゴンズ", "横浜DeNAベイスターズ", "広島東洋カープ", "東京ヤクルトスワローズ",
    "福岡ソフトバンクホークス", "千葉ロッテマリーンズ", "埼玉西武ライオンズ", "東北楽天ゴールデンイーグルス", "北海道日本ハムファイターズ", "オリックス・バファローズ", "日本代表", "その他"
];

const CARD_BRANDS = [
    "Topps", "Panini", "Upper Deck", "BBM", "EPOCH", "Leaf", "Bowman", "Fleer", "Donruss", "Score", "Select", "Prizm", "Chrome", "Finest", "Other", "Unknown"
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1949 }, (_, i) => (CURRENT_YEAR + 1 - i).toString());

// --- Zod Schema ---
const collectionSchema = z.object({
    playerName: z.string().min(1, "Player name is required"),
    team: z.string().min(1, "Team is required"),
    year: z.string().optional(),
    brand: z.string().min(1, "Brand is required"),
    variation: z.string().optional(),
    serialNumber: z.string().optional(),
    isRookie: z.boolean().optional(),
    isAutograph: z.boolean().optional(),
    isGraded: z.boolean().optional(),
    gradingCompany: z.string().optional(),
    grade: z.string().optional(),
    certificationNumber: z.string().optional(),
    condition: z.string().optional(),
    images: z.array(z.string()).min(1, "At least one image is required"),
}).superRefine((data, ctx) => {
    if (!data.isGraded && !data.condition) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Condition is required for raw cards",
            path: ["condition"],
        });
    }
});

type CollectionFormData = z.infer<typeof collectionSchema>;

interface AddToShowcaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdded: () => void;
    mode?: 'add' | 'edit';
    initialData?: any;
}

export default function AddToShowcaseModal({ isOpen, onClose, onAdded, mode = 'add', initialData }: AddToShowcaseModalProps) {
    const [images, setImages] = useState<string[]>([]);
    const [selectedImageIndices, setSelectedImageIndices] = useState<number[]>([]);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [uploading, setUploading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [hasAnalyzed, setHasAnalyzed] = useState(false);
    const [suggestedData, setSuggestedData] = useState<any>(null);
    const [country, setCountry] = useState<'USA' | 'JP'>('USA');
    const [isDragging, setIsDragging] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        getValues,
        watch,
        reset,
        formState: { errors, isSubmitting }
    } = useForm<CollectionFormData>({
        resolver: zodResolver(collectionSchema),
        defaultValues: {
            playerName: '',
            team: '',
            year: '',
            brand: 'Unknown',
            variation: '',
            serialNumber: '',
            isRookie: false,
            isAutograph: false,
            isGraded: false,
            gradingCompany: 'PSA',
            grade: '10',
            certificationNumber: '',
            condition: '',
            images: [],
        }
    });

    const isGraded = watch('isGraded');

    useEffect(() => {
        if (isOpen) {
            reset();
            setHasAnalyzed(false);
            setSuggestedData(null);
            setCountry('USA');

            if (mode === 'edit' && initialData) {
                // Populate for Edit
                setValue('playerName', initialData.player_name || '');
                setValue('team', initialData.team || '');
                setValue('year', initialData.year?.toString() || '');
                setValue('brand', initialData.manufacturer || 'Unknown');
                setValue('variation', initialData.variation || '');
                setValue('serialNumber', initialData.serial_number || '');
                setValue('isRookie', initialData.is_rookie || false);
                setValue('isAutograph', initialData.is_autograph || false);

                // Images
                const existingImages = initialData.images || [];
                setImages(existingImages);
                setValue('images', existingImages);

                // Grading / Condition
                if (initialData.condition_grading?.is_graded) {
                    setValue('isGraded', true);
                    setValue('gradingCompany', initialData.condition_grading.service || 'PSA');
                    setValue('grade', initialData.condition_grading.score?.toString() || '10');
                    setValue('certificationNumber', initialData.condition_grading.certification_number || '');
                } else {
                    setValue('isGraded', false);
                    setValue('condition', initialData.condition_rating || '');
                }
            } else {
                // Reset for Add
                setImages([]);
                setSelectedImageIndices([]);
            }
        }
    }, [isOpen, reset, mode, initialData, setValue]);

    const uploadFiles = async (files: FileList) => {
        setUploading(true);
        const newUrls: string[] = [];
        const supabase = createClient();

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('card-images')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('card-images')
                    .getPublicUrl(filePath);

                newUrls.push(publicUrl);
            }

            const currentImages = getValues('images') || [];
            const updatedImages = [...currentImages, ...newUrls];
            setImages(updatedImages);
            setValue('images', updatedImages);

            if (currentImages.length === 0 && newUrls.length > 0) {
                setSelectedImageIndices([0]);
            }
        } catch (err) {
            console.error(err);
            alert('Failed to upload image(s)');
        } finally {
            setUploading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        await uploadFiles(e.target.files);
    };

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.length > 0) await uploadFiles(e.dataTransfer.files);
    };

    const removeImage = (index: number) => {
        const newImages = images.filter((_, i) => i !== index);
        setImages(newImages);
        setValue('images', newImages);
        setSelectedImageIndices(prev => prev.filter(i => i !== index).map(i => i > index ? i - 1 : i));
    };

    const toggleImageSelection = (index: number) => {
        if (selectedImageIndices.includes(index)) {
            setSelectedImageIndices(prev => prev.filter(i => i !== index));
        } else {
            setSelectedImageIndices(prev => [...prev, index]);
        }
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragEnter = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const currentImages = [...images];
        const item = currentImages[draggedIndex];
        currentImages.splice(draggedIndex, 1);
        currentImages.splice(index, 0, item);

        setImages(currentImages);
        setValue('images', currentImages);
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const analyzeImage = async () => {
        if (images.length === 0) return;
        if (selectedImageIndices.length === 0) {
            alert("Please select at least one image to analyze.");
            return;
        }

        setAnalyzing(true);
        try {
            const imageIndex = selectedImageIndices[0];
            const imageUrl = images[imageIndex];

            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64data = reader.result;
                const apiRes = await fetch('/api/analyze-card', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: base64data }),
                });
                if (!apiRes.ok) throw new Error('AI Analysis failed');
                const data = await apiRes.json();

                setSuggestedData(data);
                setHasAnalyzed(true);

                // Populate Form
                if (data.playerName?.value) setValue('playerName', data.playerName.value);
                if (data.year?.value) setValue('year', data.year.value);
                if (data.variation?.value) setValue('variation', data.variation.value);
                if (data.serialNumber?.value) setValue('serialNumber', data.serialNumber.value);
                if (data.isRookie?.value === 'true') setValue('isRookie', true);
                if (data.isAutograph?.value === 'true') setValue('isAutograph', true);
                if (data.isGraded?.value === 'true') {
                    setValue('isGraded', true);
                    if (data.gradingCompany?.value) setValue('gradingCompany', data.gradingCompany.value);
                    if (data.grade?.value) setValue('grade', data.grade.value);
                } else if (data.condition?.value) {
                    setValue('condition', data.condition.value);
                }
            };
            reader.readAsDataURL(blob);
        } catch (err) {
            console.error(err);
            alert('AI Analysis failed');
        } finally {
            setAnalyzing(false);
        }
    };

    const onSubmit = async (formData: CollectionFormData) => {
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const listingData = {
                seller_id: user.id,
                catalog_id: null, // Decoupled
                player_name: formData.playerName,
                team: formData.team,
                year: parseInt(formData.year || '0') || null,
                manufacturer: formData.brand,
                variation: formData.variation,
                serial_number: formData.serialNumber,
                is_rookie: formData.isRookie || false,
                is_autograph: formData.isAutograph || false,
                images: formData.images,
                status: 'Draft', // Default for Collection
                price: null,
                condition_grading: {
                    is_graded: formData.isGraded || false,
                    service: formData.isGraded ? formData.gradingCompany : "None",
                    score: formData.isGraded ? parseFloat(formData.grade || '0') : null,
                    certification_number: formData.isGraded ? formData.certificationNumber : null
                },
                condition_rating: !formData.isGraded ? formData.condition : null,
            };

            if (mode === 'edit' && initialData?.id) {
                // UPDATE
                const { error } = await supabase
                    .from('listing_items')
                    .update(listingData)
                    .eq('id', initialData.id);

                if (error) throw error;
            } else {
                // INSERT
                const { error } = await supabase.from('listing_items').insert(listingData);
                if (error) throw error;
            }

            onAdded();
            onClose();
        } catch (err: any) {
            console.error(err);
            alert('Failed to save to collection: ' + (err.message || 'Unknown error'));
        }
    };

    const renderChip = (label: string, fieldData: any, fieldName: keyof CollectionFormData) => {
        if (!fieldData?.value) return null;
        return (
            <button
                type="button"
                onClick={() => setValue(fieldName, fieldData.value)}
                className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-brand-gold/10 text-brand-gold border border-brand-gold/30 hover:bg-brand-gold/20"
            >
                AI: {fieldData.value}
            </button>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <div className="glass-panel-premium border border-white/10 rounded-2xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto shadow-2xl">
                <button onClick={onClose} className="absolute top-4 right-4 text-brand-platinum/50 hover:text-white transition-colors z-10 p-2 hover:bg-white/5 rounded-full">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                <h2 className="text-2xl font-heading font-bold text-white mb-6 flex items-center gap-3">
                    <span className="w-1 h-8 bg-brand-gold rounded-full shadow-[0_0_10px_rgba(234,179,8,0.5)]"></span>
                    {mode === 'edit' ? 'Edit Collection Item' : 'Add to Collection'}
                </h2>

                {/* --- Image Upload (Step 1) --- */}
                <div className="mb-6">
                    <label
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`group relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer overflow-hidden ${uploading ? 'opacity-50 cursor-not-allowed' : ''} ${isDragging ? 'border-brand-gold bg-brand-gold/10 scale-[1.02]' : 'border-brand-platinum/20 hover:border-brand-gold/50 hover:bg-brand-gold/5 bg-black/20'}`}
                    >
                        <div className="flex flex-col items-center justify-center">
                            <div className="w-12 h-12 mb-3 rounded-full bg-brand-platinum/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <svg className="w-6 h-6 text-brand-platinum/50 group-hover:text-brand-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                            <p className="text-sm text-brand-platinum font-medium">Click or Drag to Upload</p>
                            <p className="text-xs text-brand-platinum/50 mt-1">Supports Multiple JPG, PNG</p>
                        </div>
                        <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploading} />
                        {uploading && <div className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center rounded-xl"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-gold"></div></div>}
                    </label>

// Show dropzone initially, but if in edit mode and has image, maybe we want to just show images?
                    // User requirement: "keep dropzone visible", so we keep it always.

                    {/* Thumbnails Grid */}
                    {(images.length > 0 || (mode === 'edit' && images.length > 0)) && (
                        <div className="grid grid-cols-5 gap-2 mt-4">
                            {images.map((img, idx) => (
                                <div
                                    key={idx}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, idx)}
                                    onDragEnter={(e) => handleDragEnter(e, idx)}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={(e) => e.preventDefault()}
                                    onClick={() => toggleImageSelection(idx)}
                                    className={`relative aspect-[3/4] group cursor-pointer transition-transform ${draggedIndex === idx ? 'opacity-50 scale-105' : ''}`}
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={img}
                                        alt={`Thumbnail ${idx}`}
                                        className={`w-full h-full object-cover rounded-md border transition-all ${selectedImageIndices.includes(idx) ? 'border-brand-gold ring-2 ring-brand-gold/30' : 'border-white/10'}`}
                                    />
                                    {selectedImageIndices.includes(idx) && (
                                        <div className="absolute top-1 right-1 w-4 h-4 bg-brand-gold rounded-full flex items-center justify-center shadow-md">
                                            <svg className="w-3 h-3 text-brand-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {images.length > 0 && !hasAnalyzed && (
                        <div className="mt-6 flex justify-center">
                            <button
                                onClick={analyzeImage}
                                disabled={analyzing}
                                className="bg-gradient-to-r from-brand-gold to-yellow-400 text-brand-dark font-bold px-8 py-3 rounded-full shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:shadow-[0_0_30px_rgba(234,179,8,0.5)] hover:scale-105 transition-all flex items-center gap-2 text-lg"
                            >
                                {analyzing ? <div className="w-5 h-5 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" /> : <span>✨ AI Auto-Analysis</span>}
                            </button>
                        </div>
                    )}
                </div>

                {/* --- Form (Revealed after Analysis or in Edit Mode) --- */}
                {(hasAnalyzed || mode === 'edit') && (
                    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6 animate-fade-in-up">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-brand-platinum mb-1.5 uppercase tracking-wider">Player Name {suggestedData && renderChip("AI", suggestedData.playerName, 'playerName')}</label>
                                <input {...register('playerName')} className="w-full bg-black/40 border border-brand-platinum/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold/50 transition-all placeholder:text-brand-platinum/30" placeholder="e.g. Shohei Ohtani" />
                                {errors.playerName && <p className="text-red-400 text-xs mt-1">{errors.playerName.message}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-brand-platinum mb-1.5 uppercase tracking-wider">Year {suggestedData && renderChip("AI", suggestedData.year, 'year')}</label>
                                <div className="relative">
                                    <select {...register('year')} className="w-full bg-black/40 border border-brand-platinum/10 rounded-xl px-4 py-3 text-white appearance-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold/50 transition-all">
                                        <option value="" disabled>Select Year</option>
                                        <option value="Unknown">Unknown</option>
                                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                    <div className="absolute right-3 top-3.5 pointer-events-none text-brand-platinum/50">▼</div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-brand-platinum mb-1.5 uppercase tracking-wider">Brand</label>
                                <div className="relative">
                                    <select {...register('brand')} className="w-full bg-black/40 border border-brand-platinum/10 rounded-xl px-4 py-3 text-white appearance-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold/50 transition-all">
                                        <option value="Unknown">Unknown</option>
                                        {CARD_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                    <div className="absolute right-3 top-3.5 pointer-events-none text-brand-platinum/50">▼</div>
                                </div>
                            </div>
                        </div>

                        {/* Team Selection */}
                        <div>
                            <label className="block text-xs font-bold text-brand-platinum mb-1.5 uppercase tracking-wider">Team</label>
                            <div className="flex gap-2">
                                <div className="relative w-1/3">
                                    <select value={country} onChange={(e) => setCountry(e.target.value as any)} className="w-full bg-black/40 border border-brand-platinum/10 rounded-xl px-3 py-3 text-white text-sm appearance-none font-bold">
                                        <option value="JP">🇯🇵 NPB</option>
                                        <option value="USA">🇺🇸 MLB</option>
                                    </select>
                                    <div className="absolute right-2 top-3.5 pointer-events-none text-brand-platinum/50 text-xs">▼</div>
                                </div>
                                <div className="flex-1 relative">
                                    <select {...register('team')} className="w-full bg-black/40 border border-brand-platinum/10 rounded-xl px-4 py-3 text-white appearance-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold/50 transition-all">
                                        <option value="" disabled>Select Team</option>
                                        {(country === 'USA' ? MLB_TEAMS : NPB_TEAMS).map(t => <option key={t} value={t}>{t}</option>)}
                                        <option value="Other">Other</option>
                                        <option value="Unknown">Unknown</option>
                                    </select>
                                    <div className="absolute right-3 top-3.5 pointer-events-none text-brand-platinum/50">▼</div>
                                </div>
                            </div>
                            {errors.team && <p className="text-red-400 text-xs mt-1">{errors.team.message}</p>}
                        </div>

                        {/* Features */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-brand-platinum mb-1.5 uppercase tracking-wider">Variation</label>
                                <input {...register('variation')} className="w-full bg-black/40 border border-brand-platinum/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-brand-gold/50 transition-all placeholder:text-brand-platinum/30" placeholder="e.g. Gold Refractor" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-brand-platinum mb-1.5 uppercase tracking-wider">Serial #</label>
                                <input {...register('serialNumber')} className="w-full bg-black/40 border border-brand-platinum/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-brand-gold/50 transition-all placeholder:text-brand-platinum/30" placeholder="e.g. 05/10" />
                            </div>
                        </div>
                        <div className="flex gap-6 p-4 bg-black/20 rounded-xl border border-white/5">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input type="checkbox" {...register('isRookie')} className="peer sr-only" />
                                    <div className="w-5 h-5 border-2 border-brand-platinum/30 rounded bg-brand-dark peer-checked:bg-brand-gold peer-checked:border-brand-gold transition-all"></div>
                                    <svg className="absolute w-3 h-3 text-brand-dark left-1 top-1 opacity-0 peer-checked:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <span className="text-sm font-bold text-brand-platinum group-hover:text-white transition-colors">Rookie (RC)</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input type="checkbox" {...register('isAutograph')} className="peer sr-only" />
                                    <div className="w-5 h-5 border-2 border-brand-platinum/30 rounded bg-brand-dark peer-checked:bg-brand-gold peer-checked:border-brand-gold transition-all"></div>
                                    <svg className="absolute w-3 h-3 text-brand-dark left-1 top-1 opacity-0 peer-checked:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <span className="text-sm font-bold text-brand-platinum group-hover:text-white transition-colors">Autograph</span>
                            </label>
                        </div>

                        {/* Condition */}
                        <div className="border-t border-brand-platinum/10 pt-6">
                            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                Condition & Grading
                            </h3>
                            <label className="flex items-center gap-3 mb-5 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input type="checkbox" {...register('isGraded')} className="peer sr-only" />
                                    <div className="w-10 h-6 bg-brand-dark border border-brand-platinum/30 rounded-full peer-checked:bg-brand-green/20 peer-checked:border-brand-green/50 transition-all"></div>
                                    <div className="absolute left-1 top-1 w-4 h-4 bg-brand-platinum rounded-full peer-checked:translate-x-4 peer-checked:bg-brand-green transition-all shadow-sm"></div>
                                </div>
                                <span className="text-sm font-medium text-white">Professionally Graded Listing</span>
                            </label>

                            {isGraded ? (
                                <div className="grid grid-cols-3 gap-3 animate-fade-in-up">
                                    <div className="relative">
                                        <select {...register('gradingCompany')} className="w-full bg-black/40 border border-brand-platinum/10 rounded-xl px-3 py-3 text-white text-sm appearance-none font-bold">
                                            <option value="PSA">PSA</option>
                                            <option value="BGS">BGS</option>
                                            <option value="CGC">CGC</option>
                                            <option value="SGC">SGC</option>
                                        </select>
                                        <div className="absolute right-2 top-3.5 pointer-events-none text-brand-platinum/50 text-xs">▼</div>
                                    </div>
                                    <div className="relative">
                                        <select {...register('grade')} className="w-full bg-black/40 border border-brand-platinum/10 rounded-xl px-3 py-3 text-white text-sm appearance-none font-bold">
                                            <option value="10">10</option>
                                            <option value="9.5">9.5</option>
                                            <option value="9">9</option>
                                            <option value="8">8</option>
                                            <option value="Authentic">Auth</option>
                                        </select>
                                        <div className="absolute right-2 top-3.5 pointer-events-none text-brand-platinum/50 text-xs">▼</div>
                                    </div>
                                    <input {...register('certificationNumber')} className="bg-black/40 border border-brand-platinum/10 rounded-xl px-3 py-3 text-white text-sm placeholder:text-brand-platinum/30" placeholder="Cert #" />
                                </div>
                            ) : (
                                <div className="animate-fade-in-up">
                                    <label className="block text-xs font-bold text-brand-platinum mb-1.5 uppercase tracking-wider">Card Condition {suggestedData && renderChip("AI", suggestedData.condition, 'condition')}</label>
                                    <div className="relative">
                                        <select {...register('condition')} className="w-full bg-black/40 border border-brand-platinum/10 rounded-xl px-4 py-3 text-white appearance-none focus:ring-2 focus:ring-brand-gold/50 transition-all">
                                            <option value="" disabled>Select Condition...</option>
                                            <option value="Gem Mint">Gem Mint</option>
                                            <option value="Mint">Mint</option>
                                            <option value="Near Mint">Near Mint</option>
                                            <option value="Excellent">Excellent</option>
                                            <option value="Very Good">Very Good</option>
                                            <option value="Poor">Poor</option>
                                        </select>
                                        <div className="absolute right-3 top-3.5 pointer-events-none text-brand-platinum/50">▼</div>
                                    </div>
                                    {errors.condition && <p className="text-red-400 text-xs mt-1">{errors.condition.message}</p>}
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 bg-gradient-to-r from-brand-blue to-blue-600 hover:from-brand-blue-glow hover:to-blue-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 mt-8 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transform hover:scale-[1.01] active:scale-[0.99]"
                        >
                            {isSubmitting ? (
                                <div className="flex items-center justify-center gap-2">
                                    <span>{mode === 'edit' ? 'Save Changes' : 'Adding...'}</span>
                                </div>
                            ) : (mode === 'edit' ? 'Save Changes' : 'Add to Collection')}
                        </button>
                    </form>
                )}
            </div>
        </div >
    );
}
