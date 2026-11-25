import type { AssessmentRecommendation } from '../types/support';
import { TECHNICIAN_ASSESSMENT_QUESTIONS } from '../utils/techEvaluation';

export const TECH_ASSESSMENT_ANSWER_KEY: Record<string, string> = {
  'tech-1': 'b',
  'tech-2': 'c',
  'tech-3': 'a',
  'tech-4': 'b',
  'tech-5': 'c',
  'att-1': 'b',
  'att-2': 'c',
  'att-3': 'b',
  'att-4': 'c',
  'att-5': 'b',
};

export interface TechnicianAssessmentEvaluation {
  technicalCorrect: number;
  technicalTotal: number;
  attitudeCorrect: number;
  attitudeTotal: number;
  technicalScore: number;
  attitudeScore: number;
  totalScore: number;
  unansweredCount: number;
  recommendation: AssessmentRecommendation;
}

export function evaluateTechnicianAssessment(
  answers: Record<string, string>
): TechnicianAssessmentEvaluation {
  const technicalQuestions = TECHNICIAN_ASSESSMENT_QUESTIONS.filter(
    (q) => q.dimension === 'technical'
  );
  const attitudeQuestions = TECHNICIAN_ASSESSMENT_QUESTIONS.filter(
    (q) => q.dimension === 'attitude'
  );

  let technicalCorrect = 0;
  let attitudeCorrect = 0;
  let unansweredCount = 0;

  for (const question of technicalQuestions) {
    const selected = answers[question.id];
    if (!selected) unansweredCount += 1;
    if (selected === TECH_ASSESSMENT_ANSWER_KEY[question.id]) {
      technicalCorrect += 1;
    }
  }

  for (const question of attitudeQuestions) {
    const selected = answers[question.id];
    if (!selected) unansweredCount += 1;
    if (selected === TECH_ASSESSMENT_ANSWER_KEY[question.id]) {
      attitudeCorrect += 1;
    }
  }

  const technicalScore = Math.round(
    (technicalCorrect / technicalQuestions.length) * 100
  );
  const attitudeScore = Math.round(
    (attitudeCorrect / attitudeQuestions.length) * 100
  );
  const totalScore = Math.round(
    ((technicalCorrect + attitudeCorrect) /
      TECHNICIAN_ASSESSMENT_QUESTIONS.length) *
      100
  );

  let recommendation: AssessmentRecommendation = 'recommended_reject';
  if (totalScore >= 75 && attitudeScore >= 80) {
    recommendation = 'recommended_approve';
  } else if (totalScore >= 60) {
    recommendation = 'manual_review';
  }

  return {
    technicalCorrect,
    technicalTotal: technicalQuestions.length,
    attitudeCorrect,
    attitudeTotal: attitudeQuestions.length,
    technicalScore,
    attitudeScore,
    totalScore,
    unansweredCount,
    recommendation,
  };
}
