export const TEST_FRAMEWORK_IDS = ['jest', 'pytest', 'junit5'] as const;

export type TestFrameworkId = (typeof TEST_FRAMEWORK_IDS)[number];
