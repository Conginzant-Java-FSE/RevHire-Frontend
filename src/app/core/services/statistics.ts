import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { EmployerStats, JobStats, PlatformStats } from '../models/statistics.model';

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {
  private readonly apiUrl = `${environment.apiUrl}/statistics`;

  constructor(private http: HttpClient) { }

  getEmployerStats(id: number): Observable<ApiResponse<EmployerStats>> {
    return this.http.get<ApiResponse<EmployerStats>>(`${this.apiUrl}/employer/${id}`);
  }

  getPlatformOverview(): Observable<ApiResponse<PlatformStats>> {
    return this.http.get<ApiResponse<PlatformStats>>(`${this.apiUrl}/platform`);
  }

  getJobAnalytics(): Observable<ApiResponse<JobStats>> {
    return this.http.get<ApiResponse<JobStats>>(`${this.apiUrl}/jobs`);
  }

  getApplicationTrends(): Observable<ApiResponse<Array<Record<string, unknown>>>> {
    return this.http.get<ApiResponse<Array<Record<string, unknown>>>>(`${this.apiUrl}/trends`);
  }

  getEmployerActivity(id: number): Observable<ApiResponse<Record<string, unknown>>> {
    return this.http.get<ApiResponse<Record<string, unknown>>>(`${this.apiUrl}/activity/employer/${id}`);
  }

  getSeekerEngagement(id: number): Observable<ApiResponse<Record<string, unknown>>> {
    return this.http.get<ApiResponse<Record<string, unknown>>>(`${this.apiUrl}/engagement/seeker/${id}`);
  }
}
