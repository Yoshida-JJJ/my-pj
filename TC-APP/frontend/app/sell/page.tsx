'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../utils/supabase/client';
import Footer from '../../components/Footer';
import PremiumCardImage from '../../components/PremiumCardImage';
import MarketPriceLinks from '../../components/MarketPriceLinks';
import CardImageUploader from '../../components/CardImageUploader';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// --- Data Constants ---
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

// Generate Year Options (1950 - Current+1)
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1949 }, (_, i) => (CURRENT_YEAR + 1 - i).toString());

// --- Zod Schema Definition ---
const listingSchema = z.object({
    // --- Section 1: Basic Info (AI-Assisted) ---
    playerName: z.string().min(1, "選手名は必須です"),
    team: z.string().min(1, "球団名は必須です"),
    // Year can be "Unknown" (empty string in UI logic?) or a year string.
    // If user selects "Unknown", value might be empty.
    year: z.string().optional(),
    brand: z.string().min(1, "ブランドは必須です"),

    // --- Section 2: Features & Rarity ---
    variation: z.string().optional(),
    serialNumber: z.string().optional(),
    isRookie: z.boolean().default(false),
    isAutograph: z.boolean().default(false),

    // --- Section 3: Condition & Grading ---
    isGraded: z.boolean().default(false),
    gradingCompany: z.string().optional(),
    grade: z.string().optional(),
    certificationNumber: z.string().optional(),
    condition: z.string().optional(),

    // --- Section 4: Other ---
    price: z.number().min(1, "価格は必須です"),
    description: z.string().optional(),
    images: z.array(z.string()).min(1, "画像は少なくとも1枚必要です"),
}).superRefine((data, ctx) => {
    if (!data.isGraded && !data.condition) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "コンディションを選択してください",
            path: ["condition"],
        });
    }
});

type ListingFormData = z.infer<typeof listingSchema>;

function SellContent() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    const searchParams = useSearchParams();
    const source = searchParams.get('source');
    const sourceId = searchParams.get('id');
    const sourceType = searchParams.get('type');

    // UI State
    const [uploading, setUploading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [aiFeedback, setAiFeedback] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [hasAnalyzed, setHasAnalyzed] = useState(false); // New state to track analysis

    // Country logic (Default JP)
    const [country, setCountry] = useState<'USA' | 'JP'>('JP');

    // Image Selection for AI
    const [selectedImageIndices, setSelectedImageIndices] = useState<number[]>([0]);

    // Drag State
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    // AI Suggestions Data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [suggestedData, setSuggestedData] = useState<any>(null);



    // React Hook Form
    const {
        register,
        handleSubmit,
        setValue,
        getValues,
        watch,
        formState: { errors },
        reset
    } = useForm<ListingFormData>({
        // @ts-expect-error - Resolver type mismatch due to optional default values vs required schema
        resolver: zodResolver(listingSchema),
        defaultValues: {
            playerName: '',
            team: '',
            year: '',
            brand: '', // Default to Unknown (empty string matches "Select Brand..." disabled option)
            variation: '',
            serialNumber: '',
            isRookie: false,
            isAutograph: false,
            isGraded: false,
            gradingCompany: 'PSA',
            grade: '10',
            certificationNumber: '',

            condition: '', // Default to empty to force selection
            price: 0,
            description: '',
            images: [],
        }
    });

    const images = watch('images');
    const isGraded = watch('isGraded');

    useEffect(() => {
        const init = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            if (source === 'collection' && sourceId && user) {
                try {
                    const { data: listingData } = await supabase.from('listing_items').select('*').eq('id', sourceId).single();
                    if (listingData) {
                        // Resell Logic: If I am not the seller, treat as New Listing (Clone data, but INSERT new)
                        // If I AM the seller, treat as Edit (UPDATE existing)
                        setIsEditing(listingData.seller_id === user.id);
                        setHasAnalyzed(true); // Editing implies analysis/data exists
                        reset({
                            playerName: listingData.player_name || '',
                            team: listingData.team || '',
                            year: listingData.year?.toString() || '',
                            brand: listingData.manufacturer || 'Unknown',
                            variation: listingData.variation || '',
                            serialNumber: listingData.serial_number || '',
                            isRookie: listingData.is_rookie || false,
                            isAutograph: listingData.is_autograph || false,
                            isGraded: listingData.condition_grading?.is_graded || false,
                            gradingCompany: listingData.condition_grading?.service || 'PSA',
                            grade: listingData.condition_grading?.score?.toString() || '10',
                            certificationNumber: listingData.condition_grading?.certification_number || '',
                            condition: listingData.condition_rating || 'Near Mint',
                            price: listingData.price || 0,
                            description: listingData.description || '',
                            images: listingData.images || [],
                        });

                        // Infer country
                        if (listingData.team && MLB_TEAMS.includes(listingData.team)) {
                            setCountry('USA');
                        } else {
                            setCountry('JP');
                        }
                    }
                } catch (err) {
                    console.error("Failed to load source", err);
                }
            }
        };
        init();
    }, [source, sourceId, sourceType, reset]);

    const uploadFiles = async (files: FileList) => {
        setUploading(true);
        const supabase = createClient();
        const uploadedUrls: string[] = [];

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

                uploadedUrls.push(publicUrl);
            }

            const currentImages = getValues('images') || [];
            const newImages = [...currentImages, ...uploadedUrls];
            setValue('images', newImages);

            if (currentImages.length === 0 && uploadedUrls.length > 0) {
                setSelectedImageIndices([0]);
            }

        } catch (err: any) {
            console.error("Upload Error Details:", err);
            const msg = err?.message || err?.error_description || JSON.stringify(err);
            setFormError(`Upload Failed: ${msg}`);
        } finally {
            setUploading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        await uploadFiles(e.target.files);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            await uploadFiles(e.dataTransfer.files);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const toggleImageSelection = (index: number) => {
        if (selectedImageIndices.includes(index)) {
            setSelectedImageIndices(prev => prev.filter(i => i !== index));
        } else {
            setSelectedImageIndices(prev => [...prev, index]);
        }
    };

    const removeImage = (index: number) => {
        const currentImages = getValues('images');
        const newImages = currentImages.filter((_, i) => i !== index);
        setValue('images', newImages);
        setSelectedImageIndices(prev => prev.filter(i => i !== index).map(i => i > index ? i - 1 : i));
    };

    // --- Drag & Drop Reordering ---
    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragEnter = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        // Optimistic Reordering 
        const currentImages = getValues('images');
        const newImages = [...currentImages];
        const item = newImages[draggedIndex];
        newImages.splice(draggedIndex, 1);
        newImages.splice(index, 0, item);

        setValue('images', newImages);
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };


    const analyzeImage = async () => {
        const currentImages = getValues('images');
        if (!currentImages || currentImages.length === 0) return;
        if (selectedImageIndices.length === 0) {
            setFormError('解析する画像を選択してください。');
            return;
        }

        const imageIndex = selectedImageIndices[0];
        const imageUrl = currentImages[imageIndex];

        if (!imageUrl) {
            setFormError('選択された画像が見つかりません。画像を再選択してください。');
            return;
        }

        setAnalyzing(true);
        setAiFeedback(null);
        setFormError(null);

        try {
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error(`画像の取得に失敗しました (${response.status})`);
            }
            const blob = await response.blob();

            const base64data = await new Promise<string | ArrayBuffer | null>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('画像の読み込みに失敗しました。'));
                reader.readAsDataURL(blob);
            });

            if (!base64data) {
                throw new Error('画像データの変換に失敗しました。');
            }

            const apiRes = await fetch('/api/analyze-card', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64data }),
            });

            if (!apiRes.ok) {
                const errorData = await apiRes.json().catch(() => ({}));
                throw new Error(errorData.error || `AI解析に失敗しました (${apiRes.status})`);
            }
            const data = await apiRes.json();

            const missingFields = [];
            if (!data.playerName?.value) missingFields.push('Player Name');
            if (!data.year?.value) missingFields.push('Year');

            const hasAnalysis = missingFields.length < 2;

            if (!hasAnalysis) {
                setFormError('AIが選手名・年を特定できませんでした。手動で入力してください。');
                setAnalyzing(false);
                return;
            }

            setSuggestedData(data);
            setHasAnalyzed(true);

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

            // Handle Parallel/Variation logic
            let variationVal = data.variation?.value || '';
            if (data.parallelType?.value) {
                variationVal = variationVal ? `${variationVal} / ${data.parallelType.value}` : data.parallelType.value;
            }
            if (variationVal) setValue('variation', variationVal);

        } catch (err) {
            console.error('AI Analysis Error:', err);
            const message = err instanceof Error ? err.message : '画像解析に失敗しました。もう一度お試しください。';
            setFormError(message);
        } finally {
            setAnalyzing(false);
        }
    };

    const onSubmit = async (formData: ListingFormData) => {
        if (!user?.id) {
            setFormError("You must be logged in to sell items.");
            return;
        }
        setSubmitting(true);
        setFormError(null);

        try {
            const supabase = createClient();
            const listingData = {
                // catalog_id: null, // Removed
                player_name: formData.playerName,
                team: formData.team,
                year: parseInt(formData.year || '') || null, // Handle Unknown/Empty as null
                manufacturer: formData.brand,

                price: formData.price,
                images: formData.images,
                condition_grading: {
                    is_graded: formData.isGraded,
                    service: formData.isGraded ? formData.gradingCompany : "None",
                    score: formData.isGraded ? parseFloat(formData.grade || '0') : null,
                    certification_number: formData.isGraded ? formData.certificationNumber : null
                },
                variation: formData.variation,
                serial_number: formData.serialNumber,
                is_rookie: formData.isRookie,
                is_autograph: formData.isAutograph,
                description: formData.description,
                condition_rating: !formData.isGraded ? formData.condition : null,
                deleted_at: null, // Clear archived status if listed
                status: 'Active'
            };

            if (isEditing && sourceId) {
                const { error: updateError } = await supabase
                    .from('listing_items')
                    .update(listingData)
                    .eq('id', sourceId);
                if (updateError) throw updateError;
                router.push(`/listings/${sourceId}`);
            } else {
                const { data: listing, error: insertError } = await supabase
                    .from('listing_items')
                    .insert({ ...listingData, seller_id: user.id })
                    .select()
                    .single();
                if (insertError) throw insertError;

                if (source === 'collection' && sourceType === 'manual') {
                    await supabase.from('user_collections').delete().eq('id', sourceId);
                }
                router.push(`/listings/${listing.id}`);
            }

        } catch (err: any) {
            console.error("Submission Error:", err);
            // Supabase errors might be objects with a 'message' property but not instances of Error
            const msg = err?.message || err?.error_description || (typeof err === 'string' ? err : 'An error occurred');
            setFormError(msg);
            setSubmitting(false);
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderChip = (label: string, fieldData: any, fieldName: keyof ListingFormData) => {
        if (!fieldData?.value) return (
            <span className="text-xs text-red-400 font-mono ml-2 border border-red-500/20 px-2 py-0.5 rounded-full bg-red-500/10">Unknown</span>
        );
        const isHigh = fieldData.confidence === 'High';
        return (
            <button
                type="button"
                onClick={() => setValue(fieldName, fieldData.value)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:scale-105 active:scale-95 ${isHigh
                    ? 'bg-blue-500/20 text-blue-200 border-blue-500/50 hover:bg-blue-500/30'
                    : 'bg-brand-gold/10 text-brand-gold border-brand-gold/30 hover:bg-brand-gold/20'
                    }`}
            >
                {isHigh && <span>✨</span>}
                <span className="opacity-70">{label}:</span>
                <span className="font-bold">{fieldData.value}</span>
            </button>
        );
    };

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 relative z-20 flex-1 w-full">
            <div className="md:flex md:items-center md:justify-between mb-8">
                <div className="flex-1 min-w-0">
                    <h2 className="text-3xl font-heading font-bold leading-7 text-white sm:text-4xl sm:truncate drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                        新規出品
                    </h2>
                    <p className="mt-2 text-brand-platinum/60">カード画像をアップロードすると、AIが自動で情報を読み取ります</p>
                </div>
            </div>

            <div className="glass-panel-premium rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-gold/5 rounded-full blur-3xl -z-10"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-blue/5 rounded-full blur-3xl -z-10"></div>

                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <form onSubmit={handleSubmit(onSubmit as any)} className="p-8 space-y-12">

                    {/* --- 0a. Optimized Card Image Upload --- */}
                    <div className="mb-8">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            カード画像の最適化アップロード
                        </h3>
                        <p className="text-sm text-brand-platinum/50 mb-4">表面・裏面の画像を自動で800x1120px WebP形式に最適化します</p>
                        <CardImageUploader
                            onUploadComplete={(optimizedImages) => {
                                const currentImages = getValues('images') || [];
                                const newUrls: string[] = [];
                                if (optimizedImages.front) newUrls.push(optimizedImages.front.url);
                                if (optimizedImages.back) newUrls.push(optimizedImages.back.url);
                                setValue('images', [...currentImages, ...newUrls]);
                                if (newUrls.length > 0) {
                                    setSelectedImageIndices([currentImages.length]);
                                }
                            }}
                        />
                    </div>

                    {/* --- 0b. Image Upload --- */}
                    <div className="mb-6">
                        <label
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`group relative flex flex-col items-center justify-center w-full h-80 border-2 border-dashed rounded-2xl transition-all cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''
                                } ${isDragging
                                    ? 'border-brand-gold bg-brand-gold/10 scale-[1.02]'
                                    : 'border-brand-platinum/20 hover:border-brand-gold/50 hover:bg-brand-gold/5'
                                }`}
                        >
                            {images.length > 0 ? (
                                <div className="w-full h-full relative p-4 flex items-center justify-center">
                                    <PremiumCardImage src={images[0]} alt="Main upload" className="max-h-full object-contain rounded-lg shadow-2xl" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                                        <p className="text-white font-bold">画像を追加 / 変更</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <svg className={`w-12 h-12 mb-4 transition-colors ${isDragging ? 'text-brand-gold' : 'text-brand-platinum/50 group-hover:text-brand-gold'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <p className={`mb-2 text-lg ${isDragging ? 'text-white' : 'text-brand-platinum group-hover:text-white'}`}><span className="font-bold">カード画像をアップロード</span></p>
                                    <p className="text-sm text-brand-platinum/50">複数枚のアップロードに対応</p>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={handleImageUpload}
                                disabled={uploading}
                            />
                            {uploading && (
                                <div className="absolute inset-0 bg-brand-dark/80 flex items-center justify-center rounded-2xl backdrop-blur-sm">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-gold"></div>
                                </div>
                            )}
                        </label>

                        {/* Thumbnail Grid & Tools */}
                        <div className="flex justify-between items-start mt-4">
                            <div className="flex gap-2 overflow-x-auto pb-2 flex-1 items-center">
                                {images.map((url, idx) => (
                                    <div
                                        key={idx}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, idx)}
                                        onDragEnter={(e) => handleDragEnter(e, idx)}
                                        onDragEnd={handleDragEnd}
                                        onDragOver={(e) => e.preventDefault()}
                                        onClick={() => toggleImageSelection(idx)}
                                        className={`relative w-20 h-28 flex-shrink-0 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${selectedImageIndices.includes(idx)
                                            ? 'border-brand-gold shadow-[0_0_10px_rgba(212,175,55,0.5)] scale-105'
                                            : 'border-brand-platinum/20 opacity-70 hover:opacity-100'
                                            } group`}
                                        style={{
                                            opacity: draggedIndex === idx ? 0.5 : 1,
                                            transform: draggedIndex === idx ? 'scale(1.05)' : 'scale(1)',
                                        }}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={url} alt={`View ${idx + 1}`} className="w-full h-full object-cover" />
                                        {selectedImageIndices.includes(idx) && (
                                            <div className="absolute top-1 right-1 w-4 h-4 bg-brand-gold rounded-full flex items-center justify-center shadow-md">
                                                <svg className="w-3 h-3 text-brand-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                            </div>
                                        )}
                                        {/* Delete Button (Hover) */}
                                        <div className="absolute top-0 left-0 w-full h-full bg-black/40 hidden group-hover:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                                                className="bg-red-500 rounded-full p-1 text-white hover:bg-red-600"
                                                title="Delete Image"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {images.length > 0 && (
                                <div className="flex flex-col items-end gap-2 ml-4">
                                    <button
                                        type="button"
                                        onClick={analyzeImage}
                                        disabled={analyzing}
                                        className="bg-brand-gold text-brand-dark font-bold px-5 py-2 rounded-full shadow-lg hover:scale-105 transition-transform flex items-center gap-2 whitespace-nowrap"
                                    >
                                        {analyzing ? <div className="w-4 h-4 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" /> : <span>✨ AI解析を実行</span>}
                                    </button>
                                    <Link
                                        href="/check"
                                        className="text-brand-blue hover:text-brand-blue-glow text-sm flex items-center gap-1 transition-colors"
                                    >
                                        🛡️ AI真贋チェック
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- Form Sections (Revealed after Analysis) --- */}
                    {hasAnalyzed && (
                        <div className="space-y-12 animate-fade-in-up">
                            {/* --- Section 1: Basic Info --- */}
                            <section>
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-full bg-brand-gold/20 flex items-center justify-center text-brand-gold text-sm">1</span>
                                    Basic Info (基本情報)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Player Name */}
                                    <div className="md:col-span-2">
                                        <div className="flex justify-between mb-2 items-center">
                                            <label className="text-sm font-medium text-brand-platinum">選手名 <span className="text-red-500">*</span></label>
                                            {suggestedData && renderChip("AI", suggestedData.playerName, 'playerName')}
                                        </div>
                                        <input {...register('playerName')} className="block w-full px-4 py-3 rounded-xl bg-brand-dark-light/50 border border-brand-platinum/10 text-white focus:ring-2 focus:ring-brand-blue" placeholder="大谷翔平 (Shohei Ohtani)" />
                                        {errors.playerName && <p className="text-red-400 text-xs mt-1">{errors.playerName.message}</p>}
                                    </div>

                                    {/* Year Dropdown */}
                                    <div>
                                        <div className="flex justify-between mb-2 items-center">
                                            <label className="text-sm font-medium text-brand-platinum">発行年 <span className="text-red-500">*</span></label>
                                            {suggestedData && renderChip("AI", suggestedData.year, 'year')}
                                        </div>
                                        <div className="relative">
                                            <select
                                                {...register('year')}
                                                className="block w-full px-4 py-3 rounded-xl bg-brand-dark-light/50 border border-brand-platinum/10 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                            >
                                                <option value="" disabled>年を選択...</option>
                                                <option value="Unknown">Unknown (不明)</option>
                                                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                            </select>
                                            <div className="absolute right-3 top-3.5 pointer-events-none text-brand-platinum/50">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>
                                        {errors.year && <p className="text-red-400 text-xs mt-1">{errors.year.message}</p>}
                                    </div>

                                    {/* Brand (Catalog) */}
                                    <div>
                                        <div className="flex justify-between mb-2 items-center">
                                            <label className="text-sm font-medium text-brand-platinum">Brand <span className="text-red-500">*</span></label>
                                        </div>
                                        <div className="relative">
                                            <select
                                                {...register('brand')}
                                                className="block w-full px-4 py-3 rounded-xl bg-brand-dark-light/50 border border-brand-platinum/10 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                            >
                                                <option value="" disabled>ブランドを選択...</option>
                                                {CARD_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                                            </select>
                                            <div className="absolute right-3 top-3.5 pointer-events-none text-brand-platinum/50">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>
                                        {errors.brand && <p className="text-red-400 text-xs mt-1">{errors.brand.message}</p>}
                                    </div>

                                    {/* Team (Localized) */}
                                    <div className="md:col-span-2">
                                        <div className="flex justify-between mb-2 items-center">
                                            <label className="text-sm font-medium text-brand-platinum">Team <span className="text-red-500">*</span></label>
                                        </div>

                                        <div className="flex gap-4">
                                            {/* Country Select */}
                                            <div className="w-1/3">
                                                <select
                                                    value={country}
                                                    onChange={(e) => setCountry(e.target.value as 'USA' | 'JP')}
                                                    className="block w-full px-4 py-3 rounded-xl bg-brand-dark-light/50 border border-brand-platinum/10 text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                                >
                                                    <option value="JP">🇯🇵 NPB (日本)</option>
                                                    <option value="USA">🇺🇸 MLB (米国)</option>
                                                </select>
                                            </div>

                                            {/* Catalog Select */}
                                            <div className="flex-1 relative">
                                                <select
                                                    {...register('team')}
                                                    className="block w-full px-4 py-3 rounded-xl bg-brand-dark-light/50 border border-brand-platinum/10 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                                >
                                                    <option value="" disabled>チームを選択...</option>
                                                    {(country === 'USA' ? MLB_TEAMS : NPB_TEAMS).map(team => (
                                                        <option key={team} value={team}>{team}</option>
                                                    ))}
                                                    <option value="Other">その他</option>
                                                    <option value="Unknown">Unknown (不明)</option>
                                                </select>
                                                <div className="absolute right-3 top-3.5 pointer-events-none text-brand-platinum/50">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                </div>
                                            </div>
                                        </div>
                                        {errors.team && <p className="text-red-400 text-xs mt-1">{errors.team.message}</p>}
                                    </div>
                                </div>
                            </section>

                            {/* --- Section 2: Features & Rarity --- */}
                            <section className="border-t border-white/5 pt-8">
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-full bg-brand-blue/20 flex items-center justify-center text-brand-blue text-sm">2</span>
                                    Features & Rarity (特徴・レアリティ)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Variation */}
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <label className="text-sm font-medium text-brand-platinum">バリエーション</label>
                                            {suggestedData && renderChip("AI", suggestedData.variation, 'variation')}
                                        </div>
                                        <input {...register('variation')} className="block w-full px-4 py-3 rounded-xl bg-brand-dark-light/50 border border-brand-platinum/10 text-white" placeholder="例: Black Refractor" />
                                    </div>

                                    {/* Serial */}
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <label className="text-sm font-medium text-brand-platinum">シリアル番号</label>
                                            {suggestedData && renderChip("AI", suggestedData.serialNumber, 'serialNumber')}
                                        </div>
                                        <input {...register('serialNumber')} className="block w-full px-4 py-3 rounded-xl bg-brand-dark-light/50 border border-brand-platinum/10 text-white" placeholder="例: 01/10" />
                                    </div>

                                    {/* Flags */}
                                    <div className="md:col-span-2 flex gap-8 pt-2">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <input type="checkbox" {...register('isRookie')} className="w-5 h-5 rounded border-brand-platinum/20 bg-brand-dark text-brand-gold focus:ring-brand-gold" />
                                            <span className="text-white group-hover:text-brand-gold transition-colors">ルーキーカード (RC)</span>
                                        </label>
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <input type="checkbox" {...register('isAutograph')} className="w-5 h-5 rounded border-brand-platinum/20 bg-brand-dark text-brand-gold focus:ring-brand-gold" />
                                            <span className="text-white group-hover:text-brand-gold transition-colors">直筆サイン入り (Auto)</span>
                                        </label>
                                    </div>
                                </div>
                            </section>

                            {/* --- Section 3: Condition & Grading --- */}
                            <section className="border-t border-white/5 pt-8">
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-sm">3</span>
                                    Condition (状態)
                                </h3>

                                {/* Graded Toggle */}
                                <div className="flex items-center mb-6 p-4 rounded-xl bg-brand-dark-light/30 border border-white/5 cursor-pointer" onClick={() => setValue('isGraded', !isGraded)}>
                                    <div className={`w-6 h-6 rounded border flex items-center justify-center mr-4 transition-all ${isGraded ? 'bg-brand-gold border-brand-gold' : 'border-brand-platinum/30'}`}>
                                        {isGraded && <svg className="w-4 h-4 text-brand-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <span className="text-white font-bold">鑑定済みですか？ (PSA/BGSなど)</span>
                                </div>

                                {isGraded ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <label className="text-sm font-medium text-brand-platinum">鑑定会社</label>
                                                {suggestedData && renderChip("AI", suggestedData.gradingCompany, 'gradingCompany')}
                                            </div>
                                            <select {...register('gradingCompany')} className="block w-full px-4 py-3 rounded-xl bg-brand-dark-light/50 border border-brand-platinum/10 text-white">
                                                <option value="PSA">PSA</option>
                                                <option value="BGS">BGS</option>
                                                <option value="SGC">SGC</option>
                                                <option value="CGC">CGC</option>
                                                <option value="ARS">ARS</option>
                                            </select>
                                        </div>
                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <label className="text-sm font-medium text-brand-platinum">グレード (点数)</label>
                                                {suggestedData && renderChip("AI", suggestedData.grade, 'grade')}
                                            </div>
                                            <input {...register('grade')} className="block w-full px-4 py-3 rounded-xl bg-brand-dark-light/50 border border-brand-platinum/10 text-white" placeholder="10" />
                                        </div>

                                        {/* Certification Number */}
                                        <div className="md:col-span-2">
                                            <div className="flex justify-between mb-2">
                                                <label className="text-sm font-medium text-brand-platinum">証明番号 (任意)</label>
                                            </div>
                                            <input {...register('certificationNumber')} className="block w-full px-4 py-3 rounded-xl bg-brand-dark-light/50 border border-brand-platinum/10 text-white" placeholder="12345678" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="animate-fade-in-up">
                                        <div className="flex justify-between mb-2">
                                            <label className="text-sm font-medium text-brand-platinum">未鑑定カードの状態</label>
                                            {suggestedData && renderChip("AI", suggestedData.condition, 'condition')}
                                        </div>
                                        <div className="relative">
                                            <select
                                                {...register('condition')}
                                                className="block w-full px-4 py-3 rounded-xl bg-brand-dark-light/50 border border-brand-platinum/10 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                            >
                                                <option value="" disabled>状態を選択...</option>
                                                <option value="Gem Mint">Gem Mint (完品)</option>
                                                <option value="Mint">Mint (美品)</option>
                                                <option value="Near Mint">Near Mint (準美品)</option>
                                                <option value="Excellent">Excellent (良品)</option>
                                                <option value="Very Good">Very Good (可)</option>
                                                <option value="Poor">Poor (難あり)</option>
                                            </select>
                                            <div className="absolute right-3 top-3.5 pointer-events-none text-brand-platinum/50">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* --- Section 4: Other --- */}
                            <section className="border-t border-white/5 pt-8">
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-sm">4</span>
                                    Price & Note (価格・詳細)
                                </h3>
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-sm font-medium text-brand-platinum mb-2 block">商品説明 / 詳細メモ</label>
                                        <textarea {...register('description')} className="block w-full px-4 py-3 rounded-xl bg-brand-dark-light/50 border border-brand-platinum/10 text-white h-24" placeholder="傷の状態や特徴など..." />
                                    </div>

                                    <div>



                                        {/* External Market Links */}
                                        {suggestedData && (
                                            <div className="mb-6">
                                                <MarketPriceLinks
                                                    initialQuery={[
                                                        suggestedData.year?.value,
                                                        suggestedData.brand?.value,
                                                        suggestedData.playerName?.value,
                                                        suggestedData.cardNumber?.value,
                                                        // suggestedData.variation?.value // Optional: might be too specific
                                                    ].filter(Boolean).join(' ')}
                                                />
                                            </div>
                                        )}

                                        <label className="text-sm font-bold text-brand-gold tracking-wider mb-2 block uppercase">販売価格 (円) <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-3.5 text-brand-platinum">¥</span>
                                            <input
                                                type="number"
                                                {...register('price', { valueAsNumber: true })}
                                                className="block w-full pl-8 pr-4 py-3 rounded-xl bg-brand-dark-light/80 border border-brand-platinum/20 text-white font-heading text-lg"
                                                placeholder="5000"
                                            />
                                            {errors.price && <p className="text-red-400 text-xs mt-1">{errors.price.message}</p>}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Status Feedback */}
                            {
                                aiFeedback && (
                                    <div className="rounded-xl bg-green-500/10 p-4 border border-green-500/20 flex items-center gap-3 animate-fade-in-up">
                                        <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        <p className="text-sm text-green-300 font-medium">{aiFeedback}</p>
                                    </div>
                                )
                            }
                            {
                                formError && (
                                    <div className="rounded-xl bg-red-500/10 p-4 border border-red-500/20 flex items-center gap-3 animate-shake">
                                        <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        <p className="text-sm text-red-300 font-medium">{formError}</p>
                                    </div>
                                )
                            }

                            {/* Submit Button */}
                            <div className="pt-6">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className={`w-full flex justify-center items-center gap-2 py-4 px-6 border border-transparent rounded-xl shadow-lg shadow-brand-blue/20 text-lg font-bold text-white bg-gradient-to-r from-brand-blue to-brand-blue-glow hover:from-brand-blue-glow hover:to-brand-blue focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue transition-all transform hover:scale-[1.02] ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {submitting ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>出品中...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>出品する</span>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                </form >
            </div >
        </div >
    );
}

export default function SellPage() {
    return (
        <div className="min-h-screen bg-brand-dark flex flex-col">
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Loading...</div>}>
                <SellContent />
            </Suspense>
            <Footer />
        </div>
    );
}
