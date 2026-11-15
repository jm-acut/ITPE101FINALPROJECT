# Code review record

Your instruction file requires that at least one pull request is reviewed by another person, and that this record lists three or more substantive findings with the changes made. Because this project is individual, ask your instructor how this applies (for example, a classmate or the instructor reviews one pull request on GitHub). Fill in only what really happened.

## Reviewed pull requests
| # | Pull request (link) | Author | Reviewer (name) | Date | Outcome |
|---|---|---|---|---|---|
| 1 | | | | | |

## Findings
Each finding has a location, what was wrong, why it matters, and the change made (link the commit).
| # | File and line | Finding | Severity | Change made (commit) |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

## Where a reviewer will find real material
These are known weak spots in the project. A reviewer can check them, and each is a legitimate review comment whether or not it is fixed.
- Rate limits live in server memory, so they reset on restart and are not shared between servers.
- The login token is kept in the browser's local storage; an httpOnly cookie would resist script theft better.
- The scheduled job in `server.js` runs inside the web process; a separate worker would isolate it.
- `reconcilePending` checks at most 10 payment sessions per minute.
- Maya amounts are converted from pesos with `Math.round(x * 100)`; a decimal library would remove any floating-point doubt.
- Customer ownership checks are repeated in several services; a shared helper could remove the duplication.
- Admin list endpoints have no export or bulk actions.

## Review checklist used
Security (secrets, validation, ownership checks), money handling (centavos only), error format, tests for the change, naming and duplication.