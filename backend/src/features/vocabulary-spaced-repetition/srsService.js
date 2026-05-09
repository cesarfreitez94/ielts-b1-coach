const QUALITY_MULTIPLIERS = {
  0: 0,
  1: 0.5,
  2: 0.5,
  3: 1.5,
  4: 2.5,
  5: 2.5,
};

const BASE_XP = { 0: 2, 1: 5, 2: 5, 3: 10, 4: 12, 5: 15 };
const BONUS_XP = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 5, 5: 5 };
const LEARNING_BONUS = 2;

export function calculateNextReview(quality, currentInterval = 0, currentState = 'learning') {
  let nextInterval;
  if (currentInterval === 0) {
    nextInterval = 1;
  } else {
    const multiplier = QUALITY_MULTIPLIERS[quality] ?? 1;
    nextInterval = Math.ceil(currentInterval * multiplier);
  }

  let state = currentState;
  if (quality === 0) {
    state = 'relearning';
  }

  return {
    intervalDays: Math.max(1, nextInterval),
    state,
    nextReviewDate: new Date(Date.now() + Math.max(1, nextInterval) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  };
}

export function calculateXP(quality, cardState = 'review') {
  const base = BASE_XP[quality] ?? 10;
  const bonus = quality >= 4 ? BONUS_XP[quality] ?? 5 : 0;
  const learningExtra = cardState === 'learning' ? LEARNING_BONUS : 0;

  return {
    xp: base + bonus + learningExtra,
    streakReset: quality === 0,
  };
}

export function getNextState(currentState, reviewCount, quality) {
  if (currentState === 'learning') {
    if (quality >= 3 && reviewCount >= 3) {
      return 'review';
    }
    return 'learning';
  }

  if (currentState === 'review') {
    if (quality === 0) {
      return 'relearning';
    }
    return 'review';
  }

  if (currentState === 'relearning') {
    if (quality >= 3) {
      return 'review';
    }
    return 'relearning';
  }

  return currentState;
}