/**
 * Registry of each lab's Método and Usos content. The content lives with the
 * feature it documents (`features/<lab>/guide.ts`).
 */
import { bayesGuide } from '../features/bayes/guide.ts';
import { compoundLossGuide } from '../features/compound-loss/guide.ts';
import { ruinGuide } from '../features/ruin/guide.ts';
import { streaksGuide } from '../features/streaks/guide.ts';
import type { LabGuide, LabId } from './labs.ts';

export const labGuides: Record<LabId, LabGuide> = {
  streaks: streaksGuide,
  bayes: bayesGuide,
  ruin: ruinGuide,
  'compound-loss': compoundLossGuide,
};
