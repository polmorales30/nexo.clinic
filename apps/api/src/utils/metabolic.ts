export enum Gender {
    M = 'M',
    F = 'F'
}

export function calculateMifflinStJeor(weightKg: number, heightCm: number, ageYears: number, gender: Gender): number {
    const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
    return gender === 'M' ? base + 5 : base - 161;
}

export function calculateHarrisBenedict(weightKg: number, heightCm: number, ageYears: number, gender: Gender): number {
    if (gender === 'M') {
        return 66.5 + 13.75 * weightKg + 5.003 * heightCm - 6.75 * ageYears;
    }
    return 655.1 + 9.563 * weightKg + 1.850 * heightCm - 4.676 * ageYears;
}

export function calculateTDEE(bmr: number, activityMultiplier: number): number {
    return bmr * activityMultiplier;
}
