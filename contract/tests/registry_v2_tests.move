#[test_only]
module shelby_registry::registry_v2_tests {
    use std::string;
    use aptos_framework::aptos_account;
    use aptos_framework::aptos_coin::{Self, AptosCoin};
    use aptos_framework::coin;
    use aptos_framework::timestamp;
    use shelby_registry::registry_v2;

    #[test(admin = @shelby_registry, owner = @0xcafe, framework = @0x1)]
    fun registers_report_and_starts_without_purchase(admin: signer, owner: signer, framework: signer) {
        timestamp::set_time_has_started_for_testing(&framework);
        registry_v2::initialize(&admin);
        register_free(&owner);
        assert!(!registry_v2::has_purchased(@shelby_registry, @0xbeef, string::utf8(b"report-1")), 1);
    }

    #[test(admin = @shelby_registry, owner = @0xcafe, framework = @0x1)]
    #[expected_failure(abort_code = 3, location = shelby_registry::registry_v2)]
    fun rejects_duplicate_report_id(admin: signer, owner: signer, framework: signer) {
        timestamp::set_time_has_started_for_testing(&framework);
        registry_v2::initialize(&admin);
        register_free(&owner);
        register_free(&owner);
    }

    #[test(admin = @shelby_registry, owner = @0xcafe, attacker = @0xbeef, framework = @0x1)]
    #[expected_failure(abort_code = 5, location = shelby_registry::registry_v2)]
    fun rejects_metadata_update_from_non_owner(admin: signer, owner: signer, attacker: signer, framework: signer) {
        timestamp::set_time_has_started_for_testing(&framework);
        registry_v2::initialize(&admin);
        register_free(&owner);
        registry_v2::update_report(
            &attacker, @shelby_registry, string::utf8(b"report-1"), string::utf8(b"Stolen"),
            string::utf8(b"Description"), string::utf8(b"Research"), string::utf8(b"free"), 0,
            vector[string::utf8(b"aptos")],
        );
    }

    #[test(admin = @shelby_registry, owner = @0xcafe, framework = @0x1)]
    #[expected_failure(abort_code = 12, location = shelby_registry::registry_v2)]
    fun rejects_unencrypted_premium_report(admin: signer, owner: signer, framework: signer) {
        timestamp::set_time_has_started_for_testing(&framework);
        registry_v2::initialize(&admin);
        registry_v2::register_report(
            &owner, @shelby_registry, string::utf8(b"premium-1"), string::utf8(b"premium.enc"),
            string::utf8(b"testnet"), string::utf8(b"Premium"), string::utf8(b"Description"),
            string::utf8(b"Research"), string::utf8(b"premium"), 100,
            string::utf8(b"pdf"), vector[], string::utf8(b""), 0,
        );
    }

    #[test(admin = @shelby_registry, owner = @0xcafe, buyer = @0xbeef, framework = @0x1)]
    fun records_purchase_and_transfers_exact_price(admin: signer, owner: signer, buyer: signer, framework: signer) {
        timestamp::set_time_has_started_for_testing(&framework);
        let (burn, mint) = aptos_coin::initialize_for_test(&framework);
        aptos_account::create_account(@0xcafe);
        aptos_account::create_account(@0xbeef);
        coin::deposit(@0xbeef, coin::mint<AptosCoin>(500, &mint));
        registry_v2::initialize(&admin);
        register_premium(&owner);
        registry_v2::purchase_report(&buyer, @shelby_registry, string::utf8(b"premium-1"));
        assert!(registry_v2::has_purchased(@shelby_registry, @0xbeef, string::utf8(b"premium-1")), 2);
        assert!(coin::balance<AptosCoin>(@0xbeef) == 400, 3);
        assert!(coin::balance<AptosCoin>(@0xcafe) == 100, 4);
        coin::destroy_burn_cap(burn);
        coin::destroy_mint_cap(mint);
    }

    #[test(admin = @shelby_registry, owner = @0xcafe, buyer = @0xbeef, framework = @0x1)]
    fun ace_hook_tracks_owner_purchase_and_origin(admin: signer, owner: signer, buyer: signer, framework: signer) {
        timestamp::set_time_has_started_for_testing(&framework);
        let (burn, mint) = aptos_coin::initialize_for_test(&framework);
        aptos_account::create_account(@0xcafe);
        aptos_account::create_account(@0xbeef);
        coin::deposit(@0xbeef, coin::mint<AptosCoin>(500, &mint));
        registry_v2::initialize(&admin);
        register_premium(&owner);

        assert!(registry_v2::on_ace_decryption_request(
            b"premium-1", @0xcafe, string::utf8(b"https://shelby-hub-iota.vercel.app"),
        ), 10);
        assert!(!registry_v2::on_ace_decryption_request(
            b"premium-1", @0xbeef, string::utf8(b"https://shelby-hub-iota.vercel.app"),
        ), 11);
        assert!(!registry_v2::on_ace_decryption_request(
            b"premium-1", @0xcafe, string::utf8(b"https://evil.example"),
        ), 12);

        registry_v2::purchase_report(&buyer, @shelby_registry, string::utf8(b"premium-1"));
        assert!(registry_v2::on_ace_decryption_request(
            b"premium-1", @0xbeef, string::utf8(b"https://shelby-hub-iota.vercel.app"),
        ), 13);

        coin::destroy_burn_cap(burn);
        coin::destroy_mint_cap(mint);
    }

    fun register_free(owner: &signer) {
        registry_v2::register_report(
            owner,
            @shelby_registry,
            string::utf8(b"report-1"),
            string::utf8(b"0xcafe/report.md"),
            string::utf8(b"testnet"),
            string::utf8(b"Report title"),
            string::utf8(b"Description"),
            string::utf8(b"Research"),
            string::utf8(b"free"),
            0,
            string::utf8(b"md"),
            vector[string::utf8(b"aptos")],
            string::utf8(b""),
            0,
        );
    }

    fun register_premium(owner: &signer) {
        registry_v2::register_report(
            owner, @shelby_registry, string::utf8(b"premium-1"), string::utf8(b"premium.enc"),
            string::utf8(b"testnet"), string::utf8(b"Premium"), string::utf8(b"Description"),
            string::utf8(b"Research"), string::utf8(b"premium"), 100,
            string::utf8(b"pdf"), vector[], string::utf8(b"sha256-value"), 1,
        );
    }
}
