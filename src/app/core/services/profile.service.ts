import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { UserProfileInfo, ResumeResponse } from '../models/profile.model';
import { ApiResponse } from '../models/api-response.model';
import { Role } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private readonly userApiUrl = `${environment.apiUrl}/users`;
  private readonly resumeApiUrl = `${environment.apiUrl}/resumes`;

  constructor(private http: HttpClient) { }

  getCurrentProfile(): Observable<ApiResponse<UserProfileInfo>> {
    return this.http.get<ApiResponse<UserProfileInfo>>(`${this.userApiUrl}/me`);
  }

  updateProfile(id: number, profileData: Partial<UserProfileInfo>): Observable<ApiResponse<UserProfileInfo>> {
    return this.http.put<ApiResponse<UserProfileInfo>>(`${this.userApiUrl}/${id}`, profileData);
  }

  updateMyProfile(profileData: Partial<UserProfileInfo>): Observable<ApiResponse<UserProfileInfo>> {
    return this.http.put<ApiResponse<UserProfileInfo>>(`${this.userApiUrl}/me`, profileData);
  }

  getResume(userId: number): Observable<ApiResponse<ResumeResponse>> {
    return this.http.get<ApiResponse<ResumeResponse>>(`${this.resumeApiUrl}/user/${userId}`).pipe(
      map(res => ({
        ...res,
        data: res.data ? this.normalizeResume(res.data) : res.data
      }))
    );
  }

  uploadResumeFile(userId: number, file: File): Observable<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse<any>>(`${this.resumeApiUrl}/user/${userId}/upload`, formData);
  }

  downloadResumeFile(fileId: number): Observable<Blob> {
    return this.http.get(`${this.resumeApiUrl}/file/${fileId}`, { responseType: 'blob' });
  }

  deleteResumeFile(fileId: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.resumeApiUrl}/file/${fileId}`);
  }

  getUserById(userId: number): Observable<ApiResponse<UserProfileInfo>> {
    return this.http.get<ApiResponse<UserProfileInfo>>(`${this.userApiUrl}/${userId}`);
  }

  searchUsers(query: string): Observable<ApiResponse<UserProfileInfo[]>> {
    return this.http.get<ApiResponse<UserProfileInfo[]>>(`${this.userApiUrl}/search`, { params: { query } });
  }

  getUsersByRole(role: Role): Observable<ApiResponse<UserProfileInfo[]>> {
    return this.http.get<ApiResponse<UserProfileInfo[]>>(`${this.userApiUrl}/role/${role}`);
  }

  getAllEmployers(): Observable<ApiResponse<UserProfileInfo[]>> {
    return this.http.get<ApiResponse<UserProfileInfo[]>>(`${this.userApiUrl}/employers`);
  }

  getAllSeekers(): Observable<ApiResponse<UserProfileInfo[]>> {
    return this.http.get<ApiResponse<UserProfileInfo[]>>(`${this.userApiUrl}/seekers`);
  }

  getTotalUserCount(): Observable<ApiResponse<number>> {
    return this.http.get<ApiResponse<number>>(`${this.userApiUrl}/count`);
  }

  getUserCountByRole(role: Role): Observable<ApiResponse<number>> {
    return this.http.get<ApiResponse<number>>(`${this.userApiUrl}/count/role/${role}`);
  }

  activateAccount(userId: number): Observable<ApiResponse<string>> {
    return this.http.put<ApiResponse<string>>(`${this.userApiUrl}/${userId}/activate`, null);
  }

  deactivateAccount(userId: number): Observable<ApiResponse<string>> {
    return this.http.put<ApiResponse<string>>(`${this.userApiUrl}/${userId}/deactivate`, null);
  }

  updateEmail(userId: number, newEmail: string): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.userApiUrl}/${userId}/email`, null, {
      params: { newEmail }
    });
  }

  bulkToggleStatus(ids: number[], active: boolean): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.userApiUrl}/bulk/toggle-status`, ids, {
      params: { active }
    });
  }

  changePassword(userId: number, oldPassword: string, newPassword: string): Observable<ApiResponse<string>> {
    return this.http.put<ApiResponse<string>>(`${this.userApiUrl}/${userId}/change-password`, null, {
      params: { oldPassword, newPassword }
    });
  }

  saveObjective(userId: number, payload: { objective: string }): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(`${this.resumeApiUrl}/user/${userId}/objective`, payload);
  }

  addEducation(userId: number, payload: Record<string, unknown>): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(`${this.resumeApiUrl}/user/${userId}/education`, payload);
  }

  updateEducation(id: number, payload: Record<string, unknown>): Observable<ApiResponse<unknown>> {
    return this.http.put<ApiResponse<unknown>>(`${this.resumeApiUrl}/education/${id}`, payload);
  }

  deleteEducation(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.resumeApiUrl}/education/${id}`);
  }

  addExperience(userId: number, payload: Record<string, unknown>): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(`${this.resumeApiUrl}/user/${userId}/experience`, payload);
  }

  updateExperience(id: number, payload: Record<string, unknown>): Observable<ApiResponse<unknown>> {
    return this.http.put<ApiResponse<unknown>>(`${this.resumeApiUrl}/experience/${id}`, payload);
  }

  deleteExperience(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.resumeApiUrl}/experience/${id}`);
  }

  addSkill(userId: number, payload: Record<string, unknown>): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(`${this.resumeApiUrl}/user/${userId}/skills`, payload);
  }

  updateSkill(id: number, payload: Record<string, unknown>): Observable<ApiResponse<unknown>> {
    return this.http.put<ApiResponse<unknown>>(`${this.resumeApiUrl}/skills/${id}`, payload);
  }

  deleteSkill(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.resumeApiUrl}/skills/${id}`);
  }

  addProject(userId: number, payload: Record<string, unknown>): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(`${this.resumeApiUrl}/user/${userId}/projects`, payload);
  }

  updateProject(id: number, payload: Record<string, unknown>): Observable<ApiResponse<unknown>> {
    return this.http.put<ApiResponse<unknown>>(`${this.resumeApiUrl}/projects/${id}`, payload);
  }

  deleteProject(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.resumeApiUrl}/projects/${id}`);
  }

  addCertification(userId: number, payload: Record<string, unknown>): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(`${this.resumeApiUrl}/user/${userId}/certifications`, payload);
  }

  updateCertification(id: number, payload: Record<string, unknown>): Observable<ApiResponse<unknown>> {
    return this.http.put<ApiResponse<unknown>>(`${this.resumeApiUrl}/certifications/${id}`, payload);
  }

  deleteCertification(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.resumeApiUrl}/certifications/${id}`);
  }

  getSkills(userId: number): Observable<ApiResponse<unknown[]>> {
    return this.http.get<ApiResponse<unknown[]>>(`${this.resumeApiUrl}/user/${userId}/skills`);
  }

  getEducation(userId: number): Observable<ApiResponse<unknown[]>> {
    return this.http.get<ApiResponse<unknown[]>>(`${this.resumeApiUrl}/user/${userId}/education`);
  }

  getExperience(userId: number): Observable<ApiResponse<unknown[]>> {
    return this.http.get<ApiResponse<unknown[]>>(`${this.resumeApiUrl}/user/${userId}/experience`);
  }

  getProjects(userId: number): Observable<ApiResponse<unknown[]>> {
    return this.http.get<ApiResponse<unknown[]>>(`${this.resumeApiUrl}/user/${userId}/projects`);
  }

  getCertifications(userId: number): Observable<ApiResponse<unknown[]>> {
    return this.http.get<ApiResponse<unknown[]>>(`${this.resumeApiUrl}/user/${userId}/certifications`);
  }

  searchResumesBySkill(skill: string): Observable<ApiResponse<ResumeResponse[]>> {
    return this.http.get<ApiResponse<ResumeResponse[]>>(`${this.resumeApiUrl}/search/skill`, {
      params: { skill }
    }).pipe(
      map(res => ({
        ...res,
        data: (res.data || []).map(item => this.normalizeResume(item))
      }))
    );
  }

  searchResumesByLocation(location: string): Observable<ApiResponse<ResumeResponse[]>> {
    return this.http.get<ApiResponse<ResumeResponse[]>>(`${this.resumeApiUrl}/search/location`, {
      params: { location }
    }).pipe(
      map(res => ({
        ...res,
        data: (res.data || []).map(item => this.normalizeResume(item))
      }))
    );
  }

  getAllSeekerSkills(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.resumeApiUrl}/seeker-skills`);
  }

  getTotalResumeCount(): Observable<ApiResponse<number>> {
    return this.http.get<ApiResponse<number>>(`${this.resumeApiUrl}/count`);
  }

  clearResume(userId: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.resumeApiUrl}/user/${userId}/clear`);
  }

  private normalizeResume(resume: ResumeResponse): ResumeResponse {
    const normalizedFiles = (resume.files || []).map(file => ({
      ...file,
      uploadDate: file.uploadDate || file.uploadedAt || ''
    }));

    return {
      ...resume,
      educationList: resume.educationList || resume.education || [],
      experienceList: resume.experienceList || resume.experience || [],
      skillsList: resume.skillsList || resume.skills || [],
      projectsList: resume.projectsList || resume.projects || [],
      certificationsList: resume.certificationsList || resume.certifications || [],
      files: normalizedFiles,
      resumeFile: resume.resumeFile || normalizedFiles[0]
    };
  }
}
