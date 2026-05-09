# vocabulary-spaced-repetition Specification

## Purpose
Manage vocabulary review scheduling using spaced repetition algorithm (SM-2 variant) to optimize retention and learning efficiency.

## Background
Currently vocabulary uses fixed intervals. This spec introduces quality-based interval adjustment to improve long-term retention. The algorithm adapts to user performance - cards answered easily get longer intervals, cards answered with difficulty get shorter intervals.

## Requirements

### Requirement: Calculate next review date based on quality rating
The system SHALL calculate the next review date based on the user's quality rating (0-5).

#### Scenario: Again button (quality 0)
- GIVEN a vocabulary card with current interval of 10 days
- WHEN user rates quality 0 (Again)
- THEN set next review to 1 day
- AND reset interval to 1 day
- AND mark card as "learning" state

#### Scenario: Hard button (quality 1-2)
- GIVEN a vocabulary card with current interval of 10 days
- WHEN user rates quality 1 or 2 (Hard)
- THEN multiply interval by 0.5
- AND set next review to 5 days (minimum 1 day)
- AND award reduced XP

#### Scenario: Good button (quality 3)
- GIVEN a vocabulary card with current interval of 10 days
- WHEN user rates quality 3 (Good)
- THEN multiply interval by 1.5
- AND set next review to 15 days

#### Scenario: Easy button (quality 4-5)
- GIVEN a vocabulary card with current interval of 10 days
- WHEN user rates quality 4 or 5 (Easy)
- THEN multiply interval by 2.5
- AND set next review to 25 days
- AND award bonus XP

### Requirement: New cards start with 1-day interval
The system SHALL set new vocabulary cards to a 1-day initial interval.

#### Scenario: New card first review
- GIVEN a newly added vocabulary card with no review history
- WHEN card is presented for the first time
- THEN set initial interval to 1 day
- AND set state to "learning"

### Requirement: Track card state transitions
The system SHALL track vocabulary cards through states: learning → review → relearning.

#### Scenario: Card graduates to review
- GIVEN a vocabulary card in "learning" state
- WHEN user rates quality 3+ (Good or Easy)
- AND card has been reviewed 3+ times
- THEN transition card to "review" state
- AND use calculated interval

#### Scenario: Card enters relearning
- GIVEN a vocabulary card in "review" state
- WHEN user rates quality 0 (Again)
- THEN transition card to "relearning" state
- AND reset interval to 1 day

### Requirement: Calculate XP rewards
The system SHALL award XP based on quality rating and card state.

#### Scenario: Easy answer awards bonus XP
- GIVEN a vocabulary card in "review" state
- WHEN user rates quality 5 (Easy)
- THEN award base XP (e.g., 10)
- AND award bonus XP (e.g., 5 extra)

#### Scenario: Again answer awards minimal XP
- GIVEN a vocabulary card in "review" state
- WHEN user rates quality 0 (Again)
- THEN award minimal XP (e.g., 2)
- AND reset streak counter

## Technical Notes
- Service: `srsService.calculateNextReview(quality, currentInterval, cardState)`
- Service: `srsService.calculateXP(quality, cardState)`
- Service: `srsService.getNextState(quality, reviewCount, currentState)`
- All functions are pure - no side effects
- Interval stored in days, calculated at answer time

## Out of Scope
- Cloud sync of review state
- Batch import of vocabulary
- Custom SRS parameters per card
- Analytics dashboard (future work)