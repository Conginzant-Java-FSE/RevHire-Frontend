import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Notification } from '../models/notification.model';

export interface CreateNotificationRequest {
    userId: number;
    message: string;
    type: string;
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private apiUrl = `${environment.apiUrl}/notifications`;

    constructor(private http: HttpClient) { }

    getUserNotifications(userId: number): Observable<Notification[]> {
        return this.http.get<Notification[]>(`${this.apiUrl}/user/${userId}`);
    }

    getUnreadCount(userId: number): Observable<number> {
        return this.http.get<number>(`${this.apiUrl}/user/${userId}/unread-count`);
    }

    markAsRead(id: number): Observable<void> {
        return this.http.patch<void>(`${this.apiUrl}/${id}/read`, {});
    }

    markAsUnread(id: number): Observable<void> {
        return this.http.patch<void>(`${this.apiUrl}/${id}/unread`, {});
    }

    markAllAsRead(userId: number): Observable<void> {
        return this.http.patch<void>(`${this.apiUrl}/user/${userId}/read-all`, {});
    }

    deleteNotification(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    clearAllNotifications(userId: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/user/${userId}/clear-all`);
    }

    createNotification(request: CreateNotificationRequest): Observable<void> {
        return this.http.post<void>(this.apiUrl, request);
    }
}
