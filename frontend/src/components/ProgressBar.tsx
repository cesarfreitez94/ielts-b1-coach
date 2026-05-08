import { motion } from 'framer-motion';

interface Props {
  current: number;
  target: number;
  label: string;
}

export default function ProgressBar({ current, target, label }: Props) {
  const percentage = Math.min((current / target) * 100, 100);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex justify-between mb-2">
        <span className="text-gray-700 font-medium">{label}</span>
        <span className="text-indigo-600 font-bold">{percentage.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full"
        />
      </div>
      <p className="text-sm text-gray-500 mt-2">
        {current} / {target} hours completed
      </p>
    </div>
  );
}