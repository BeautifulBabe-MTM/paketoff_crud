export interface PlOrderClient {
    name: string;
    phone: string;
    email: string;
}

export interface PlOrderShipping {
    country: string;
    city: string;
    address: string;
    zip: string;
}

export interface PlOrderItem {
    productId: string;
    name: string;
    size: string;
    print: string;
    quantity: number;
    total: number;
}

export interface PlOrder {
    _id: string;
    client: PlOrderClient;
    shipping: PlOrderShipping;
    items: PlOrderItem[];
    paymentMethod: string;
    paymentStatus: string;
    totalSum: number;
    currency: string;
    locale: string;
    createdAt: string;
    updatedAt: string;
    comment?: string;
    layout?: {
        filename?: string;
        originalName?: string;
        mimeType?: string;
        size?: number;
        storageKey?: string;
        storageProvider?: "r2" | "local";
        pathOnDisk?: string;
        path?: string;
    };
}

export interface PlOrdersResponse {
    orders: PlOrder[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}