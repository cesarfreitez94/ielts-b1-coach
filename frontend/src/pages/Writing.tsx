import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { writingAPI } from '../services/api';
import { PenTool } from 'lucide-react';

const samplePrompts = [
  'Describe a place you would like to visit and explain why.',
  'Some people believe that technology has made our lives easier. To what extent do you agree or disagree?',
  'Write about a time when you helped someone.',
];

export default function Writing() {
  const [prompt, setPrompt] = useState(samplePrompts[0]);
  const [userText, setUserText] = useState('');
  const [evaluation, setEvaluation] = useState<any>(null);

  const evaluateMutation = useMutation<any, Error, void>({
    mutationFn: () => writingAPI.evaluate(userText, prompt),
    onSuccess: (response: any) => {
      setEvaluation(response.data);
      toast.success('Writing evaluated!');
    },
    onError: () => toast.error('Evaluation failed'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Writing Practice</h1>
        <p className="text-gray-500">Get AI feedback on your writing</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Prompt</label>
        <select
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg mb-4"
        >
          {samplePrompts.map((p, idx) => (
            <option key={idx} value={p}>{p}</option>
          ))}
        </select>

        <textarea
          value={userText}
          onChange={(e) => setUserText(e.target.value)}
          placeholder="Write your response here (aim for 150-200 words)..."
          rows={12}
          className="w-full px-4 py-3 border rounded-lg resize-none focus:ring-2 focus:ring-indigo-500"
        />

        <button
          onClick={() => evaluateMutation.mutate()}
          disabled={!userText || evaluateMutation.isPending}
          className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {evaluateMutation.isPending ? 'Evaluating...' : 'Get Feedback'}
        </button>
      </div>

      {evaluation && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center space-x-2 mb-4">
            <PenTool className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-900">AI Feedback</h3>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">Overall Score</p>
              <p className="text-2xl font-bold text-indigo-600">{evaluation.score || 'N/A'}/9</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">Band Estimate</p>
              <p className="text-2xl font-bold text-indigo-600">{evaluation.band || 'N/A'}</p>
            </div>
          </div>

          {evaluation.breakdown && (
            <div className="space-y-3 mb-4">
              {Object.entries(evaluation.breakdown).map(([key, value]: [string, any]) => (
                <div key={key} className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600 capitalize">{key}</span>
                  <span className="font-medium text-gray-900">{value}/9</span>
                </div>
              ))}
            </div>
          )}

          {evaluation.feedback && (
            <div className="bg-indigo-50 p-4 rounded-lg">
              <p className="text-indigo-900 whitespace-pre-wrap">{evaluation.feedback}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}