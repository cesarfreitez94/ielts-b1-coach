import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Trophy, Star, Zap } from 'lucide-react';
import { gamificationAPI } from '../services/api';

export default function Achievements() {
  const { data: achievements, isLoading } = useQuery({
    queryKey: ['achievements'],
    queryFn: () => gamificationAPI.achievements(),
  });

  const { data: xpData } = useQuery({
    queryKey: ['xp-history'],
    queryFn: () => gamificationAPI.xpHistory(),
  });

  const achievementList = achievements?.data || [];
  const xpHistory = xpData?.data || [];
  const totalXp = xpHistory.total_xp || 0;

  const level = totalXp < 500 ? 'A1' : totalXp < 1500 ? 'A2' : totalXp < 3500 ? 'B1' : totalXp < 7000 ? 'B2' : 'C1';
  const nextLevelXp = level === 'A1' ? 500 : level === 'A2' ? 1500 : level === 'B1' ? 3500 : level === 'B2' ? 7000 : 10000;
  const currentLevelXp = level === 'A1' ? 0 : level === 'A2' ? 500 : level === 'B1' ? 1500 : level === 'B2' ? 3500 : 7000;
  const xpProgress = ((totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Achievements & Progress</h1>
        <p className="text-gray-500">Track your learning journey</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center space-x-6">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
            <span className="text-3xl font-bold text-white">{level}</span>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">Level {level}</h2>
            <p className="text-gray-500">{totalXp} XP total</p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">{Math.round(xpProgress)}% to next level</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 flex items-center space-x-4">
          <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
            <Trophy className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{achievementList.length}</p>
            <p className="text-sm text-gray-500">Achievements</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 flex items-center space-x-4">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
            <Zap className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalXp}</p>
            <p className="text-sm text-gray-500">Total XP</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 flex items-center space-x-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <Star className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{achievementList.filter((a: any) => a.unlocked_at).length}</p>
            <p className="text-sm text-gray-500">Unlocked</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">All Achievements</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievementList.map((ach: any, idx: number) => (
            <motion.div
              key={ach.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className={`p-4 rounded-xl border-2 ${ach.unlocked_at ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200 opacity-60'}`}
            >
              <div className="flex items-start space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${ach.unlocked_at ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                  <span className="text-lg">{ach.unlocked_at ? '🏆' : '🔒'}</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{ach.name}</h4>
                  <p className="text-sm text-gray-500">{ach.description}</p>
                  {ach.unlocked_at && (
                    <p className="text-xs text-indigo-600 mt-1">Unlocked</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}