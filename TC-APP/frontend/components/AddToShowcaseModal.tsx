'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';
import { CardCatalog } from '../types';
import PremiumCardImage from './PremiumCardImage';

interface AddToShowcaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdded: () => void;
}

export default function AddToShowcaseModal({ isOpen, onClose, onAdded }: AddToShowcaseModalProps) {
    const [catalogItems, setCatalogItems] = useState<CardCatalog[]>([]);
    const [loadingCatalog, setLoadingCatalog] = useState(true);
    const [selectedCatalogId, setSelectedCatalogId] = useState<string>('');
    const [images, setImages] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchCatalog();
        }
    }, [isOpen]);

    const fetchCatalog = async () => {
        setLoadingCatalog(true);
        const supabase = createClient();
        const { data, error } = await supabase.from('card_catalogs').select('*');
        if (data) {
            setCatalogItems(data as any);
            if (data.length > 0) setSelectedCatalogId(data[0].id);
        }
        setLoadingCatalog(false);
    };

    const [isDragging, setIsDragging] = useState(false);

    const uploadFile = async (file: File) => {
        setUploading(true);
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        try {
            const supabase = createClient();
            const { error: uploadError } = await supabase.storage
                .from('card-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('card-images')
                .getPublicUrl(filePath);

            setImages(prev => [...prev, publicUrl]);
        } catch (err) {
            console.error(err);
            setError('Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        await uploadFile(e.target.files[0]);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            await uploadFile(e.dataTransfer.files[0]);
        }
    };

    const handleSubmit = async () => {
        setSaving(true);
        setError(null);
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase.from('listing_items').insert({
                seller_id: user.id,
                catalog_id: selectedCatalogId,
                images: images,
                status: 'Draft',
                price: null, // Draft items don't have a price yet
                condition_grading: {
                    is_graded: false, // Default
                    service: 'Raw',
                    score: 0
                }
            });

            if (error) throw error;

            onAdded();
            onClose();
            // Reset form
            setImages([]);
        } catch (err) {
            console.error(err);
            setError('Failed to add to showcase');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-brand-dark border border-brand-platinum/20 rounded-2xl w-full max-w-lg p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-brand-platinum/50 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                <h2 className="text-2xl font-bold text-white mb-6">Add to Workspace</h2>

                <div className="space-y-6">
                    {/* Catalog Selection */}
                    <div>
                        <label className="block text-sm font-medium text-brand-platinum mb-2">Select Card</label>
                        {loadingCatalog ? (
                            <div className="animate-pulse h-10 bg-brand-dark-light rounded-lg"></div>
                        ) : (
                            <select
                                value={selectedCatalogId}
                                onChange={(e) => setSelectedCatalogId(e.target.value)}
                                className="w-full bg-brand-dark-light border border-brand-platinum/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-blue"
                            >
                                {catalogItems.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.player_name} - {item.year} {item.manufacturer}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Image Upload */}
                    <div>
                        <label className="block text-sm font-medium text-brand-platinum mb-2">Images</label>

                        {/* Drag & Drop Area */}
                        <div className="mb-4">
                            <label
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`group relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl transition-all cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''
                                    } ${isDragging
                                        ? 'border-brand-gold bg-brand-gold/10 scale-[1.02]'
                                        : 'border-brand-platinum/20 hover:border-brand-gold/50 hover:bg-brand-gold/5'
                                    }`}
                            >
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <svg className={`w-8 h-8 mb-3 transition-colors ${isDragging ? 'text-brand-gold' : 'text-brand-platinum/50 group-hover:text-brand-gold'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                    <p className={`mb-2 text-sm ${isDragging ? 'text-white' : 'text-brand-platinum group-hover:text-white'}`}><span className="font-bold">Click to upload</span> or drag and drop</p>
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                    disabled={uploading}
                                />
                                {uploading && (
                                    <div className="absolute inset-0 bg-brand-dark/80 flex items-center justify-center rounded-xl backdrop-blur-sm">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-gold"></div>
                                    </div>
                                )}
                            </label>
                        </div>

                        {/* Preview Grid */}
                        {images.length > 0 && (
                            <div className="grid grid-cols-3 gap-4">
                                {images.map((url, idx) => (
                                    <div key={idx} className="aspect-[3/4] relative rounded-lg overflow-hidden border border-brand-platinum/20 group">
                                        <PremiumCardImage src={url} alt="Preview" className="w-full h-full" />
                                        <button
                                            onClick={() => setImages(images.filter((_, i) => i !== idx))}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {error && <p className="text-red-400 text-sm">{error}</p>}

                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="w-full py-3 bg-brand-blue hover:bg-brand-blue-glow text-white font-bold rounded-xl transition-all disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Add to Collection'}
                    </button>
                </div>
            </div>
        </div>
    );
}
