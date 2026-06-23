# ADR 0001: Registry V2 and event indexing

Use Aptos tables for direct report and purchase lookups and events for ordered indexing. Do not expose an unbounded `get_all` view. Deploy V2 beside the live V1 module and import V1's nine records as legacy free reports.
