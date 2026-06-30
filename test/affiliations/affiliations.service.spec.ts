import {
  AffiliationRepository,
  type AffiliationSummary,
} from '../../src/affiliations/affiliations.repository';
import { AffiliationsService } from '../../src/affiliations/affiliations.service';
import type { Affiliation } from '../../src/affiliations/affiliation.entity';

describe('AffiliationsService', () => {
  it('repository의 소속 요약 목록을 응답 DTO로 반환한다', async () => {
    const repository = new FakeAffiliationRepository();
    const service = new AffiliationsService(repository);

    repository.summaries = [{ code: 'teacher', name: '선생님' }];

    await expect(service.list()).resolves.toEqual([
      { code: 'teacher', name: '선생님' },
    ]);
  });
});

class FakeAffiliationRepository implements AffiliationRepository {
  summaries: AffiliationSummary[] = [];

  findByCode(): Promise<Affiliation | null> {
    return Promise.resolve(null);
  }

  findSummaries(): Promise<AffiliationSummary[]> {
    return Promise.resolve(this.summaries);
  }
}
