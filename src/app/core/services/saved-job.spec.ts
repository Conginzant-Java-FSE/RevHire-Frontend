import { TestBed } from '@angular/core/testing';

import { SavedJob } from './saved-job';

describe('SavedJob', () => {
  let service: SavedJob;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SavedJob);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
