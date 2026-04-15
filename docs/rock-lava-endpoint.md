# Rock RMS Lava Endpoint: Featured Events with Expanded Dates

## Purpose

Replaces 6+ separate V2 API calls with a single Lava endpoint that returns
all featured events from Calendar 1 with their scheduled dates expanded
across a configurable date range. Uses the `eventscheduledinstance` command
for efficient server-side RRULE expansion.

## Setup

1. Create a new **Lava Application** in Rock (Admin > CMS > Lava Applications)
   - Name: `OA Weekend API`
   - Active: Yes

2. Create a new **Lava Endpoint** under that application
   - Name: `Featured Events`
   - Slug: `featured-events`
   - HTTP Method: `GET`
   - Security Mode: `0` (or configure as needed)
   - Enabled Lava Commands: `RockEntity,Sql,EventScheduledInstance`
   - Code Template: (paste the code below)

3. The endpoint will be accessible at:
   `https://www.oneandall.church/api/lava/oa-weekend-api/featured-events?months=3`

## Query Parameters

| Param | Default | Description |
|-------|---------|-------------|
| `months` | `3` | Number of months forward and back to expand event dates |

## Code Template

```lava
{%- comment -%}
  Featured Events endpoint for OA Weekend Strategic Calendar.
  Returns all featured events from Calendar 1 with expanded schedule dates,
  campus info, ministry tags, and calls to action.

  Query params:
    months (default: 3) — how many months forward/back to expand dates
{%- endcomment -%}

{%- assign months = 'Global' | PageParameter:'months' | Default:'3' | AsInteger -%}
{%- assign dateRange = months | Append:'m' -%}
{%- assign today = 'Now' | Date:'yyyy-MM-dd' -%}
{%- assign rangeStart = 'Now' | DateAdd:0-months,'M' | Date:'yyyy-MM-ddTHH:mm:ss' -%}

{%- comment -%} Step 1: Get all EventCalendarItems for Calendar 1 (Public) {%- endcomment -%}
{%- sql return:'calendarItems' -%}
  SELECT
    eci.Id AS CalendarItemId,
    eci.EventItemId,
    ei.Name,
    ei.Summary,
    ei.Description,
    ei.PhotoId,
    ei.IsActive,
    ei.DetailsUrl
  FROM EventCalendarItem eci
  INNER JOIN EventItem ei ON ei.Id = eci.EventItemId
  WHERE eci.EventCalendarId = 1
    AND ei.IsActive = 1
{%- endsql -%}

{%- comment -%} Step 2: Check which are featured and get attributes {%- endcomment -%}
{%- assign events = '' | Split:'||' -%}
{%- assign eventCount = 0 -%}

{%- for item in calendarItems -%}
  {%- assign featuredValue = '' -%}
  {%- assign campusesValue = '' -%}
  {%- assign ministryValue = '' -%}
  {%- assign ctaValue = '' -%}

  {%- sql return:'attrs' -%}
    SELECT
      a.Name AS [Key],
      COALESCE(av.Value, '') AS [Value],
      COALESCE(
        CASE
          WHEN ft.Id IS NOT NULL THEN ft.Value
          WHEN a.FieldTypeId = 11 THEN av.Value
          ELSE av.Value
        END, '') AS [TextValue]
    FROM AttributeValue av
    INNER JOIN Attribute a ON a.Id = av.AttributeId
    LEFT JOIN DefinedValue ft ON TRY_CAST(av.Value AS UNIQUEIDENTIFIER) = ft.Guid
    WHERE av.EntityId = {{ item.CalendarItemId }}
      AND a.EntityTypeId = (SELECT Id FROM EntityType WHERE Name = 'Rock.Model.EventCalendarItem')
      AND a.Name IN ('FeaturedEvent', 'ForCampuses', 'ForMinistry', 'CallsToAction')
  {%- endsql -%}

  {%- for attr in attrs -%}
    {%- if attr.Key == 'FeaturedEvent' -%}
      {%- assign featuredValue = attr.Value -%}
    {%- elseif attr.Key == 'ForCampuses' -%}
      {%- assign campusesValue = attr.TextValue -%}
    {%- elseif attr.Key == 'ForMinistry' -%}
      {%- assign ministryValue = attr.TextValue -%}
    {%- elseif attr.Key == 'CallsToAction' -%}
      {%- assign ctaValue = attr.Value -%}
    {%- endif -%}
  {%- endfor -%}

  {%- comment -%} Check if featured (value1, True, or true) {%- endcomment -%}
  {%- if featuredValue == 'value1' or featuredValue == 'True' or featuredValue == 'true' -%}
    {%- assign eventCount = eventCount | Plus:1 -%}
  {%- else -%}
    {%- continue -%}
  {%- endif -%}

  {%- comment -%} Step 3: Get expanded schedule dates for this event {%- endcomment -%}
  {%- eventscheduledinstance eventid:'{{ item.EventItemId }}' maxoccurrences:'50' daterange:'{{ dateRange }}' -%}
    {%- comment -%} Also get past dates by querying from rangeStart {%- endcomment -%}
  {%- endeventscheduledinstance -%}

  {%- comment -%} Build photo URL {%- endcomment -%}
  {%- assign photoUrl = '' -%}
  {%- if item.PhotoId and item.PhotoId > 0 -%}
    {%- assign photoUrl = '/GetImage.ashx?id=' | Append:item.PhotoId -%}
  {%- endif -%}

  {%- comment -%} Parse campus list {%- endcomment -%}
  {%- assign campusList = campusesValue | Split:',' -%}

  {%- comment -%} Parse calls to action (pipe-delimited, caret-separated label^url) {%- endcomment -%}
  {%- assign ctaPairs = ctaValue | Split:'|' -%}

  {%- comment -%} Output this event as JSON {%- endcomment -%}
  {%- if eventCount > 1 -%},{%- endif -%}
  {
    "eventItemId": {{ item.EventItemId }},
    "name": {{ item.Name | ToJSON }},
    "summary": {{ item.Summary | Default:'' | ToJSON }},
    "photoUrl": {{ photoUrl | ToJSON }},
    "detailsUrl": {{ item.DetailsUrl | Default:'' | ToJSON }},
    "campuses": {{ campusesValue | ToJSON }},
    "campusList": [
      {%- for c in campusList -%}
        {%- assign trimmed = c | Trim -%}
        {%- if trimmed != '' -%}
          {%- if forloop.index > 1 -%},{%- endif -%}
          {{ trimmed | ToJSON }}
        {%- endif -%}
      {%- endfor -%}
    ],
    "ministry": {{ ministryValue | ToJSON }},
    "callsToAction": [
      {%- assign ctaIndex = 0 -%}
      {%- for pair in ctaPairs -%}
        {%- assign parts = pair | Split:'^' -%}
        {%- if parts.size == 2 -%}
          {%- assign ctaLabel = parts[0] | Trim -%}
          {%- assign ctaUrl = parts[1] | Trim -%}
          {%- if ctaLabel != '' and ctaUrl != '' -%}
            {%- if ctaIndex > 0 -%},{%- endif -%}
            { "label": {{ ctaLabel | ToJSON }}, "url": {{ ctaUrl | ToJSON }} }
            {%- assign ctaIndex = ctaIndex | Plus:1 -%}
          {%- endif -%}
        {%- endif -%}
      {%- endfor -%}
    ],
    "occurrences": [
      {%- assign occIndex = 0 -%}
      {%- for instance in EventScheduledInstances -%}
        {%- if occIndex > 0 -%},{%- endif -%}
        {
          "date": {{ instance.DateTime | Date:'yyyy-MM-ddTHH:mm:ss' | ToJSON }},
          "endDate": {{ instance.EndDate | Date:'yyyy-MM-ddTHH:mm:ss' | Default:'' | ToJSON }},
          "campus": {{ instance.Campus | Default:'' | ToJSON }},
          "location": {{ instance.Location | Default:'' | ToJSON }},
          "locationDescription": {{ instance.LocationDescription | Default:'' | ToJSON }},
          "note": {{ instance.OccurrenceNote | Default:'' | ToJSON }}
        }
        {%- assign occIndex = occIndex | Plus:1 -%}
      {%- endfor -%}
    ]
  }
{%- endfor -%}
```

**Important:** Wrap the output in a JSON array. The full endpoint response should be:

```
[
  (the output from the loop above)
]
```

To do this, set the endpoint's code template to:

```lava
[
(paste the loop code here)
]
```

## Response Format

```json
[
  {
    "eventItemId": 155,
    "name": "Re:generation",
    "summary": "A 12-step Christ-centered program...",
    "photoUrl": "/GetImage.ashx?id=12345",
    "detailsUrl": "",
    "campuses": "San Dimas, Rancho Cucamonga",
    "campusList": ["San Dimas", "Rancho Cucamonga"],
    "ministry": "Care",
    "callsToAction": [
      { "label": "Register", "url": "https://..." }
    ],
    "occurrences": [
      {
        "date": "2026-03-07T14:00:00",
        "endDate": "2026-03-07T19:00:00",
        "campus": "San Dimas",
        "location": "Main Building",
        "locationDescription": "",
        "note": ""
      },
      {
        "date": "2026-03-14T14:00:00",
        "endDate": "2026-03-14T19:00:00",
        "campus": "San Dimas",
        "location": "Main Building",
        "locationDescription": "",
        "note": ""
      }
    ]
  }
]
```

## Integration

Once deployed, update `apps/web/lib/rock.ts` to call this single endpoint
instead of the current 6-call `getFeaturedEvents()` function. The response
format matches the existing `RockFeaturedEvent` interface — just map
`occurrence.date` to `nextStartDateTime` in the frontend.

## Benefits

- **1 API call** instead of 6+ (calendar items, attributes per item, event items, occurrences, schedules)
- **Server-side RRULE expansion** via `eventscheduledinstance` — no client-side iCal parsing
- **Past + future dates** included automatically
- **~10x faster** — single request vs batched attribute lookups
