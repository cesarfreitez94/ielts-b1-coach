import { describe, it, expect, vi } from 'vitest';
import nock from 'nock';

describe('whisperService', () => {
  const { speechToTextLocal } = await import('../services/whisperService.js');

  it('returns transcription text from whisper server', async () => {
    const scope = nock('http://localhost:8080')
      .post('/inference')
      .reply(200, { text: 'This is the transcribed speech' });

    const result = await speechToTextLocal({
      audioBuffer: Buffer.from('fake-audio-data'),
      mimeType: 'audio/webm',
    });

    expect(result).toBe('This is the transcribed speech');
    scope.done();
  });

  it('throws when whisper server returns error', async () => {
    nock('http://localhost:8080').post('/inference').reply(500, 'Internal Server Error');

    await expect(
      speechToTextLocal({ audioBuffer: Buffer.from('audio'), mimeType: 'audio/webm' })
    ).rejects.toThrow('Whisper error: 500');
  });

  it('sends correct form data with model parameter', async () => {
    let receivedBody;
    const scope = nock('http://localhost:8080')
      .post('/inference', (body) => {
        receivedBody = body;
        return true;
      })
      .reply(200, { text: 'ok' });

    await speechToTextLocal({ audioBuffer: Buffer.from('audio'), mimeType: 'audio/mp4' });

    expect(receivedBody).toBeDefined();
    scope.done();
  });
});