# Google Analytics

ScribeHub uses the GA4 web stream `G-YPQQTEZWGV`. The measurement ID is public and may be overridden with `NEXT_PUBLIC_GA_MEASUREMENT_ID`.

Analytics loads only when `VERCEL_ENV=production`, unless `NEXT_PUBLIC_ENABLE_ANALYTICS=true` is explicitly set for local verification. Preview deployments and automated tests therefore do not pollute production reports.

## Collected events

- GA4 automatically collects page views, sessions, engagement, scrolls, outbound clicks, and compatible file downloads through Enhanced Measurement.
- `login`: a wallet connects; only the wallet provider name is sent.
- `share`: a report link is copied.
- `report_upload`: a Shelby upload completes.
- `report_purchase`: the Aptos purchase and report access are verified.
- `report_download`: an app-managed download completes successfully.

Report events contain only access type, file type, report category, storage network, and where applicable the APT price or entitlement class. Wallet addresses, transaction hashes, report titles, blob coordinates, file names, and search text are never sent.

## Verify collection

1. Open the production site in a browser without an analytics-blocking extension.
2. In Google Analytics, open **Reports → Realtime** and look for `page_view` within several minutes.
3. Navigate between Reports, Intel, and Profile to verify App Router page views.
4. Connect a wallet or share a report and confirm the corresponding event.
5. For installation troubleshooting, enter `https://shelbyscribe.vercel.app` in Google Tag Assistant and confirm that measurement ID `G-YPQQTEZWGV` is detected.

Standard GA4 reports can take 24–48 hours to populate even when Realtime is working.

## Make product parameters reportable

Event names appear automatically. To use the attached parameters in explorations and reports, open **Admin → Data display → Custom definitions** and create event-scoped custom dimensions for `access_type`, `file_type`, `report_type`, `storage_network`, and `entitlement`. Create a custom metric for `price_apt`.

If uploads and purchases represent the app's primary outcomes, mark `report_upload` and `report_purchase` as key events after they first appear in the Events report.
