import { Component, DestroyRef, effect, inject, signal } from '@angular/core';

const STORAGE_KEY = 'kajakulator-simple-v1';

type BoatTone = 'yellow' | 'blue' | 'red' | 'rescue';

interface BoatTemplate {
  id: string;
  name: string;
  tone: BoatTone;
  accent: string;
  glow: string;
}

interface BoatState extends BoatTemplate {
  paid: number;
  startedAt: number | null;
}

interface PersistedBoat {
  id: string;
  paid?: number;
  startedAt?: number | null;
}

interface PersistedState {
  boats?: PersistedBoat[];
}

const BOATS: BoatTemplate[] = [
  {
    id: 'red',
    name: 'Czerwony',
    tone: 'red',
    accent: '#ff5b6c',
    glow: 'rgba(255, 91, 108, 0.34)',
  },
  {
    id: 'yellow',
    name: 'Żółty',
    tone: 'yellow',
    accent: '#ffd84d',
    glow: 'rgba(255, 216, 77, 0.34)',
  },
  {
    id: 'blue',
    name: 'Niebieski',
    tone: 'blue',
    accent: '#49b9ff',
    glow: 'rgba(73, 185, 255, 0.34)',
  },
  {
    id: 'straz',
    name: 'Strarz',
    tone: 'rescue',
    accent: '#ff3647',
    glow: 'rgba(255, 54, 71, 0.4)',
  },
];

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly destroyRef = inject(DestroyRef);
  private readonly currency = new Intl.NumberFormat('pl-PL', {
    currency: 'PLN',
    maximumFractionDigits: 0,
    style: 'currency',
  });

  protected readonly boats = signal<BoatState[]>(this.loadState());
  protected readonly clearCandidateId = signal<string | null>(null);
  protected readonly now = signal(Date.now());
  protected readonly paymentDrafts = signal<Partial<Record<string, string>>>({});

  constructor() {
    const timerId = window.setInterval(() => this.now.set(Date.now()), 1000);
    this.destroyRef.onDestroy(() => window.clearInterval(timerId));

    effect(() => {
      this.saveState({
        boats: this.boats().map(({ id, paid, startedAt }) => ({ id, paid, startedAt })),
      });
    });
  }

  protected clearCandidateName(): string {
    const id = this.clearCandidateId();
    return this.boats().find((boat) => boat.id === id)?.name ?? '';
  }

  protected clearCandidate(): BoatState | null {
    const id = this.clearCandidateId();
    return this.boats().find((boat) => boat.id === id) ?? null;
  }

  protected confirmClear(): void {
    const id = this.clearCandidateId();

    if (!id) {
      return;
    }

    this.updateBoat(id, (boat) => ({
      ...boat,
      paid: 0,
      startedAt: null,
    }));
    this.clearCandidateId.set(null);
  }

  protected elapsedMs(boat: BoatState): number {
    if (!boat.startedAt) {
      return 0;
    }

    return Math.max(0, this.now() - boat.startedAt);
  }

  protected formatClock(timestamp: number | null): string {
    if (!timestamp) {
      return '--:--';
    }

    return new Intl.DateTimeFormat('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  }

  protected formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(seconds)}`;
  }

  protected formatMoney(value: number): string {
    return this.currency.format(this.roundMoney(value));
  }

  protected isActive(boat: BoatState): boolean {
    return boat.startedAt !== null;
  }

  protected requestClear(id: string): void {
    this.clearCandidateId.set(id);
  }

  protected addPayment(id: string): void {
    const value = Number((this.paymentDrafts()[id] ?? '').replace(',', '.'));

    if (!Number.isFinite(value) || value <= 0) {
      return;
    }

    this.updateBoat(id, (boat) => ({
      ...boat,
      paid: this.roundMoney(boat.paid + value),
    }));

    this.paymentDrafts.update((drafts) => ({ ...drafts, [id]: '' }));
  }

  protected updatePaymentDraft(id: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.paymentDrafts.update((drafts) => ({ ...drafts, [id]: value }));
  }

  protected startBoat(id: string): void {
    this.updateBoat(id, (boat) => {
      if (boat.startedAt) {
        return boat;
      }

      return {
        ...boat,
        startedAt: Date.now(),
      };
    });
  }

  private createBoat(template: BoatTemplate, persisted?: PersistedBoat): BoatState {
    return {
      ...template,
      paid: this.toMoney(persisted?.paid ?? 0),
      startedAt: this.toTimestamp(persisted?.startedAt),
    };
  }

  private loadState(): BoatState[] {
    const fallback = BOATS.map((boat) => this.createBoat(boat));

    if (!this.canUseStorage()) {
      return fallback;
    }

    try {
      const rawState = window.localStorage.getItem(STORAGE_KEY);
      if (!rawState) {
        return fallback;
      }

      const parsed = JSON.parse(rawState) as PersistedState;
      const persistedBoats = parsed.boats ?? [];

      return BOATS.map((boat) =>
        this.createBoat(
          boat,
          persistedBoats.find((persisted) => persisted.id === boat.id),
        ),
      );
    } catch {
      return fallback;
    }
  }

  private pad(value: number): string {
    return value.toString().padStart(2, '0');
  }

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private saveState(state: PersistedState): void {
    if (!this.canUseStorage()) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  private toMoney(value: unknown): number {
    const amount = Number(value);
    return Number.isFinite(amount) && amount >= 0 ? this.roundMoney(amount) : 0;
  }

  private toTimestamp(value: unknown): number | null {
    const timestamp = Number(value);
    return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
  }

  private updateBoat(id: string, updater: (boat: BoatState) => BoatState): void {
    this.boats.update((boats) => boats.map((boat) => (boat.id === id ? updater(boat) : boat)));
  }

  private canUseStorage(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }
}
