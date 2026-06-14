export type SeedBehaviorCategory = {
  name: string;
  type: "merit" | "demerit";
  points: number;
  description: string;
};

export const MERIT_CATEGORIES: SeedBehaviorCategory[] = [
  { name: "Academic Excellence", type: "merit", points: 5, description: "Outstanding academic performance" },
  { name: "Good Citizenship", type: "merit", points: 3, description: "Helping others and community" },
  { name: "Punctuality", type: "merit", points: 2, description: "Always on time" },
  { name: "Exceptional Effort", type: "merit", points: 4, description: "Diligence and effort beyond expectations" },
  { name: "Leadership", type: "merit", points: 4, description: "Demonstrating leadership and initiative" },
  { name: "Reliability & Responsibility", type: "merit", points: 3, description: "Dependable and accountable in duties" },
  { name: "Problem Solving", type: "merit", points: 3, description: "Working out difficult problems independently" },
  { name: "Class Participation", type: "merit", points: 2, description: "Active and constructive participation in class" },
  { name: "Helpfulness & Kindness", type: "merit", points: 3, description: "Supporting peers and showing kindness" },
  { name: "Teamwork & Collaboration", type: "merit", points: 3, description: "Working effectively with others" },
  { name: "Respect & Good Manners", type: "merit", points: 2, description: "Courteous and respectful conduct" },
  { name: "Most Improved", type: "merit", points: 3, description: "Significant improvement in work or conduct" },
  { name: "Perseverance & Resilience", type: "merit", points: 3, description: "Overcoming challenges with determination" },
  { name: "Creativity & Innovation", type: "merit", points: 4, description: "Original thinking and creative work" },
  { name: "Sportsmanship", type: "merit", points: 3, description: "Fair play and positive attitude in sport" },
  { name: "Community Service", type: "merit", points: 4, description: "Contributing to the school or wider community" },
  { name: "Honesty & Integrity", type: "merit", points: 4, description: "Acting truthfully and doing the right thing" },
];

export const PSS_DEMERIT_CATEGORIES: SeedBehaviorCategory[] = [
  { name: "S1 Late for school / Not punctual", type: "demerit", points: 1, description: "Disciplinary — S1" },
  { name: "S1 Absent without permission", type: "demerit", points: 1, description: "Disciplinary — S1" },
  { name: "S1 Disruptive / Disrespectful / Unacceptable behaviour", type: "demerit", points: 1, description: "Disciplinary — S1" },
  { name: "S2 Disruptive / Disrespectful / Unacceptable behaviour", type: "demerit", points: 2, description: "Disciplinary — S2" },
  { name: "S1 Swearing / Foul language / Lying / Disobedient", type: "demerit", points: 1, description: "Disciplinary — S1" },
  { name: "S1 Uncooperative during teaching period", type: "demerit", points: 1, description: "Disciplinary — S1" },
  { name: "S1 Unauthorised electronic device (immediate confiscation)", type: "demerit", points: 1, description: "Disciplinary — S1" },
  { name: "S2 Bullying / Mobbing", type: "demerit", points: 2, description: "Disciplinary — S2" },
  { name: "S2 Vandalism / Stealing", type: "demerit", points: 2, description: "Disciplinary — S2" },
  { name: "S2 Copying work / signature", type: "demerit", points: 2, description: "Disciplinary — S2" },
  { name: "S2 Possession of tobacco / smoking", type: "demerit", points: 2, description: "Disciplinary — S2" },
  { name: "S3 Vandalism / Stealing", type: "demerit", points: 3, description: "Disciplinary — S3" },
  { name: "S1 Late for class", type: "demerit", points: 1, description: "Disciplinary — S1" },
  { name: "S2 Homework Not Done", type: "demerit", points: 2, description: "Disciplinary — S2" },
  { name: "S3 Cheating", type: "demerit", points: 3, description: "Disciplinary — S3" },
  { name: "S1 Eating in Computer Class", type: "demerit", points: 1, description: "Disciplinary — S1" },
  { name: "Homework not done", type: "demerit", points: 1, description: "Academic" },
  { name: "Homework not finished", type: "demerit", points: 1, description: "Academic" },
  { name: "Books left at home", type: "demerit", points: 1, description: "Academic" },
  { name: "Alternative activities during teaching time", type: "demerit", points: 1, description: "Academic" },
  { name: "Stay away from sport activity - no or late excuse", type: "demerit", points: 1, description: "Academic" },
  { name: "Not attending class", type: "demerit", points: 1, description: "Academic" },
  { name: "Cheating during a test", type: "demerit", points: 1, description: "Academic" },
  { name: "Phone in class", type: "demerit", points: 1, description: "Academic" },
];

export const SEED_BEHAVIOR_CATEGORIES: SeedBehaviorCategory[] = [
  ...MERIT_CATEGORIES,
  ...PSS_DEMERIT_CATEGORIES,
];

export const PLACEHOLDER_DEMERIT_NAMES: string[] = [
  "Late Arrival",
  "Uniform Violation",
  "Disruptive Behavior",
];
