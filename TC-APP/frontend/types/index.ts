export type Manufacturer = "BBM" | "Calbee" | "Epoch" | "Topps_Japan";
export type Team = "Giants" | "Tigers" | "Dragons" | "Swallows" | "Carp" | "BayStars" | "Hawks" | "Fighters" | "Marines" | "Buffaloes" | "Eagles" | "Lions" | "SamuraiJapan" | "Other";
export type Rarity = "Common" | "Rare" | "Super Rare" | "Parallel" | "Autograph" | "Patch";

export interface CardCatalog {
    id: string;
    manufacturer: Manufacturer;
    year: number;
    series_name?: string;
    player_name: string;
    team: Team;
    card_number?: string;
    rarity?: Rarity;
    is_rookie: boolean;
}

export interface ConditionGrading {
    is_graded: boolean;
    service: string;
    score?: number;
    certification_number?: string;
}

export interface Profile {
    id: string;
    email: string;
    display_name?: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    phone_number?: string;
    postal_code?: string;
    address_line1?: string;
    address_line2?: string;
    real_name_kana?: string;
}

export interface BankAccount {
    id: string;
    user_id: string;
    bank_name: string;
    bank_code?: string;
    branch_name: string;
    branch_code?: string;
    account_type: 'ordinary' | 'current';
    account_number: string;
    account_holder_name: string;
    created_at: string;
}

export interface Payout {
    id: string;
    user_id: string;
    amount: number;
    fee: number;
    payout_amount?: number;
    status: 'pending' | 'paid' | 'rejected';
    created_at: string;
    processed_at?: string;
}

export interface ListingItem {
    id: string;
    // catalog_id: string; // Removed
    price: number | null;
    images: string[];
    condition_grading: ConditionGrading;
    seller_id: string;
    status: string;

    // Flat Fields (Backfilled from Catalog)
    player_name: string | null; // Made nullable but effectively populated
    team: string | null;
    year: number | null;
    manufacturer: string | null;
    series_name?: string | null;
    card_number?: string | null;
    variation?: string | null;
    serial_number?: string | null;
    is_rookie?: boolean;
    is_autograph?: boolean;
    description?: string | null;
    condition_rating?: string | null;

    // catalog: CardCatalog | null; // Removed
    seller?: Profile; // Can be joined
    is_live_moment?: boolean;
    live_moments?: any[];
    moment_history?: MomentHistoryItem[];
    orders?: any[] | any; // Joined via Supabase
    origin_order?: any; // Joined via Supabase
}

export interface MomentHistoryItem {
    moment_id: string;
    timestamp: string;
    title: string;
    player_name: string;
    intensity: number;
    description?: string;
    match_result?: string;
    owner_at_time?: string;
    status?: 'pending' | 'finalized';
}

export interface SellerOrderDetail {
    id: string;
    status: string;
    listing: {
        id: string;
        title: string;
        seller_id: string;
        series_name: string;
        player_name: string;
        images: string[];
        price: number;
    };
    total_amount: number;
    created_at: string;
    // Snapshot of address at time of purchase
    shipping_address_snapshot: {
        name: string;
        postal_code: string;
        address: string;
        phone: string;
    } | null;
    // Legacy fallback columns
    shipping_name?: string;
    shipping_address?: string;
    shipping_postal_code?: string;
    shipping_phone?: string;

    // Shipment details
    tracking_number?: string;
    carrier?: string;
    shipped_at?: string;
    completed_at?: string;
}

export interface SalesHistoryItem {
    orderId: string;
    saleAmount: number;       // 販売価格
    feeRate: number;          // 適用された手数料率（0.10 = 10%）
    platformFee: number;      // 手数料額
    netEarning: number;       // 純収益
    completedAt: string;
    listing: {
        id: string;
        playerName: string;
        image: string | null;
        seriesName?: string;
        manufacturer?: string;
        year?: number;
    } | null;
}

