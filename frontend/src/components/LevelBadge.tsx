import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { gamificationAPI } from '../services/api';

export default function LevelBadge() {
  const { data } = useQuery({
    queryKey: ['xp'],
    queryFn: () => gamificationAPI.xpHistory(),
    staleTime: 5 * 60 * 1000,
  });

  const xp = data?.data?.total_xp || 0;
  const level = xp < 500 ? 'A1' : xp < 1500 ? 'A2' : xp < 3500 ? 'B1' : xp < 7000 ? 'B2' : 'C1';

  return (
    <motion.div
      initial={{ scale: 0.8 }}
      animate={{ scale: 1 }}
      className="flex items-center space-x-2 px-3 py-1 bg-indigo-100 rounded-full"
    >
      <span className="text-xs font-bold text-indigo-600 uppercase">{level}</span>
      <span className="text-xs text-indigo-500">{xp} XP</span>
    </motion.div>
  );
}