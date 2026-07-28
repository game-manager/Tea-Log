export const SCHOOL_CLASSES = Array.from({ length: 3 }, (_, grade) =>
  Array.from({ length: 10 }, (_, classNumber) => `${grade + 1}年${classNumber + 1}組`),
).flat()
