export type OrderStatus =
    | "new"
    | "processing"
    | "shipped"
    | "completed"
    | "cancelled";

export interface OrderContact {
    name: string;
    phone: string;
    email: string;
}

export interface OrderDelivery {
    method: string;
    address: string;
}

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
    pathOnDisk?: string;
    path?: string;
}

export interface Order {
    _id: string;
    contact: OrderContact;
    delivery: OrderDelivery;
    cart: OrderCartItem[];
    paymentMethod: string;
    total: number;
    status: OrderStatus;
    language: string;
    comment?: string;
    layout?: OrderLayout;
    createdAt: string;
}

export interface OrdersResponse {
    orders: Order[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}