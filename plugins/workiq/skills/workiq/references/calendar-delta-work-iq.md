# Calendar change tracking

## Required before use

- [Calendar boundaries](calendar-base-work-iq.md)
- [Functions and checkpoints](call-function-work-iq.md)

## Operation

Only an explicit structured change-tracking request uses calendar delta.
Resolve the initial start/end window with date-specific timezone boundaries;
resume the exact saved link and its original window thereafter.
No checkpoint means initial sync, not historical changes since an arbitrary date.
