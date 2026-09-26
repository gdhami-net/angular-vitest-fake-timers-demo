import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs';
import { SearchGateway } from './search-gateway';

export const DEBOUNCE_MS = 300;

/**
 * A search box that waits DEBOUNCE_MS after the last keystroke before it asks
 * the gateway anything. debounceTime schedules its wait on RxJS's async
 * scheduler, which is setInterval underneath, so a fake clock drives it.
 */
@Component({
  selector: 'app-search-box',
  imports: [ReactiveFormsModule],
  template: `
    <label for="q">Search</label>
    <input id="q" type="search" [formControl]="query" />

    <p data-testid="requests">requests: {{ requests() }}</p>

    <ul data-testid="results">
      @for (row of results(); track row) {
        <li>{{ row }}</li>
      }
    </ul>
  `,
})
export class SearchBox {
  private readonly gateway = inject(SearchGateway);

  readonly query = new FormControl('', { nonNullable: true });
  readonly results = signal<readonly string[]>([]);
  readonly requests = signal(0);

  constructor() {
    this.query.valueChanges
      .pipe(
        debounceTime(DEBOUNCE_MS),
        distinctUntilChanged(),
        tap(() => this.requests.update((n) => n + 1)),
        switchMap((term) => this.gateway.search(term)),
        takeUntilDestroyed(),
      )
      .subscribe((rows) => this.results.set(rows));
  }
}
