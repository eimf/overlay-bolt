# Data Model

## Supabase table: `sketches`

Defined in `supabase/migrations/20260429020310_create_sketches_table.sql`.

| Column       | Type          | Notes                              |
| ------------ | ------------- | ---------------------------------- |
| `id`         | uuid          | primary key                        |
| `user_id`    | uuid          | FK to `auth.users`                 |
| `title`      | text          | user-provided                      |
| `strokes`    | jsonb         | array of `Stroke` objects          |
| `mode`       | text          | `'fullscreen'` or `'floating'`     |
| `opacity`    | numeric       | 0..1                               |
| `background` | text          | grid type: `none` / `lines` / etc. |
| `created_at` | timestamptz   | default `now()`                    |
| `updated_at` | timestamptz   | default `now()`                    |

RLS: anonymous-session users can only read/write their own rows via
`auth.uid() = user_id`.

## Stroke shape

```ts
type Stroke = {
  color: string;
  width: number;
  tool: 'pen' | 'highlighter';
  points: { x: number; y: number }[];
};
```

## Persistence on/off contract

`lib/preferences.ts` exposes a tiny reactive store. The rule is simple:

- If `preferences.persistenceEnabled === false`, **no** code path should touch
  `supabase.from('sketches')`. This includes session bootstrap, save, load,
  and delete.
- The toggle is user-owned; we never flip it automatically.
