import { describe, it, expect } from 'vitest';
import { calculateNextReview, calculateXP, getNextState } from './srsService.js';

describe('srsService', () => {

  describe('calculateNextReview', () => {

    it('quality 0 (Again) → resets to 1 day', () => {
      const result = calculateNextReview(0, 10);
      expect(result.intervalDays).toBe(1);
    });

    it('quality 0 → state is relearning', () => {
      const result = calculateNextReview(0, 10);
      expect(result.state).toBe('relearning');
    });

    it('quality 1 (Hard) → interval * 0.5', () => {
      const result = calculateNextReview(1, 10);
      expect(result.intervalDays).toBe(5);
    });

    it('quality 2 (Hard) → interval * 0.5', () => {
      const result = calculateNextReview(2, 10);
      expect(result.intervalDays).toBe(5);
    });

    it('quality 1-2 → minimum 1 day', () => {
      const result = calculateNextReview(1, 1);
      expect(result.intervalDays).toBe(1);
    });

    it('quality 3 (Good) → interval * 1.5', () => {
      const result = calculateNextReview(3, 10);
      expect(result.intervalDays).toBe(15);
    });

    it('quality 4 (Easy) → interval * 2.5', () => {
      const result = calculateNextReview(4, 10);
      expect(result.intervalDays).toBe(25);
    });

    it('quality 5 (Easy) → interval * 2.5', () => {
      const result = calculateNextReview(5, 10);
      expect(result.intervalDays).toBe(25);
    });

    it('new card (no history) → 1 day interval', () => {
      const result = calculateNextReview(3, 0);
      expect(result.intervalDays).toBe(1);
    });

  });

  describe('calculateXP', () => {

    it('quality 0 (Again) → minimal XP', () => {
      const result = calculateXP(0, 'review');
      expect(result.xp).toBe(2);
    });

    it('quality 3 (Good) → base XP', () => {
      const result = calculateXP(3, 'review');
      expect(result.xp).toBe(10);
    });

    it('quality 5 (Easy) → base + bonus XP', () => {
      const result = calculateXP(5, 'review');
      expect(result.xp).toBe(20);
    });

    it('quality 5 (Easy) in learning → base + learning bonus XP', () => {
      const result = calculateXP(5, 'learning');
      expect(result.xp).toBe(22);
    });

    it('resets streak on Again', () => {
      const result = calculateXP(0, 'review');
      expect(result.streakReset).toBe(true);
    });

    it('maintains streak on Good/Easy', () => {
      const goodResult = calculateXP(3, 'review');
      expect(goodResult.streakReset).toBe(false);
      const easyResult = calculateXP(5, 'review');
      expect(easyResult.streakReset).toBe(false);
    });

  });

  describe('getNextState', () => {

    it('learning + quality 3+ + 3+ reviews → review state', () => {
      const result = getNextState('learning', 4, 3);
      expect(result).toBe('review');
    });

    it('learning + quality < 3 → stays learning', () => {
      const result = getNextState('learning', 2, 2);
      expect(result).toBe('learning');
    });

    it('learning + < 3 reviews + quality 3+ → stays learning', () => {
      const result = getNextState('learning', 2, 4);
      expect(result).toBe('learning');
    });

    it('review + quality 0 → relearning', () => {
      const result = getNextState('review', 10, 0);
      expect(result).toBe('relearning');
    });

    it('review + quality 3+ → stays review', () => {
      const result = getNextState('review', 10, 4);
      expect(result).toBe('review');
    });

    it('relearning + quality 3+ → back to review', () => {
      const result = getNextState('relearning', 5, 3);
      expect(result).toBe('review');
    });

  });

});