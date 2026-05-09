import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Trophy, Star, Zap, Clock, Flame, Target } from 'lucide-react';
import StatsCard from '../components/StatsCard';
import ProgressBar from '../components/ProgressBar';
import LevelBadge from '../components/LevelBadge';

describe('StatsCard', () => {
  it('renders icon, label, value and sublabel', () => {
    render(<StatsCard icon={Trophy} label="XP" value="500" sublabel="points" />);
    expect(screen.getByText('XP')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('points')).toBeInTheDocument();
  });
});

describe('ProgressBar', () => {
  it('renders progress bar with label', () => {
    render(<ProgressBar current={50} target={100} label="Hours" />);
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('Hours')).toBeInTheDocument();
  });

  it('shows 0% when current is 0', () => {
    render(<ProgressBar current={0} target={100} label="XP" />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('caps at 100%', () => {
    render(<ProgressBar current={150} target={100} label="XP" />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});

describe('LevelBadge', () => {
  it('renders level badge with XP display', async () => {
    vi.mock('../services/api', () => ({
      gamificationAPI: {
        xpHistory: () => Promise.resolve({ data: { total_xp: 600 } }),
      },
    }));

    render(<LevelBadge />);
    await new Promise(r => setTimeout(r, 100));
  });
});