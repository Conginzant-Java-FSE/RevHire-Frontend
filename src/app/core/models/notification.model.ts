export interface Notification {
    id: number;
    userId?: number;
    targetId?: number;
    message: string;
    isRead: boolean;
    type: string;
    createdAt: string;
}
