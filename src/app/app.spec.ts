import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render simple boat controls', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelectorAll('.boat-card').length).toBe(4);
    expect(compiled.querySelectorAll('.primary-action').length).toBe(4);
    expect(compiled.querySelectorAll('.arrive-action').length).toBe(4);
  });

  it('should render all four pedal boats', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelectorAll('.boat-card').length).toBe(4);
    expect(compiled.textContent).toContain('Żółty');
    expect(compiled.textContent).toContain('Niebieski');
    expect(compiled.textContent).toContain('Czerwony');
    expect(compiled.textContent).toContain('Strarz');
  });
});
