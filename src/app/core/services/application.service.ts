import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApplicationResponse, ApplicationRequest, ApplicationStatus } from '../models/application.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class ApplicationService {
  private apiUrl = `${environment.apiUrl}/applications`;

  constructor(private http: HttpClient) { }

  applyForJob(request: ApplicationRequest): Observable<ApiResponse<ApplicationResponse>> {
    return this.http.post<ApiResponse<ApplicationResponse>>(this.apiUrl, request).pipe(
      map(res => this.normalizeApplicationResponse(res))
    );
  }

  getApplicationsBySeeker(seekerId: number): Observable<ApiResponse<ApplicationResponse[]>> {
    return this.http.get<ApiResponse<ApplicationResponse[]>>(`${this.apiUrl}/seeker/${seekerId}`).pipe(
      map(res => this.normalizeApplicationsResponse(res))
    );
  }

  getApplicationsByJob(jobId: number): Observable<ApiResponse<ApplicationResponse[]>> {
    return this.http.get<ApiResponse<ApplicationResponse[]>>(`${this.apiUrl}/job/${jobId}`).pipe(
      map(res => this.normalizeApplicationsResponse(res))
    );
  }

  getApplicationsByJobAndStatus(jobId: number, status: ApplicationStatus): Observable<ApiResponse<ApplicationResponse[]>> {
    return this.http.get<ApiResponse<ApplicationResponse[]>>(`${this.apiUrl}/job/${jobId}/status/${status}`).pipe(
      map(res => this.normalizeApplicationsResponse(res))
    );
  }

  getActiveApplications(seekerId: number): Observable<ApiResponse<ApplicationResponse[]>> {
    return this.http.get<ApiResponse<ApplicationResponse[]>>(`${this.apiUrl}/active/seeker/${seekerId}`).pipe(
      map(res => this.normalizeApplicationsResponse(res))
    );
  }

  updateApplicationStatus(id: number, status: ApplicationStatus): Observable<ApiResponse<ApplicationResponse>> {
    return this.http.patch<ApiResponse<ApplicationResponse>>(`${this.apiUrl}/${id}/status`, null, {
      params: { status }
    }).pipe(map(res => this.normalizeApplicationResponse(res)));
  }

  withdrawApplication(id: number, reason?: string): Observable<ApiResponse<void>> {
    const payload = reason ? { reason } : null;
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`, { body: payload });
  }

  bulkUpdateStatus(applicationIds: number[], status: ApplicationStatus): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/bulk-status`, { applicationIds, status });
  }

  addNote(applicationId: number, note: string): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/${applicationId}/notes`, note);
  }

  getNotes(applicationId: number): Observable<ApiResponse<Array<{ id: number; note: string; createdAt: string }>>> {
    return this.http.get<ApiResponse<Array<{ id: number; note: string; createdAt: string }>>>(`${this.apiUrl}/${applicationId}/notes`);
  }

  deleteNote(noteId: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/notes/${noteId}`);
  }

  getFullDetails(applicationId: number): Observable<ApiResponse<ApplicationResponse>> {
    return this.http.get<ApiResponse<ApplicationResponse>>(`${this.apiUrl}/${applicationId}/full`).pipe(
      map(res => this.normalizeApplicationResponse(res))
    );
  }

  getStatusHistory(applicationId: number): Observable<ApiResponse<Array<{ id: number; status: ApplicationStatus; createdAt: string }>>> {
    return this.http.get<ApiResponse<Array<{ id: number; status: ApplicationStatus; createdAt: string }>>>(`${this.apiUrl}/${applicationId}/history`);
  }

  getTotalCount(): Observable<ApiResponse<number>> {
    return this.http.get<ApiResponse<number>>(`${this.apiUrl}/count`);
  }

  getTodayCount(): Observable<ApiResponse<number>> {
    return this.http.get<ApiResponse<number>>(`${this.apiUrl}/count/today`);
  }

  searchApplications(query: string): Observable<ApiResponse<ApplicationResponse[]>> {
    return this.http.get<ApiResponse<ApplicationResponse[]>>(`${this.apiUrl}/search`, { params: { query } }).pipe(
      map(res => this.normalizeApplicationsResponse(res))
    );
  }

  getWithdrawalReasons(): Observable<ApiResponse<Array<{ id: number; reason: string }>>> {
    return this.http.get<ApiResponse<Array<{ id: number; reason: string }>>>(`${this.apiUrl}/withdrawal-reasons`);
  }

  private normalizeApplicationsResponse(res: ApiResponse<ApplicationResponse[]>): ApiResponse<ApplicationResponse[]> {
    return {
      ...res,
      data: (res.data || []).map(app => this.normalizeApplication(app))
    };
  }

  private normalizeApplicationResponse(res: ApiResponse<ApplicationResponse>): ApiResponse<ApplicationResponse> {
    return {
      ...res,
      data: res.data ? this.normalizeApplication(res.data) : res.data
    };
  }

  private normalizeApplication(app: ApplicationResponse): ApplicationResponse {
    return {
      ...app,
      updatedAt: app.updatedAt || app.appliedAt
    };
  }
}
