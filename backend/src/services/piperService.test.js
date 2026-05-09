import { describe, it, expect, vi } from 'vitest';
import nock from 'nock';

describe('piperService', () => {
  const { textToSpeechLocal } = await import('../services/piperService.js');

  it('returns audio buffer from piper server', async () => {
    const audioData = Buffer.from('fake-mp3-audio');
    const scope = nock('http://localhost:5000')
      .post('/tts', { text: 'Hello world' })
      .reply(200, audioData);

    const result = await textToSpeechLocal({ text: 'Hello world' });

    expect(Buffer.isBuffer(result)).toBe(true);
    scope.done();
  });

  it('throws when piper server returns error', async () => {
    nock('http://localhost:5000').post('/tts').reply(503, 'Service Unavailable');

    await expect(textToSpeechLocal({ text: 'Hello' })).rejects.toThrow('Piper error: 503');
  });

  it('sends JSON body with text field', async () => {
    let requestBody;
    const scope = nock('http://localhost:5000')
      .post('/tts', (body) => {
        requestBody = body;
        return true;
      })
      .reply(200, Buffer.from('audio'));

    await textToSpeechLocal({ text: 'Test text' });
    expect(requestBody.text).toBe('Test text');
    scope.done();
  });
});