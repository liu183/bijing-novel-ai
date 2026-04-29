export async function fireConfetti() {
  const confetti = (await import('canvas-confetti')).default;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999, colors: ['#f59e0b', '#f97316', '#ef4444', '#10b981', '#8b5cf6'] };
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      confetti({ ...defaults, particleCount: 50, origin: { x: 0.2 + Math.random() * 0.6, y: 0.5 + Math.random() * 0.3 } });
    }, i * 100);
  }
}

export async function fireMiniConfetti() {
  const confetti = (await import('canvas-confetti')).default;
  confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 }, colors: ['#f59e0b', '#f97316'], zIndex: 9999 });
}
