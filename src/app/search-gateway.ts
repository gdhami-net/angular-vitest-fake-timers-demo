import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

/**
 * Stands in for whatever really answers a search. The tests replace it with a
 * spy so the number of calls is the thing being measured.
 */
@Injectable({ providedIn: 'root' })
export class SearchGateway {
  search(term: string): Observable<readonly string[]> {
    if (!term) {
      return of([]);
    }
    return of([`${term} (result 1)`, `${term} (result 2)`]);
  }
}
