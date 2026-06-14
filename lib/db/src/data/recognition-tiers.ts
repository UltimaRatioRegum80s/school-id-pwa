export type SeedRecognitionTier = {
  name: string;
  thresholdPoints: number;
  description: string;
  sortOrder: number;
};

export const SEED_RECOGNITION_TIERS: SeedRecognitionTier[] = [
  { name: "Letter to Parents", thresholdPoints: 10, description: "Send a letter home recognising the student's merits", sortOrder: 1 },
  { name: "Newsletter Mention", thresholdPoints: 20, description: "Feature the student in the school newsletter", sortOrder: 2 },
  { name: "Award Ceremony Certificate", thresholdPoints: 35, description: "Award a certificate at the next ceremony", sortOrder: 3 },
  { name: "SRC Nomination", thresholdPoints: 50, description: "Nominate the student for the Student Representative Council", sortOrder: 4 },
  { name: "Director's Trophy Nomination", thresholdPoints: 75, description: "Nominate the student for the Director's Trophy", sortOrder: 5 },
];
