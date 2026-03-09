import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { JobService } from './job.service';
import { environment } from '../../../environments/environment';

describe('JobService', () => {
  let service: JobService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/jobs`;

  const mockJob: any = {
    id: 1, title: 'Software Engineer', companyName: 'TechCorp',
    location: 'Hyderabad', jobType: 'FULL_TIME', salaryMin: 50000, salaryMax: 80000,
    minSalary: 50000, maxSalary: 80000, experienceYears: 2, minExperienceYears: 2,
    maxExperienceYears: 5, status: 'OPEN', postedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(), description: 'Test job',
    requiredSkills: ['Java'], numberOfOpenings: 2, openings: 2, viewsCount: 0
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [JobService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(JobService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAllJobs()', () => {
    it('should GET /jobs and return normalized job list', () => {
      service.getAllJobs().subscribe(res => {
        expect(res.data?.length).toBe(1);
        expect(res.data?.[0].title).toBe('Software Engineer');
      });
      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, message: 'ok', data: [mockJob] });
    });
  });

  describe('getJobById()', () => {
    it('should GET /jobs/:id', () => {
      service.getJobById(1).subscribe(res => {
        expect(res.data?.id).toBe(1);
      });
      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: mockJob });
    });
  });

  describe('searchJobs()', () => {
    it('should GET /jobs/search with query params', () => {
      service.searchJobs('Java', 'Hyderabad', 'FULL_TIME' as any).subscribe();
      const req = httpMock.expectOne(r =>
        r.url === `${apiUrl}/search` &&
        r.params.get('keyword') === 'Java' &&
        r.params.get('location') === 'Hyderabad'
      );
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: [mockJob] });
    });

    it('should GET /jobs/search without optional params when not provided', () => {
      service.searchJobs().subscribe();
      const req = httpMock.expectOne(r => r.url === `${apiUrl}/search`);
      expect(req.request.params.has('keyword')).toBeFalse();
      req.flush({ success: true, data: [] });
    });
  });

  describe('postJob()', () => {
    it('should POST /jobs with job data', () => {
      const jobReq: any = { title: 'Dev', location: 'Hyd', jobType: 'FULL_TIME' };
      service.postJob(jobReq).subscribe(res => {
        expect(res.data?.id).toBe(1);
      });
      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.title).toBe('Dev');
      req.flush({ success: true, data: mockJob });
    });
  });

  describe('updateJob()', () => {
    it('should PUT /jobs/:id', () => {
      const updateReq: any = { title: 'Updated Dev' };
      service.updateJob(1, updateReq).subscribe();
      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.method).toBe('PUT');
      req.flush({ success: true, data: { ...mockJob, title: 'Updated Dev' } });
    });
  });

  describe('deleteJob()', () => {
    it('should DELETE /jobs/:id', () => {
      service.deleteJob(1).subscribe();
      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true, message: 'Job deleted' });
    });
  });

  describe('updateJobStatus()', () => {
    it('should PATCH /jobs/:id/status with status param', () => {
      service.updateJobStatus(1, 'CLOSED' as any).subscribe();
      const req = httpMock.expectOne(r =>
        r.url === `${apiUrl}/1/status` && r.params.get('status') === 'CLOSED'
      );
      expect(req.request.method).toBe('PATCH');
      req.flush({ success: true, data: { ...mockJob, status: 'CLOSED' } });
    });
  });

  describe('closeJob() / reopenJob() / markJobAsFilled()', () => {
    it('should PUT /jobs/:id/close', () => {
      service.closeJob(1).subscribe();
      const req = httpMock.expectOne(`${apiUrl}/1/close`);
      expect(req.request.method).toBe('PUT');
      req.flush({ success: true, data: mockJob });
    });

    it('should PUT /jobs/:id/reopen', () => {
      service.reopenJob(1).subscribe();
      const req = httpMock.expectOne(`${apiUrl}/1/reopen`);
      expect(req.request.method).toBe('PUT');
      req.flush({ success: true, data: mockJob });
    });

    it('should PUT /jobs/:id/mark-filled', () => {
      service.markJobAsFilled(1).subscribe();
      const req = httpMock.expectOne(`${apiUrl}/1/mark-filled`);
      expect(req.request.method).toBe('PUT');
      req.flush({ success: true, data: mockJob });
    });
  });

  describe('getRecentJobs()', () => {
    it('should GET /jobs/recent', () => {
      service.getRecentJobs().subscribe(res => {
        expect(res.data?.length).toBe(1);
      });
      const req = httpMock.expectOne(`${apiUrl}/recent`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: [mockJob] });
    });
  });

  describe('getJobsByEmployer()', () => {
    it('should GET /jobs/employer/:id', () => {
      service.getJobsByEmployer(42).subscribe();
      const req = httpMock.expectOne(`${apiUrl}/employer/42`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: [mockJob] });
    });
  });

  describe('getBasicStats()', () => {
    it('should GET /jobs/count', () => {
      service.getBasicStats().subscribe(res => expect(res.data).toBe(10));
      const req = httpMock.expectOne(`${apiUrl}/count`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: 10 });
    });
  });
});
