
export type OrderStatus =
    | "new"
    | "processing"
    | "shipped"
    | "completed"
    | "cancelled";

export interface OrderCartItem {
    name: string;
    quantity: number;
    price: number;
}

export interface OrderLayout {
    filename?: string;
    originalName?: string;
    mimeType?: string;
    size?: number;

    // Cloudflare R2
    storageKey?: string;
    storageProvider?: "r2" | "local";

    // Старые локальные файлы
    pathOnDisk?: string;
    path?: string;
}

export interface Order {
    _id: string;

    contact: {
        name: string;
        phone: string;
        email: string;
    };

    delivery: {
        method: string;
        address: string;
    };

    cart: OrderCartItem[];

    paymentMethod: string;
    total: number;
    status: OrderStatus;
    language: string;
    comment?: string;
    layout?: OrderLayout;

    createdAt?: string;
    updatedAt?: string;
}

export interface OrdersResponse {
    orders: Order[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}
