// XP → level. Classic curve: xp to go from level L to L+1 is 5*L^2 + 50*L + 100 (mee6-style).
// levelFromXp walks the cumulative total. Cheap; the numbers stay small.
export function xpForNext(level) {
  return 5 * level * level + 50 * level + 100;
}
export function levelFromXp(xp) {
  let level = 0;
  let need = 0;
  const total = Math.max(0, Number(xp) || 0);
  while (need + xpForNext(level) <= total) {
    need += xpForNext(level);
    level++;
    if (level > 1000) break; // safety
  }
  return level;
}
