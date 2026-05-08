import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BookOpen, Mic, PenTool, MessageSquare, Trophy, Clock, Target, Flame } from 'lucide-react';
import { progressAPI, gamificationAPI } from '../services/api';
import ProgressBar from '../components/ProgressBar';
import StatsCard from '../components/StatsCard';
import RecentAchievements from '../components/RecentAchievements';

const practiceAreas = [
  { path: '/vocabulary', label: 'Vocabulary', icon: BookOpen, color: 'bg-blue-500' },
  { path: '/speaking', label: 'Speaking', icon: Mic, color: 'bg-purple-500' },
  { path: '/writing', label: 'Writing', icon: PenTool, color: 'bg-green-500' },
  { path: '/tutor', label: 'AI Tutor', icon: MessageSquare, color: 'bg-orange-500' },
];

export default function Dashboard() {
  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => progressAPI.dashboard(),
  });

  const { data: achievements } = useQuery({
    queryKey: ['achievements'],
    queryFn: () => gamificationAPI.achievements(),
  });

  const stats = dashboard?.data || {};
  const totalHours = stats.total_hours || 0;
  const targetHours = 500;
  const streak = stats.streak || 0;
  const weeklyHours = stats.weekly_hours || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Your Progress</h1>
        <p className="text-gray-500 mt-1">Track your journey to IELTS success</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          icon={Clock}
          label="Total Hours"
          value={`${totalHours}h`}
          sublabel={`of ${targetHours}h goal`}
        />
        <StatsCard
          icon={Flame}
          label="Day Streak"
          value={streak}
          sublabel="consecutive days"
        />
        <StatsCard
          icon={Target}
          label="This Week"
          value={`${weeklyHours}h`}
          sublabel="hours practiced"
        />
      </div>

      <ProgressBar current={totalHours} target={targetHours} label="Hours toward 500h goal" />

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Practice Areas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {practiceAreas.map((area, idx) => (
            <motion.a
              key={area.path}
              href={area.path}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.05 }}
              className="flex flex-col items-center p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all"
            >
              <div className={`w-12 h-12 ${area.color} rounded-full flex items-center justify-center mb-3`}>
                <area.icon className="w-6 h-6 text-white" />
              </div>
              <span className="font-medium text-gray-700">{area.label}</span>
            </motion.a>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RecentAchievements achievements={achievements?.data || []} />
      </div>
    </div>
  );
}