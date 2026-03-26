/// Shelby Research — on-chain report registry.
///
/// Stores metadata for every report uploaded to the Shelby blob network.
/// The actual file lives on Shelby; this contract is the public index.
///
/// Deployment (one-time):
///   1. aptos init --network testnet
///   2. Fill in shelby_registry address in Move.toml
///   3. aptos move publish --named-addresses shelby_registry=<your-address>
///   4. aptos move run --function-id <your-address>::registry::initialize
module shelby_registry::registry {
    use std::string::String;
    use std::vector;
    use aptos_framework::timestamp;
    use aptos_framework::signer;

    // ── Errors ────────────────────────────────────────────────────────────────
    const E_ALREADY_INITIALIZED: u64 = 1;
    const E_NOT_INITIALIZED:     u64 = 2;

    // ── Structs ───────────────────────────────────────────────────────────────

    struct ReportEntry has store, drop, copy {
        // Shelby blob location
        blob_account: String,   // uploader wallet address (string form)
        blob_name:    String,   // path on the Shelby network
        network:      String,   // "testnet" | "shelbynet"

        // Report metadata
        title:        String,
        description:  String,
        report_type:  String,   // Research | Analysis | Intel | Document | Report
        access:       String,   // "free" | "premium"
        price:        u64,      // APT in octas (0 for free)
        file_type:    String,   // pdf | md | csv | json | mp4 | …
        tags:         vector<String>,

        // Authorship
        author:       String,   // display name
        registrant:   address,  // on-chain address of uploader

        // Timestamp
        registered_at: u64,     // microseconds since epoch
    }

    struct Registry has key {
        entries: vector<ReportEntry>,
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    /// Call once after deployment to create the global registry resource.
    public entry fun initialize(admin: &signer) {
        assert!(!exists<Registry>(signer::address_of(admin)), E_ALREADY_INITIALIZED);
        move_to(admin, Registry { entries: vector::empty() });
    }

    // ── Write ─────────────────────────────────────────────────────────────────

    /// Register a report after uploading its file to the Shelby blob network.
    /// `registry_addr` is the address where the Registry resource lives
    /// (the deployer's address, set in NEXT_PUBLIC_REGISTRY_ADDRESS).
    public entry fun register_report(
        caller:        &signer,
        registry_addr: address,
        blob_account:  String,
        blob_name:     String,
        network:       String,
        title:         String,
        description:   String,
        report_type:   String,
        access:        String,
        price:         u64,
        file_type:     String,
        tags:          vector<String>,
        author:        String,
    ) acquires Registry {
        assert!(exists<Registry>(registry_addr), E_NOT_INITIALIZED);
        let registry = borrow_global_mut<Registry>(registry_addr);
        vector::push_back(&mut registry.entries, ReportEntry {
            blob_account,
            blob_name,
            network,
            title,
            description,
            report_type,
            access,
            price,
            file_type,
            tags,
            author,
            registrant:    signer::address_of(caller),
            registered_at: timestamp::now_microseconds(),
        });
    }

    // ── Read (view functions) ─────────────────────────────────────────────────

    #[view]
    public fun get_entries(registry_addr: address): vector<ReportEntry> acquires Registry {
        assert!(exists<Registry>(registry_addr), E_NOT_INITIALIZED);
        borrow_global<Registry>(registry_addr).entries
    }

    #[view]
    public fun entry_count(registry_addr: address): u64 acquires Registry {
        assert!(exists<Registry>(registry_addr), E_NOT_INITIALIZED);
        vector::length(&borrow_global<Registry>(registry_addr).entries)
    }
}
