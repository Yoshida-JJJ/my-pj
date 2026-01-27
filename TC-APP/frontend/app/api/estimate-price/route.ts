import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// Types
// ============================================================

interface EstimatePriceRequest {
    playerName: string;
    year?: string;
    brand?: string;
    cardNumber?: string;
    variation?: string;
    isAutograph?: boolean;
    isGraded?: boolean;
    grade?: string;
}

interface RecentSale {
    title: string;
    price: number;
    currency: string;
    soldDate: string;
    condition?: string;
}

interface EstimatePriceResponse {
    estimatedPriceRange: {
        min: number;
        max: number;
        currency: string;
    };
    recentSales: RecentSale[];
    dataSource: 'ebay' | 'mock';
    searchQuery: string;
}

// ============================================================
// eBay API Integration
// ============================================================

async function getEbayAccessToken(): Promise<string | null> {
    const clientId = process.env.EBAY_CLIENT_ID;
    const clientSecret = process.env.EBAY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return null;
    }

    try {
        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${credentials}`,
            },
            body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
        });

        if (!response.ok) {
            console.error('eBay OAuth failed:', await response.text());
            return null;
        }

        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error('eBay OAuth error:', error);
        return null;
    }
}

async function searchEbaySoldListings(
    query: string,
    accessToken: string
): Promise<{ sales: RecentSale[]; priceRange: { min: number; max: number } } | null> {
    try {
        // eBay Browse API - Search for completed/sold items
        const searchUrl = new URL('https://api.ebay.com/buy/browse/v1/item_summary/search');
        searchUrl.searchParams.set('q', query);
        searchUrl.searchParams.set('filter', 'buyingOptions:{AUCTION},soldItems:true');
        searchUrl.searchParams.set('limit', '10');
        searchUrl.searchParams.set('sort', '-endDate');

        const response = await fetch(searchUrl.toString(), {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            console.error('eBay Search failed:', await response.text());
            return null;
        }

        const data = await response.json();
        const items = data.itemSummaries || [];

        if (items.length === 0) {
            return null;
        }

        const sales: RecentSale[] = items.slice(0, 5).map((item: any) => ({
            title: item.title,
            price: parseFloat(item.price?.value || '0'),
            currency: item.price?.currency || 'USD',
            soldDate: item.itemEndDate || new Date().toISOString(),
            condition: item.condition,
        }));

        const prices = sales.map(s => s.price).filter(p => p > 0);
        const min = Math.min(...prices);
        const max = Math.max(...prices);

        return { sales, priceRange: { min, max } };
    } catch (error) {
        console.error('eBay Search error:', error);
        return null;
    }
}

// ============================================================
// Mock Data Generator
// ============================================================

function generateMockData(request: EstimatePriceRequest): EstimatePriceResponse {
    const { playerName, year, brand, variation, isAutograph, isGraded, grade } = request;

    // Base price calculation based on card attributes
    let basePrice = 1000; // ¥1,000 base

    // Famous players get higher prices
    const famousPlayers = ['ohtani', '大谷', 'trout', 'judge', 'soto', 'acuna'];
    const isTopPlayer = famousPlayers.some(p =>
        playerName.toLowerCase().includes(p)
    );
    if (isTopPlayer) basePrice *= 5;

    // Recent cards (2020+) are generally more valuable
    const cardYear = parseInt(year || '2020');
    if (cardYear >= 2020) basePrice *= 1.5;

    // Premium variations
    const premiumVariations = ['refractor', 'gold', 'auto', 'parallel', 'chrome'];
    const isPremium = premiumVariations.some(v =>
        (variation || '').toLowerCase().includes(v) ||
        (brand || '').toLowerCase().includes(v)
    );
    if (isPremium) basePrice *= 2;

    // Autograph premium
    if (isAutograph) basePrice *= 3;

    // Graded premium
    if (isGraded) {
        basePrice *= 1.5;
        const gradeNum = parseFloat(grade || '9');
        if (gradeNum >= 10) basePrice *= 2;
        else if (gradeNum >= 9.5) basePrice *= 1.5;
    }

    // Add variance for realistic range
    const min = Math.round(basePrice * 0.7);
    const max = Math.round(basePrice * 1.3);

    // Generate mock recent sales
    const mockSales: RecentSale[] = [];
    const baseDate = new Date();
    const conditions = ['PSA 10', 'PSA 9', 'BGS 9.5', 'Raw NM', 'Raw EX'];

    for (let i = 0; i < 5; i++) {
        const saleDate = new Date(baseDate);
        saleDate.setDate(saleDate.getDate() - (i * 3 + Math.floor(Math.random() * 5)));

        const salePrice = min + Math.random() * (max - min);

        mockSales.push({
            title: `${year || '2024'} ${brand || 'Topps'} ${playerName} ${variation || 'Base'} #${Math.floor(Math.random() * 300) + 1}`,
            price: Math.round(salePrice),
            currency: 'JPY',
            soldDate: saleDate.toISOString(),
            condition: conditions[i % conditions.length],
        });
    }

    return {
        estimatedPriceRange: { min, max, currency: 'JPY' },
        recentSales: mockSales,
        dataSource: 'mock',
        searchQuery: buildSearchQuery(request),
    };
}

// ============================================================
// Helpers
// ============================================================

function buildSearchQuery(request: EstimatePriceRequest): string {
    const parts = [
        request.playerName,
        request.year,
        request.brand,
        request.variation,
    ].filter(Boolean);

    if (request.isAutograph) parts.push('autograph');
    if (request.isGraded && request.grade) parts.push(request.grade);

    return parts.join(' ');
}

// ============================================================
// API Handler
// ============================================================

export async function POST(req: NextRequest) {
    try {
        const body: EstimatePriceRequest = await req.json();

        if (!body.playerName) {
            return NextResponse.json(
                { error: 'playerName is required' },
                { status: 400 }
            );
        }

        const searchQuery = buildSearchQuery(body);

        // Try eBay API first
        const accessToken = await getEbayAccessToken();

        if (accessToken) {
            const ebayResult = await searchEbaySoldListings(searchQuery, accessToken);

            if (ebayResult && ebayResult.sales.length > 0) {
                return NextResponse.json({
                    estimatedPriceRange: {
                        ...ebayResult.priceRange,
                        currency: 'USD',
                    },
                    recentSales: ebayResult.sales,
                    dataSource: 'ebay',
                    searchQuery,
                } as EstimatePriceResponse);
            }
        }

        // Fallback to mock data
        console.log('Using mock data for price estimation (eBay API not configured or no results)');
        const mockResponse = generateMockData(body);

        return NextResponse.json(mockResponse);
    } catch (error: any) {
        console.error('Price Estimation Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
