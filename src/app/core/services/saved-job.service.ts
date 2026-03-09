import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { JobResponse } from '../models/job.model';

@Injectable({
  providedIn: 'root'
})
export class SavedJobService {
  private apiUrl = `${environment.apiUrl}/saved-jobs`;

  constructor(private http: HttpClient) { }

  saveJob(userId: number, jobId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${userId}/${jobId}`, {});
  }

  unsaveJob(userId: number, jobId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${userId}/${jobId}`);
  }

  getSavedJobs(userId: number): Observable<JobResponse[]> {
    return this.http.get<JobResponse[]>(`${this.apiUrl}/${userId}`);
  }
}
