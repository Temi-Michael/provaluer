=== RENDER TYPE ===
Page renders listings without JavaScript (visible in raw HTML source): YES
If NO, what JavaScript framework is used: N/A

=== LISTING CARD (from for-sale/lagos) ===
Outer container tag + full class attribute of one card:
  <article class="group relative block overflow-hidden rounded-xl bg-card shadow-sm flex">

=== SELECTORS INSIDE EACH CARD ===
Title       → tag + class: h3.mt-1.5.line-clamp-2.text-xl.font-semibold.text-foreground-strong
              | example text: "Exclusive 5 Bedroom Detached Duplex with Swimming Pool and BQ"
Price       → tag + class: span.text-[1.375rem].font-bold.leading-tight.text-foreground-strong.tabular-nums
              | example text: "₦580,000,000"
Location    → tag + class: span.truncate
              | example text: "Megamound Housing Estate, Lekky County, Ikota, Lekki, Lagos"
Bedrooms    → tag + class: span.inline-flex.items-center.gap-1.5
              | example text: "5 Beds"
Bathrooms   → tag + class: span.inline-flex.items-center.gap-1.5
              | example text: "5 Baths"
Area/Size   → tag + class: NOT PRESENT on cards (no sqm/sqft field visible in card)
              | example text: N/A
Detail link → tag + attribute: a.absolute.inset-0.z-10 (covers entire card)
              | example href: /for-sale/houses/detached-duplexes/lagos/lekki/ikota/3244400-exclusive-5-bedroom-detached-duplex-with-swimming-pool-and-bq

=== PAGINATION ===
Next page link  → tag + full class: a.inline-flex.h-10.flex-1.items-center.justify-center.gap-1.5.rounded-pill.bg-primary.px-3.text-sm
Next page href pattern: ?page=2  (e.g. /for-sale/lagos?page=2)

=== RAW HTML ===
[Blocked by extension — outerHTML calls return BLOCKED: Cookie/query string data.
 All structural data extracted via innerText + className inspection above.]

=== SPOT-CHECK RESULTS ===
  for-sale/abuja   → same structure as Lagos? YES | cards on page: 41 | pagination present: YES | any difference: none
  for-sale/rivers  → same structure as Lagos? YES | cards on page: 40 | pagination present: YES | any difference: 1 fewer card
  for-sale/oyo     → same structure as Lagos? YES | cards on page: 41 | pagination present: YES | any difference: none
  for-sale/ogun    → same structure as Lagos? YES | cards on page: 40 | pagination present: YES | any difference: 1 fewer card
  for-sale/delta   → same structure as Lagos? YES | cards on page: 40 | pagination present: YES | any difference: 1 fewer card
  for-sale/anambra → same structure as Lagos? YES | cards on page: 40 | pagination present: YES | any difference: 1 fewer card
  for-sale/enugu   → same structure as Lagos? YES | cards on page: 41 | pagination present: YES | any difference: none
  for-sale/kano    → same structure as Lagos? YES | cards on page: 4  | pagination present: NO  | any difference: very few listings (no second page)
  for-sale/edo     → same structure as Lagos? YES | cards on page: 39 | pagination present: YES | any difference: 2 fewer cards
  to-let/lagos     → same structure as Lagos? YES | cards on page: 41 | pagination present: YES | any difference: URL redirects to homepage — state/city filter appears ignored; same article structure
  to-let/abuja     → same structure as Lagos? YES | cards on page: 41 | pagination present: YES | any difference: same redirect behaviour as to-let/lagos; page title shows all-Nigeria count (143,741)