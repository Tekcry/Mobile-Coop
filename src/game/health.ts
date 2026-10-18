/** Health, no regeneration (bible 6); wall medkit stations heal (G20). Pure logic (unit-tested). */
export class Health {
  hp: number;

  constructor(public maxHp: number) {
    this.hp = maxHp;
  }

  get alive(): boolean {
    return this.hp > 0;
  }

  get fraction(): number {
    return this.hp / this.maxHp;
  }

  /** Returns the amount actually removed. */
  damage(amount: number): number {
    if (!this.alive || amount <= 0) return 0;
    const toHp = Math.min(this.hp, amount);
    this.hp -= toHp;
    return toHp;
  }

  heal(amount: number): void {
    if (!this.alive) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  reset(): void {
    this.hp = this.maxHp;
  }
}
