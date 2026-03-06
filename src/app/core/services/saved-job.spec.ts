import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SavedJobService } from './saved-job.service';
import { environment } from '../../../environments/environment';

describe('SavedJobService', () => {
  let service: SavedJobService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/saved-jobs`;

  const mockJob: any = {
    id: 10, title: 'Frontend Dev', companyName: 'UI Corp',
    location: 'Chennai', jobType: 'FULL_TIME', status: 'OPEN'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SavedJobService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(SavedJobService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('saveJob()', () => {
    it('should POST to /saved-jobs/:userId/:jobId', () => {
      service.saveJob(1, 10).subscribe();
      const req = httpMock.expectOne(`${apiUrl}/1/10`);
      expect(req.request.method).toBe('POST');
      req.flush(null);
    });
  });

  describe('unsaveJob()', () => {
    it('should DELETE /saved-jobs/:userId/:jobId', () => {
      service.unsaveJob(1, 10).subscribe();
      const req = httpMock.expectOne(`${apiUrl}/1/10`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('getSavedJobs()', () => {
    it('should GET /saved-jobs/:userId and return jobs', () => {
      service.getSavedJobs(1).subscribe(jobs => {
        expect(jobs.length).toBe(1);
        expect(jobs[0].title).toBe('Frontend Dev');
      });
      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.method).toBe('GET');
      req.flush([mockJob]);
    });

    it('should return empty array when no saved jobs', () => {
      service.getSavedJobs(99).subscribe(jobs => {
        expect(jobs.length).toBe(0);
      });
      const req = httpMock.expectOne(`${apiUrl}/99`);
      req.flush([]);
    });
  });
});
