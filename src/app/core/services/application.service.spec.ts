import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ApplicationService } from './application.service';
import { environment } from '../../../environments/environment';

describe('ApplicationService', () => {
  let service: ApplicationService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/applications`;

  const mockApp: any = {
    id: 1, jobId: 10, seekerId: 5, status: 'APPLIED',
    appliedAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApplicationService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ApplicationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('applyForJob()', () => {
    it('should POST to /applications', () => {
      const req: any = { jobId: 10, seekerId: 5 };
      service.applyForJob(req).subscribe(res => {
        expect(res.data?.id).toBe(1);
        expect(res.data?.status).toBe('APPLIED');
      });
      const httpReq = httpMock.expectOne(apiUrl);
      expect(httpReq.request.method).toBe('POST');
      httpReq.flush({ success: true, message: 'Applied', data: mockApp });
    });
  });

  describe('getApplicationsBySeeker()', () => {
    it('should GET /applications/seeker/:id', () => {
      service.getApplicationsBySeeker(5).subscribe(res => {
        expect(res.data?.length).toBe(1);
      });
      const req = httpMock.expectOne(`${apiUrl}/seeker/5`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: [mockApp] });
    });
  });

  describe('getApplicationsByJob()', () => {
    it('should GET /applications/job/:id', () => {
      service.getApplicationsByJob(10).subscribe(res => {
        expect(res.data?.length).toBe(1);
      });
      const req = httpMock.expectOne(`${apiUrl}/job/10`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: [mockApp] });
    });
  });

  describe('updateApplicationStatus()', () => {
    it('should PATCH /applications/:id/status', () => {
      service.updateApplicationStatus(1, 'SHORTLISTED' as any).subscribe(res => {
        expect(res.data?.status).toBe('SHORTLISTED');
      });
      const req = httpMock.expectOne(r =>
        r.url === `${apiUrl}/1/status` && r.params.get('status') === 'SHORTLISTED'
      );
      expect(req.request.method).toBe('PATCH');
      req.flush({ success: true, data: { ...mockApp, status: 'SHORTLISTED' } });
    });
  });

  describe('withdrawApplication()', () => {
    it('should DELETE /applications/:id with reason', () => {
      service.withdrawApplication(1, 'Got another offer').subscribe();
      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.body.reason).toBe('Got another offer');
      req.flush({ success: true });
    });

    it('should DELETE /applications/:id without reason', () => {
      service.withdrawApplication(1).subscribe();
      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.body).toBeNull();
      req.flush({ success: true });
    });
  });

  describe('bulkUpdateStatus()', () => {
    it('should POST /applications/bulk-status', () => {
      service.bulkUpdateStatus([1, 2, 3], 'REJECTED' as any).subscribe();
      const req = httpMock.expectOne(`${apiUrl}/bulk-status`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.status).toBe('REJECTED');
      expect(req.request.body.applicationIds).toEqual([1, 2, 3]);
      req.flush({ success: true });
    });
  });

  describe('getTotalCount()', () => {
    it('should GET /applications/count', () => {
      service.getTotalCount().subscribe(res => expect(res.data).toBe(42));
      const req = httpMock.expectOne(`${apiUrl}/count`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: 42 });
    });
  });

  describe('searchApplications()', () => {
    it('should GET /applications/search with query param', () => {
      service.searchApplications('Java').subscribe();
      const req = httpMock.expectOne(r =>
        r.url === `${apiUrl}/search` && r.params.get('query') === 'Java'
      );
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: [mockApp] });
    });
  });

  describe('addNote() / getNotes() / deleteNote()', () => {
    it('should POST /applications/:id/notes', () => {
      service.addNote(1, 'Good candidate').subscribe();
      const req = httpMock.expectOne(`${apiUrl}/1/notes`);
      expect(req.request.method).toBe('POST');
      req.flush({ success: true });
    });

    it('should GET /applications/:id/notes', () => {
      service.getNotes(1).subscribe();
      const req = httpMock.expectOne(`${apiUrl}/1/notes`);
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: [] });
    });

    it('should DELETE /applications/notes/:id', () => {
      service.deleteNote(5).subscribe();
      const req = httpMock.expectOne(`${apiUrl}/notes/5`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true });
    });
  });
});
