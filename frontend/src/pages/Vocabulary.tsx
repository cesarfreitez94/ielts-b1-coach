import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { vocabAPI } from '../services/api';
import { BookOpen, Check, X } from 'lucide-react';

const qualityLabels = ['Again', 'Hard', 'Good', 'Easy'];
const qualityColors = ['bg-red-500', 'bg-orange-500', 'bg-green-500', 'bg-blue-500'];

export default function Vocabulary() {
  const [currentCard, setCurrentCard] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['vocabulary-due'],
    queryFn: () => vocabAPI.getDue(),
    onSuccess: (data) => {
      if (data.data?.length > 0) setCurrentCard(data.data[0]);
    },
  });

  const answerMutation = useMutation({
    mutationFn: ({ vocab_id, quality }: { vocab_id: string; quality: number }) =>
      vocabAPI.answer(vocab_id, quality),
    onSuccess: (response) => {
      const remaining = response.data?.remaining || 0;
      if (remaining > 0) {
        const nextCard = data?.data?.find((c: any) => c.id !== currentCard?.id);
        setCurrentCard(nextCard);
        toast.success('Answer recorded!');
      } else {
        setCurrentCard(null);
        toast.success('Session complete! No more cards due.');
      }
      queryClient.invalidateQueries({ queryKey: ['vocabulary-due'] });
    },
    onError: () => toast.error('Failed to record answer'),
  });

  const cards = data?.data || [];

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vocabulary Practice</h1>
          <p className="text-gray-500">{cards.length} cards due for review</p>
        </div>
      </div>

      {currentCard ? (
        <motion.div
          key={currentCard.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-lg p-8 max-w-2xl mx-auto"
        >
          <div className="flex justify-between items-start mb-6">
            <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${currentCard.level === 'B1' ? 'bg-purple-500' : 'bg-blue-500'}`}>
              {currentCard.level || 'B1'}
            </span>
            <BookOpen className="w-5 h-5 text-gray-400" />
          </div>

          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">{currentCard.word}</h2>
            <p className="text-xl text-indigo-600 mb-2">{currentCard.phonetic}</p>
            <p className="text-gray-600">{currentCard.definition}</p>
            {currentCard.example && (
              <p className="text-gray-500 italic mt-4">"{currentCard.example}"</p>
            )}
          </div>

          <div className="grid grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((q) => (
              <button
                key={q}
                onClick={() => answerMutation.mutate({ vocab_id: currentCard.id, quality: q + 1 })}
                className={`${qualityColors[q]} text-white py-3 rounded-lg font-medium hover:opacity-90 transition-opacity`}
              >
                {qualityLabels[q]}
              </button>
            ))}
          </div>
        </motion.div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700">All caught up!</h3>
          <p className="text-gray-500 mt-2">No vocabulary cards due for review.</p>
        </div>
      )}
    </div>
  );
}