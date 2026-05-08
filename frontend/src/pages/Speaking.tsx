import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { speakingAPI } from '../services/api';
import { Mic, MicOff, Volume2 } from 'lucide-react';

export default function Speaking() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [evaluation, setEvaluation] = useState<any>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const transcribeMutation = useMutation({
    mutationFn: (audioBlob: Blob) => speakingAPI.transcribe(audioBlob),
    onSuccess: (response) => {
      setTranscript(response.data?.text || 'No transcript available');
      toast.success('Transcribed!');
    },
    onError: () => toast.error('Transcription failed'),
  });

  const evaluateMutation = useMutation({
    mutationFn: (data: any) => speakingAPI.evaluate(data),
    onSuccess: (response) => {
      setEvaluation(response.data);
      toast.success('Evaluated!');
    },
    onError: () => toast.error('Evaluation failed'),
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        transcribeMutation.mutate(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleEvaluate = () => {
    if (transcript) {
      evaluateMutation.mutate({ transcript, task: 'general' });
    }
  };

  const playTTS = async (text: string) => {
    const url = speakingAPI.getTTSUrl(text);
    const audio = new Audio(url);
    audio.play();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Speaking Practice</h1>
        <p className="text-gray-500">Record your voice and get AI feedback</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl">
        <div className="flex flex-col items-center">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
              isRecording ? 'bg-red-500 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isRecording ? <MicOff className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white" />}
          </button>
          <p className="mt-4 text-gray-600">{isRecording ? 'Recording... Click to stop' : 'Click to start recording'}</p>
        </div>
      </div>

      {transcript && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-semibold text-gray-900">Your Transcript</h3>
            <button onClick={() => playTTS(transcript)} className="text-indigo-600 hover:text-indigo-700">
              <Volume2 className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-700">{transcript}</p>
          <button
            onClick={handleEvaluate}
            disabled={evaluateMutation.isPending}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {evaluateMutation.isPending ? 'Evaluating...' : 'Get AI Feedback'}
          </button>
        </div>
      )}

      {evaluation && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">AI Feedback</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Pronunciation</span>
              <span className="font-medium text-indigo-600">{evaluation.pronunciation || 'N/A'}/10</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Fluency</span>
              <span className="font-medium text-indigo-600">{evaluation.fluency || 'N/A'}/10</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Grammar</span>
              <span className="font-medium text-indigo-600">{evaluation.grammar || 'N/A'}/10</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Vocabulary</span>
              <span className="font-medium text-indigo-600">{evaluation.vocabulary || 'N/A'}/10</span>
            </div>
            {evaluation.feedback && (
              <div className="pt-3 border-t">
                <p className="text-gray-700 text-sm">{evaluation.feedback}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}