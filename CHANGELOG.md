# Changelog

## 1.2.0
- Added a dedicated «آمار و گزارش‌ها» page.
- Added date, rider, runsheet type, and status filters for analytics.
- Added KPI cards for total, delivered, returned, and in-transit parcels.
- Added status distribution, runsheet type, daily trend, and rider performance charts.
- Added Excel-compatible `.xls` export for filtered reports.
- Added «خروجی اکسل همین جستجو» to the advanced search page.
- Fixed search status filters to correctly distinguish IN_TRANSIT, DELIVERED, and RETURNED.

## 1.1.1 - Runsheet bulk tools
- Added manual status change to IN_TRANSIT / DELIVERED / RETURNED.
- Added single and bulk removal of items from a runsheet.
- Added bulk barcode paste/import from Excel with deduplication and conflict reporting.

## 1.2.0 - NEDEx status sync
- Added **بروزرسانی وضعیت** button for NDX runsheets.
- Added server-side NEDEx integration to avoid browser CORS issues.
- Each barcode is checked with `loadUserOrder`.
- `تحویل به مشتری` is shown in green.
- `ارسال به درب منزل-نماینده` triggers `loadOrderComments`: blue when a visible comment exists, red when no comment exists.
- Other NEDEx states are shown neutrally and API failures are shown separately.
- Added status summary counters and latest comment preview.
- Limited concurrent NEDEx requests to reduce load on the external service.
