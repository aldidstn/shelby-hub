/// Scalable report registry and durable purchase receipts for Shelby Research.
module shelby_registry::registry_v2 {
    use std::signer;
    use std::string::{Self, String};
    use std::vector;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::coin;
    use aptos_framework::event;
    use aptos_framework::timestamp;
    use aptos_std::table::{Self, Table};

    const E_ALREADY_INITIALIZED: u64 = 1;
    const E_NOT_INITIALIZED: u64 = 2;
    const E_REPORT_EXISTS: u64 = 3;
    const E_REPORT_NOT_FOUND: u64 = 4;
    const E_NOT_OWNER: u64 = 5;
    const E_REPORT_INACTIVE: u64 = 6;
    const E_NOT_PREMIUM: u64 = 7;
    const E_ALREADY_PURCHASED: u64 = 8;
    const E_INVALID_ACCESS: u64 = 9;
    const E_INVALID_NETWORK: u64 = 10;
    const E_INVALID_PRICE: u64 = 11;
    const E_INVALID_METADATA: u64 = 12;

    const MAX_ID_BYTES: u64 = 96;
    const MAX_BLOB_NAME_BYTES: u64 = 512;
    const MAX_TITLE_BYTES: u64 = 160;
    const MAX_DESCRIPTION_BYTES: u64 = 2000;
    const MAX_TYPE_BYTES: u64 = 32;
    const MAX_FILE_TYPE_BYTES: u64 = 32;
    const MAX_TAGS: u64 = 12;
    const MAX_TAG_BYTES: u64 = 40;
    const MAX_CIPHER_HASH_BYTES: u64 = 128;
    const MAX_ACE_ORIGIN_BYTES: u64 = 256;
    const DEFAULT_ACE_ORIGIN: vector<u8> = b"https://shelby-hub-iota.vercel.app";

    struct PurchaseKey has copy, drop, store {
        buyer: address,
        report_id: String,
    }

    struct ReportEntry has store, drop, copy {
        id: String,
        owner: address,
        blob_name: String,
        network: String,
        title: String,
        description: String,
        report_type: String,
        access: String,
        price: u64,
        file_type: String,
        tags: vector<String>,
        cipher_hash: String,
        encryption_version: u8,
        active: bool,
        created_at: u64,
        updated_at: u64,
    }

    struct Registry has key {
        reports: Table<String, ReportEntry>,
        purchases: Table<PurchaseKey, u64>,
        ace_origin: String,
    }

    #[event]
    struct ReportRegistered has drop, store {
        report_id: String,
        owner: address,
        blob_name: String,
        network: String,
        title: String,
        description: String,
        report_type: String,
        access: String,
        price: u64,
        file_type: String,
        tags: vector<String>,
        cipher_hash: String,
        encryption_version: u8,
        created_at: u64,
    }

    #[event]
    struct ReportUpdated has drop, store {
        report_id: String,
        owner: address,
        title: String,
        description: String,
        report_type: String,
        access: String,
        price: u64,
        tags: vector<String>,
        updated_at: u64,
    }

    #[event]
    struct ReportDeactivated has drop, store {
        report_id: String,
        owner: address,
        deactivated_at: u64,
    }

    #[event]
    struct ReportPurchased has drop, store {
        report_id: String,
        buyer: address,
        seller: address,
        amount: u64,
        purchased_at: u64,
    }

    #[event]
    struct AceOriginUpdated has drop, store {
        registry: address,
        origin: String,
        updated_at: u64,
    }

    public entry fun initialize(admin: &signer) {
        let address = signer::address_of(admin);
        assert!(!exists<Registry>(address), E_ALREADY_INITIALIZED);
        move_to(admin, Registry {
            reports: table::new(),
            purchases: table::new(),
            ace_origin: string::utf8(DEFAULT_ACE_ORIGIN),
        });
    }

    public entry fun update_ace_origin(admin: &signer, origin: String) acquires Registry {
        let registry_addr = signer::address_of(admin);
        assert!(exists<Registry>(registry_addr), E_NOT_INITIALIZED);
        assert_length(&origin, 1, MAX_ACE_ORIGIN_BYTES);
        let registry = borrow_global_mut<Registry>(registry_addr);
        registry.ace_origin = copy origin;
        event::emit(AceOriginUpdated {
            registry: registry_addr,
            origin,
            updated_at: timestamp::now_microseconds(),
        });
    }

    public entry fun register_report(
        caller: &signer,
        registry_addr: address,
        report_id: String,
        blob_name: String,
        network: String,
        title: String,
        description: String,
        report_type: String,
        access: String,
        price: u64,
        file_type: String,
        tags: vector<String>,
        cipher_hash: String,
        encryption_version: u8,
    ) acquires Registry {
        assert!(exists<Registry>(registry_addr), E_NOT_INITIALIZED);
        validate_report(&report_id, &blob_name, &network, &title, &description, &report_type, &access, price, &file_type, &tags, &cipher_hash, encryption_version);

        let registry = borrow_global_mut<Registry>(registry_addr);
        assert!(!table::contains(&registry.reports, copy report_id), E_REPORT_EXISTS);
        let owner = signer::address_of(caller);
        let now = timestamp::now_microseconds();
        let entry = ReportEntry {
            id: copy report_id,
            owner,
            blob_name: copy blob_name,
            network: copy network,
            title: copy title,
            description: copy description,
            report_type: copy report_type,
            access: copy access,
            price,
            file_type: copy file_type,
            tags: copy tags,
            cipher_hash: copy cipher_hash,
            encryption_version,
            active: true,
            created_at: now,
            updated_at: now,
        };
        table::add(&mut registry.reports, copy report_id, entry);
        event::emit(ReportRegistered {
            report_id, owner, blob_name, network, title, description, report_type,
            access, price, file_type, tags, cipher_hash, encryption_version, created_at: now,
        });
    }

    public entry fun update_report(
        caller: &signer,
        registry_addr: address,
        report_id: String,
        title: String,
        description: String,
        report_type: String,
        access: String,
        price: u64,
        tags: vector<String>,
    ) acquires Registry {
        assert!(exists<Registry>(registry_addr), E_NOT_INITIALIZED);
        validate_mutable_metadata(&title, &description, &report_type, &access, price, &tags);
        let registry = borrow_global_mut<Registry>(registry_addr);
        assert!(table::contains(&registry.reports, copy report_id), E_REPORT_NOT_FOUND);
        let entry = table::borrow_mut(&mut registry.reports, copy report_id);
        let owner = signer::address_of(caller);
        assert!(entry.owner == owner, E_NOT_OWNER);
        assert!(entry.active, E_REPORT_INACTIVE);
        assert!(entry.access == access, E_INVALID_ACCESS);
        let now = timestamp::now_microseconds();
        entry.title = copy title;
        entry.description = copy description;
        entry.report_type = copy report_type;
        entry.price = price;
        entry.tags = copy tags;
        entry.updated_at = now;
        event::emit(ReportUpdated { report_id, owner, title, description, report_type, access, price, tags, updated_at: now });
    }

    public entry fun deactivate_report(caller: &signer, registry_addr: address, report_id: String) acquires Registry {
        assert!(exists<Registry>(registry_addr), E_NOT_INITIALIZED);
        let registry = borrow_global_mut<Registry>(registry_addr);
        assert!(table::contains(&registry.reports, copy report_id), E_REPORT_NOT_FOUND);
        let entry = table::borrow_mut(&mut registry.reports, copy report_id);
        let owner = signer::address_of(caller);
        assert!(entry.owner == owner, E_NOT_OWNER);
        assert!(entry.active, E_REPORT_INACTIVE);
        let now = timestamp::now_microseconds();
        entry.active = false;
        entry.updated_at = now;
        event::emit(ReportDeactivated { report_id, owner, deactivated_at: now });
    }

    public entry fun purchase_report(buyer: &signer, registry_addr: address, report_id: String) acquires Registry {
        assert!(exists<Registry>(registry_addr), E_NOT_INITIALIZED);
        let registry = borrow_global_mut<Registry>(registry_addr);
        assert!(table::contains(&registry.reports, copy report_id), E_REPORT_NOT_FOUND);
        let entry = table::borrow(&registry.reports, copy report_id);
        assert!(entry.active, E_REPORT_INACTIVE);
        assert!(is_premium(&entry.access), E_NOT_PREMIUM);
        assert!(entry.price > 0, E_INVALID_PRICE);
        let buyer_addr = signer::address_of(buyer);
        let key = PurchaseKey { buyer: buyer_addr, report_id: copy report_id };
        assert!(!table::contains(&registry.purchases, copy key), E_ALREADY_PURCHASED);
        let seller = entry.owner;
        let amount = entry.price;
        coin::transfer<AptosCoin>(buyer, seller, amount);
        let now = timestamp::now_microseconds();
        table::add(&mut registry.purchases, key, now);
        event::emit(ReportPurchased { report_id, buyer: buyer_addr, seller, amount, purchased_at: now });
    }

    #[view]
    public fun get_report(registry_addr: address, report_id: String): ReportEntry acquires Registry {
        assert!(exists<Registry>(registry_addr), E_NOT_INITIALIZED);
        let registry = borrow_global<Registry>(registry_addr);
        assert!(table::contains(&registry.reports, copy report_id), E_REPORT_NOT_FOUND);
        *table::borrow(&registry.reports, report_id)
    }

    #[view]
    public fun has_purchased(registry_addr: address, buyer: address, report_id: String): bool acquires Registry {
        if (!exists<Registry>(registry_addr)) return false;
        let registry = borrow_global<Registry>(registry_addr);
        table::contains(&registry.purchases, PurchaseKey { buyer, report_id })
    }

    #[view]
    public fun on_ace_decryption_request(label: vector<u8>, account: address, origin: String): bool acquires Registry {
        if (!exists<Registry>(@shelby_registry)) return false;
        let registry = borrow_global<Registry>(@shelby_registry);
        if (string::bytes(&registry.ace_origin) != string::bytes(&origin)) return false;

        let report_id = string::utf8(label);
        if (!table::contains(&registry.reports, copy report_id)) return false;
        let entry = table::borrow(&registry.reports, copy report_id);
        if (!entry.active) return false;
        if (entry.owner == account) return true;
        if (is_free(&entry.access)) return true;
        table::contains(&registry.purchases, PurchaseKey { buyer: account, report_id })
    }

    fun validate_report(
        report_id: &String, blob_name: &String, network: &String, title: &String,
        description: &String, report_type: &String, access: &String, price: u64,
        file_type: &String, tags: &vector<String>, cipher_hash: &String, encryption_version: u8,
    ) {
        assert_length(report_id, 1, MAX_ID_BYTES);
        assert_length(blob_name, 1, MAX_BLOB_NAME_BYTES);
        assert_length(file_type, 1, MAX_FILE_TYPE_BYTES);
        assert!(is_network(network), E_INVALID_NETWORK);
        assert!(string::length(cipher_hash) <= MAX_CIPHER_HASH_BYTES, E_INVALID_METADATA);
        validate_mutable_metadata(title, description, report_type, access, price, tags);
        if (is_premium(access)) {
            assert!(encryption_version > 0 && string::length(cipher_hash) > 0, E_INVALID_METADATA);
        } else {
            assert!(encryption_version == 0, E_INVALID_METADATA);
        };
    }

    fun validate_mutable_metadata(
        title: &String, description: &String, report_type: &String,
        access: &String, price: u64, tags: &vector<String>,
    ) {
        assert_length(title, 1, MAX_TITLE_BYTES);
        assert_length(description, 0, MAX_DESCRIPTION_BYTES);
        assert_length(report_type, 1, MAX_TYPE_BYTES);
        assert!(is_free(access) || is_premium(access), E_INVALID_ACCESS);
        assert!((is_free(access) && price == 0) || (is_premium(access) && price > 0), E_INVALID_PRICE);
        assert!(vector::length(tags) <= MAX_TAGS, E_INVALID_METADATA);
        vector::for_each_ref(tags, |tag| assert_length(tag, 1, MAX_TAG_BYTES));
    }

    fun assert_length(value: &String, min: u64, max: u64) {
        let length = string::length(value);
        assert!(length >= min && length <= max, E_INVALID_METADATA);
    }

    fun is_free(value: &String): bool { string::bytes(value) == &b"free" }
    fun is_premium(value: &String): bool { string::bytes(value) == &b"premium" }
    fun is_network(value: &String): bool {
        string::bytes(value) == &b"testnet" || string::bytes(value) == &b"shelbynet"
    }
}
