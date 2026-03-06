import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { JobResponse, JobPostRequest, JobStatus, JobType } from '../models/job.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class JobService {
  private apiUrl = `${environment.apiUrl}/jobs`;

  constructor(private http: HttpClient) { }

  getAllJobs(): Observable<ApiResponse<JobResponse[]>> {
    return this.http.get<ApiResponse<JobResponse[]>>(this.apiUrl).pipe(
      map(res => this.normalizeJobsResponse(res))
    );
  }

  getJobById(id: number): Observable<ApiResponse<JobResponse>> {
    return this.http.get<ApiResponse<JobResponse>>(`${this.apiUrl}/${id}`).pipe(
      map(res => this.normalizeJobResponse(res))
    );
  }

  searchJobs(keyword?: string, location?: string, jobType?: JobType): Observable<ApiResponse<JobResponse[]>> {
    let params = new HttpParams();
    if (keyword) params = params.set('keyword', keyword);
    if (location) params = params.set('location', location);
    if (jobType) params = params.set('jobType', jobType);

    return this.http.get<ApiResponse<JobResponse[]>>(`${this.apiUrl}/search`, { params }).pipe(
      map(res => this.normalizeJobsResponse(res))
    );
  }

  getJobsByEmployer(employerId: number): Observable<ApiResponse<JobResponse[]>> {
    return this.http.get<ApiResponse<JobResponse[]>>(`${this.apiUrl}/employer/${employerId}`).pipe(
      map(res => this.normalizeJobsResponse(res))
    );
  }

  postJob(jobReq: JobPostRequest): Observable<ApiResponse<JobResponse>> {
    return this.http.post<ApiResponse<JobResponse>>(this.apiUrl, jobReq).pipe(
      map(res => this.normalizeJobResponse(res))
    );
  }

  updateJob(id: number, jobReq: JobPostRequest): Observable<ApiResponse<JobResponse>> {
    return this.http.put<ApiResponse<JobResponse>>(`${this.apiUrl}/${id}`, jobReq).pipe(
      map(res => this.normalizeJobResponse(res))
    );
  }

  deleteJob(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }

  updateJobStatus(id: number, status: JobStatus): Observable<ApiResponse<JobResponse>> {
    return this.http.patch<ApiResponse<JobResponse>>(`${this.apiUrl}/${id}/status`, null, {
      params: { status }
    }).pipe(map(res => this.normalizeJobResponse(res)));
  }

  closeJob(id: number): Observable<ApiResponse<JobResponse>> {
    return this.http.put<ApiResponse<JobResponse>>(`${this.apiUrl}/${id}/close`, null).pipe(
      map(res => this.normalizeJobResponse(res))
    );
  }

  reopenJob(id: number): Observable<ApiResponse<JobResponse>> {
    return this.http.put<ApiResponse<JobResponse>>(`${this.apiUrl}/${id}/reopen`, null).pipe(
      map(res => this.normalizeJobResponse(res))
    );
  }

  markJobAsFilled(id: number): Observable<ApiResponse<JobResponse>> {
    return this.http.put<ApiResponse<JobResponse>>(`${this.apiUrl}/${id}/mark-filled`, null).pipe(
      map(res => this.normalizeJobResponse(res))
    );
  }

  incrementViewCount(id: number): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/${id}/increment-view`, null);
  }

  getRecentJobs(): Observable<ApiResponse<JobResponse[]>> {
    return this.http.get<ApiResponse<JobResponse[]>>(`${this.apiUrl}/recent`).pipe(
      map(res => this.normalizeJobsResponse(res))
    );
  }

  getTrendingJobs(): Observable<ApiResponse<JobResponse[]>> {
    return this.http.get<ApiResponse<JobResponse[]>>(`${this.apiUrl}/trending`).pipe(
      map(res => this.normalizeJobsResponse(res))
    );
  }

  filterJobs(minSalary?: number, jobType?: JobType): Observable<ApiResponse<JobResponse[]>> {
    let params = new HttpParams();
    if (minSalary !== undefined && minSalary !== null) params = params.set('minSalary', String(minSalary));
    if (jobType) params = params.set('jobType', jobType);
    return this.http.get<ApiResponse<JobResponse[]>>(`${this.apiUrl}/filter`, { params }).pipe(
      map(res => this.normalizeJobsResponse(res))
    );
  }

  getAllSkills(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.apiUrl}/skills`);
  }

  getJobsBySkill(skill: string): Observable<ApiResponse<JobResponse[]>> {
    return this.http.get<ApiResponse<JobResponse[]>>(`${this.apiUrl}/by-skill`, {
      params: { skill }
    }).pipe(map(res => this.normalizeJobsResponse(res)));
  }

  getJobLocations(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.apiUrl}/locations`);
  }

  getJobTypes(): Observable<ApiResponse<JobType[]>> {
    return this.http.get<ApiResponse<JobType[]>>(`${this.apiUrl}/types`);
  }

  getBasicStats(): Observable<ApiResponse<number>> {
    return this.http.get<ApiResponse<number>>(`${this.apiUrl}/count`);
  }

  getActiveJobsCount(): Observable<ApiResponse<number>> {
    return this.http.get<ApiResponse<number>>(`${this.apiUrl}/count/active`);
  }

  bulkDeleteJobs(ids: number[]): Observable<ApiResponse<void>> {
    return this.http.request<ApiResponse<void>>('delete', `${this.apiUrl}/bulk`, { body: ids });
  }

  getApplicationCount(jobId: number): Observable<ApiResponse<number>> {
    return this.http.get<ApiResponse<number>>(`${this.apiUrl}/${jobId}/application-count`);
  }

  private normalizeJobsResponse(res: ApiResponse<JobResponse[]>): ApiResponse<JobResponse[]> {
    return {
      ...res,
      data: (res.data || []).map(job => this.normalizeJob(job))
    };
  }

  private normalizeJobResponse(res: ApiResponse<JobResponse>): ApiResponse<JobResponse> {
    return {
      ...res,
      data: res.data ? this.normalizeJob(res.data) : res.data
    };
  }

  private normalizeJob(job: JobResponse): JobResponse {
    const salaryMin = job.salaryMin ?? job.minSalary ?? 0;
    const salaryMax = job.salaryMax ?? job.maxSalary ?? 0;
    const experience = job.experienceYears ?? job.minExperienceYears ?? 0;
    const postedAt = job.postedAt ?? job.createdAt ?? new Date().toISOString();

    return {
      ...job,
      salaryMin,
      salaryMax,
      minSalary: salaryMin,
      maxSalary: salaryMax,
      experienceYears: experience,
      minExperienceYears: job.minExperienceYears ?? experience,
      maxExperienceYears: job.maxExperienceYears ?? experience,
      numberOfOpenings: job.numberOfOpenings ?? job.openings ?? 0,
      openings: job.openings ?? job.numberOfOpenings ?? 0,
      viewsCount: job.viewsCount ?? job.viewCount ?? 0,
      viewCount: job.viewCount ?? job.viewsCount ?? 0,
      createdAt: job.createdAt ?? postedAt,
      updatedAt: job.updatedAt ?? postedAt,
      postedAt
    };
  }
}
