---
title: "Custom JQ Functions"
sidebar_position: 5
description: Reference for hugr-specific custom JQ functions including time manipulation, query engine integration, and authentication context
keywords: [jq, custom functions, time, queryHugr, authInfo, transformations]
---

# Custom JQ Functions

Hugr extends the standard jq language with custom functions for common server-side tasks. These functions are available in all JQ contexts — inline `jq()` queries, the `/jq-query` REST endpoint, and [`_jq` variable input transformations](./4-jq-transformations.md#_jq-variable-input-transformations).

Custom functions are organized into three categories:

- **[Time Functions](#time-functions)** — get current time, round/truncate dates, add durations, extract date parts
- **[Query Engine Functions](#query-engine-functions)** — execute GraphQL queries from within JQ expressions
- **[Authentication Functions](#authentication-functions)** — access the current user's authentication context

## Time Functions

### `localTime`

Returns the current local time (server timezone).

**Signature**: `localTime` (no arguments, no input required)

```jq
localTime
# "2024-06-15T16:30:45+02:00" (example, depends on server timezone)
```

### `utcTime`

Returns the current UTC time.

**Signature**: `utcTime` (no arguments, no input required)

```jq
utcTime
# "2024-06-15T14:30:45Z"
```

### `unixTime`

Converts a time value to a Unix timestamp in seconds. When the input is `null`, returns the current UTC Unix timestamp.

**Signature**: `<time_value> | unixTime`

```jq
"2024-06-15T14:30:45Z" | unixTime
# 1718457045

"2024-06-15T14:30:45Z" | roundTime("day"; "UTC") | unixTime
# 1718409600

null | unixTime
# (current UTC unix timestamp)
```

### `roundTime`

Truncates or rounds a time value to the given period.

**Signatures**:
- `<time_value> | roundTime(period)`
- `<time_value> | roundTime(period; timezone)`

The optional `timezone` parameter is an IANA timezone string (e.g. `"America/New_York"`).

#### Named Periods

| Period | Result |
| --- | --- |
| `"second"` / `"seconds"` | Round to nearest second |
| `"minute"` / `"minutes"` | Round to nearest minute |
| `"hour"` / `"hours"` | Truncate to start of hour |
| `"day"` | Truncate to start of day |
| `"month"` / `"months"` | Truncate to first of the month |
| `"year"` / `"years"` | Truncate to January 1st |
| `"monday"` .. `"saturday"` | Truncate to the given weekday |

Any Go `time.Duration` string (e.g. `"15m"`, `"2h30m"`) is also accepted and rounds using `time.Round`.

```jq
"2024-06-15T14:30:45Z" | roundTime("day")
# "2024-06-15T00:00:00Z"

"2024-06-15T14:30:45Z" | roundTime("month"; "UTC")
# "2024-06-01T00:00:00Z"

"2024-06-15T14:30:45Z" | roundTime("monday")
# "2024-06-10T00:00:00Z" (previous Monday)

"2024-06-15T14:30:45Z" | roundTime("15m")
# "2024-06-15T14:30:00Z"
```

### `timeAdd`

Adds a Go duration string to a time value.

**Signatures**:
- `<time_value> | timeAdd(duration)`
- `<time_value> | timeAdd(duration; timezone)`

Duration format follows Go's `time.Duration` syntax: `"1h"`, `"30m"`, `"2h30m"`, `"-1h"` (negative to subtract).

```jq
"2024-06-15T14:30:45Z" | timeAdd("2h")
# "2024-06-15T16:30:45Z"

"2024-06-15T14:30:45Z" | timeAdd("-30m"; "UTC")
# "2024-06-15T14:00:45Z"
```

### `datePart`

Extracts a component from a time value as an integer.

**Signatures**:
- `<time_value> | datePart(part)`
- `<time_value> | datePart(part; timezone)`

#### Part Reference

| Part | Returns |
| --- | --- |
| `"second"` | 0–59 |
| `"minute"` | 0–59 |
| `"hour"` | 0–23 |
| `"day"` | 1–31 |
| `"month"` | 1–12 |
| `"year"` | e.g. 2024 |
| `"weekday"` | 1 (Monday) – 7 (Sunday) |
| `"yearday"` | 1–366 |

```jq
"2024-06-15T14:30:45Z" | datePart("hour")
# 14

"2024-06-15T14:30:45Z" | datePart("weekday")
# 6 (Saturday)
```

### Time Input Formats

All time functions accept the following input formats:

| Format | Example | Notes |
| --- | --- | --- |
| RFC 3339 string | `"2024-06-15T14:30:45Z"` | Standard date-time format |
| Unix timestamp (float64) | `1718457045` | Timezone parameter applies only to this format |
| `time.Time` value | Output of `localTime`, `utcTime`, or other time functions | For piping/chaining |

### Chaining Examples

Time functions can be piped together for complex operations:

```jq
# Get start of day, then add 9 hours (business hours start)
"2024-06-15T14:30:45Z" | roundTime("day") | timeAdd("9h") | {
    hour: datePart("hour"),
    day:  datePart("day")
}
# {"hour": 9, "day": 15}
```

```jq
# Get first day of current year in UTC
utcTime | roundTime("year"; "UTC") | {
    month: datePart("month"; "UTC"),
    day:   datePart("day"; "UTC")
}
# {"month": 1, "day": 1}
```

## Query Engine Functions

### `queryHugr`

Executes a GraphQL query against the hugr query engine from within a JQ expression. This enables data enrichment, lookups, and cross-referencing inside transformations.

**Signatures**:
- `queryHugr(query)`
- `queryHugr(query; variables)`

The result can be bound to a variable using `as`:

```jq
queryHugr("{ users { name } }").users
# [{"name": "alice"}, {"name": "bob"}]

queryHugr("{ config { multiplier } }") as $cfg | .value * $cfg.config.multiplier
```

:::tip
`queryHugr` is extensively documented with 20+ examples in the [JQ Transformations — queryHugr() Function](./4-jq-transformations.md#queryhugr-function-jq-only) section, including variable passing, the `as` binding pattern, nested queries, and error handling.
:::

## Authentication Functions

### `authInfo`

Returns the current authentication context as an object, or `null` if the request is not authenticated.

**Signature**: `authInfo` (no arguments, no input required)

**Return structure** (when authenticated):

```json
{
  "userId": "user-123",
  "userName": "alice",
  "role": "admin"
}
```

**When not authenticated**: returns `null`.

```jq
# Get current user's role
authInfo.role
# "admin"

# Conditional logic based on authentication
if authInfo then
  "Hello, " + authInfo.userName
else
  "Anonymous"
end
```
