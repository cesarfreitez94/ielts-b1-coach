import { beforeEach, afterEach } from 'vitest';
import nock from 'nock';

beforeEach(() => nock.cleanAll());
afterEach(() => {
  nock.cleanAll();
});