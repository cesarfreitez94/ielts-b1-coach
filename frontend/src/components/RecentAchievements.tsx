import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon?: string;
  unlocked_at?: string;
}

interface Props {
  achievements: Achievement[];
}

export default function RecentAchievements({ achievements }: Props) {
  const recent = achievements.slice(0, 3);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Trophy className="w-5 h-5 text-yellow-500" />
        <h3 className="font-semibold text-gray-900">Recent Achievements</h3>
      </div>
      {recent.length === 0 ? (
        <p className="text-gray-400 text-sm">No achievements yet. Keep practicing!</p>
      ) : (
        <div className="space-y-3">
          {recent.map((ach, idx) => (
            <motion.div
              key={ach.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
            >
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-sm">🏆</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{ach.name}</p>
                <p className="text-xs text-gray-500">{ach.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}