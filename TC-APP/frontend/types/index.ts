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
    seller: Profile;
    is_live_moment?: boolean;
}
