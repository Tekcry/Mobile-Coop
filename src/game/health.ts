/** Health + regenerating shield. Pure logic (unit-tested). */
export class Health {
  hp: number;
  shield: number;
  private sinceHit = 999;

  constructor(
    public maxHp: number,
    public maxShield = 0,
    public regenDelay = 4,
    public regenRate = 25,
  ) {
    this.hp = maxHp;
    this.shield = maxShield;
  }

  get alive(): boolean {
    return this.hp > 0;
  }

  get fraction(): number {
    return this.hp / this.maxHp;
  }

  /** Shield absorbs first. Returns the total amount actually removed. */
  damage(amount: number): number {
    if (!this.alive || amount <= 0) return 0;
    this.sinceHit = 0;
    const toShield = Math.min(this.shield, amount);
    this.shield -= toShield;
    const toHp = Math.min(this.hp, amount - toShield);
    this.hp -= toHp;
    return toShield + toHp;
  }

  heal(amount: number): void {
    if (!this.alive) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  update(dt: number): void {
    if (!this.alive) return;
    this.sinceHit += dt;
    if (this.sinceHit >= this.regenDelay && this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + this.regenRate * dt);
    }
  }

  reset(): void {
    this.hp = this.maxHp;
    this.shield = this.maxShield;
    this.sinceHit = 999;
  }
}
