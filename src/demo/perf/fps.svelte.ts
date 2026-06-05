/** Rolling FPS meter sampled once per second off requestAnimationFrame. */
export class FpsMeter {
  fps = $state(0);
  private frames = 0;
  private last = 0;
  private rafId = 0;
  private running = false;

  private tick = (now: number): void => {
    if (!this.running) return;
    if (this.last === 0) this.last = now;
    this.frames++;
    const elapsed = now - this.last;
    if (elapsed >= 1000) {
      this.fps = Math.round((this.frames * 1000) / elapsed);
      this.frames = 0;
      this.last = now;
    }
    this.rafId = requestAnimationFrame(this.tick);
  };

  start(): void {
    if (this.running) return;
    this.running = true;
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.last = 0;
    this.frames = 0;
  }
}
