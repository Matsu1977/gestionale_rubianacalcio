// Stagione sportiva: 1 ottobre -> 30 giugno
// Sospensione: 1 luglio -> 30 settembre (mesi 7, 8, 9)

export function isStagioneAttiva(date: Date = new Date()): boolean {
  const month = date.getMonth() + 1; // 1-12
  // Attiva da ottobre (10) fino a giugno (6) compreso
  return month >= 10 || month <= 6;
}

export function stagioneCorrenteLabel(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  // Stagione "2025/2026" parte a ottobre 2025
  if (m >= 10) return `${y}/${y + 1}`;
  return `${y - 1}/${y}`;
}

export function stagioneStatoMessage(date: Date = new Date()): string {
  if (isStagioneAttiva(date)) return "Stagione sportiva attiva";
  return "Stagione sospesa (luglio – settembre)";
}
