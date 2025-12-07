export type Manufacturer = "BBM" | "Calbee" | "Epoch" | "Topps_Japan";
export type Team = "Giants" | "Tigers" | "Dragons" | "Swallows" | "Carp" | "BayStars" | "Hawks" | "Fighters" | "Marines" | "Buffaloes" | "Eagles" | "Lions";
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

export interface ListingItem {
    id: string;
    catalog_id: string;
    price: number | null;
    images: string[];
    condition_grading: ConditionGrading;
    seller_id: string;
    status: string;
    catalog: CardCatalog;
}
