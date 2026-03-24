export type FoodItem = {
    name: string;
    p: number; // protein per 100g
    c: number; // carbs per 100g
    f: number; // fat per 100g
    kcal: number; // kcal per 100g
};

export type MacroType = 'p' | 'c' | 'f' | 'kcal';

/**
 * Calculates the amount of the target food needed to match a specific macronutrient 
 * amount from the original food.
 */
export function calculateSwapQuantity(
    originalFood: FoodItem,
    originalGrams: number,
    targetFood: FoodItem,
    matchMacro: MacroType = 'p'
): number {
    // 1. Calculate how much of the target macro we had in the original food
    const ratio = originalGrams / 100;
    const targetAmount = originalFood[matchMacro] * ratio;

    // 2. If target food has 0 of this macro, we can't match it. Fallback to matching Kcal.
    if (targetFood[matchMacro] <= 0) {
        if (targetFood.kcal <= 0) return originalGrams; // Safety fallback
        const originalKcal = originalFood.kcal * ratio;
        return (originalKcal / targetFood.kcal) * 100;
    }

    // 3. Calculate how many grams of the target food gives us the target amount
    const newGrams = (targetAmount / targetFood[matchMacro]) * 100;

    return Math.round(newGrams);
}

/**
 * Auto-detects the primary macronutrient of a food to determine what we should match.
 * E.g., Chicken -> 'p', Rice -> 'c', Olive Oil -> 'f'
 */
export function detectPrimaryMacro(food: FoodItem): MacroType {
    const pYield = food.p * 4; // Kcal from protein
    const cYield = food.c * 4; // Kcal from carbs
    const fYield = food.f * 9; // Kcal from fat

    if (pYield > cYield && pYield > fYield) return 'p';
    if (cYield > pYield && cYield > fYield) return 'c';
    if (fYield > pYield && fYield > cYield) return 'f';

    return 'kcal'; // If balanced, just match calories
}
