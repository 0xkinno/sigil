//! Sigil — Telegraph Protocol Scoring Module for ONCHAIN_TX_LOOKUP
//!
//! Track 2 Champion-grade deterministic scoring module:
//! - Freestanding wasm32-unknown-unknown with ZERO host imports
//! - Strict exact-matching on deterministic ground truths (tx_hash, chain, status, addresses, block_number, value)
//! - Position-aware address & canonical field checking (catches from/to swap and near-miss block attacks)
//! - Reward completeness: rewards answers that accurately report finality_tier & transfer effects
//! - Penalize fabrication: heavily penalizes false finality claims (e.g. claiming l1_finalized on sequencer_soft)
//! - Natural language & canonical format dual-mode parsing
//! - Exported surface: alloc, dealloc, rank_answer, breakdown_answer, memory

use std::alloc::{alloc as raw_alloc, dealloc as raw_dealloc, Layout};

#[used]
#[no_mangle]
pub static SIGIL_BUILD_TAG: [u8; 8] = *b"sigil02\0";

static mut BREAKDOWN_BUF: [f32; 5] = [0.0; 5];

#[no_mangle]
pub extern "C" fn alloc(size: i32) -> i32 {
    let size = if size <= 0 { 1 } else { size as usize };
    let layout = match Layout::from_size_align(size, 1) {
        Ok(l) => l,
        Err(_) => return 0,
    };
    unsafe { raw_alloc(layout) as i32 }
}

#[no_mangle]
pub extern "C" fn dealloc(ptr: i32, size: i32) {
    if ptr == 0 || size <= 0 {
        return;
    }
    if let Ok(layout) = Layout::from_size_align(size as usize, 1) {
        unsafe { raw_dealloc(ptr as *mut u8, layout) };
    }
}

unsafe fn read_str(ptr: i32, len: i32) -> String {
    if ptr == 0 || len <= 0 {
        return String::new();
    }
    let slice = unsafe { core::slice::from_raw_parts(ptr as *const u8, len as usize) };
    String::from_utf8_lossy(slice).into_owned()
}

#[no_mangle]
pub extern "C" fn breakdown_answer(
    q_ptr: i32, q_len: i32,
    gt_ptr: i32, gt_len: i32,
    ma_ptr: i32, ma_len: i32,
) -> i32 {
    let score = rank_answer(q_ptr, q_len, gt_ptr, gt_len, ma_ptr, ma_len);
    unsafe {
        BREAKDOWN_BUF[0] = score; // relevance
        BREAKDOWN_BUF[1] = score; // correctness
        BREAKDOWN_BUF[2] = score; // lexical
        BREAKDOWN_BUF[3] = 1.0;   // length_quality
        BREAKDOWN_BUF[4] = score; // composite
        core::ptr::addr_of!(BREAKDOWN_BUF) as *const f32 as i32
    }
}

#[no_mangle]
pub extern "C" fn rank_answer(
    q_ptr: i32, q_len: i32,
    gt_ptr: i32, gt_len: i32,
    ma_ptr: i32, ma_len: i32,
) -> f32 {
    let q = unsafe { read_str(q_ptr, q_len) };
    let gt = unsafe { read_str(gt_ptr, gt_len) };
    let ma = unsafe { read_str(ma_ptr, ma_len) };

    score_internal(&q, &gt, &ma)
}

fn score_internal(q: &str, gt: &str, ma: &str) -> f32 {
    let ma_trim = ma.trim();
    if ma_trim.is_empty() {
        return 0.0;
    }

    let gt_trim = gt.trim();
    if gt_trim.is_empty() {
        return 0.0;
    }

    // Exact verbatim self-match is 1.0
    if ma_trim == gt_trim {
        return 1.0;
    }

    let q_lower = q.to_ascii_lowercase();
    let gt_lower = gt_trim.to_ascii_lowercase();
    let ma_lower = ma_trim.to_ascii_lowercase();

    // 1. Check if ground truth is a pipe-delimited canonical string:
    // chain|tx_hash|status|from|to|value_wei|block_number
    let gt_parts: Vec<&str> = gt_lower.split('|').collect();
    let ma_parts: Vec<&str> = ma_lower.split('|').collect();

    if gt_parts.len() == 7 && ma_parts.len() == 7 {
        // Direct canonical comparison mode
        let chain_match = gt_parts[0] == ma_parts[0];
        let hash_match = gt_parts[1] == ma_parts[1];
        let status_match = gt_parts[2] == ma_parts[2];
        let from_match = gt_parts[3] == ma_parts[3];
        let to_match = gt_parts[4] == ma_parts[4];
        let val_match = gt_parts[5] == ma_parts[5];
        let block_match = gt_parts[6] == ma_parts[6];

        if !status_match {
            return 0.02;
        }
        if !hash_match {
            return 0.05;
        }

        // Swapped from/to attack detection:
        if !from_match && !to_match && gt_parts[3] == ma_parts[4] && gt_parts[4] == ma_parts[3] {
            return 0.15;
        }

        // Block number mismatch / near-miss
        if !block_match && !gt_parts[6].is_empty() {
            return 0.20;
        }

        if !val_match && !gt_parts[5].is_empty() {
            return 0.30;
        }

        if chain_match && hash_match && status_match && from_match && to_match && val_match && block_match {
            return 1.0;
        }
    }

    // 2. Status Contradiction / Polarity Detection
    let gt_status = extract_status(&gt_lower);
    let ma_status = extract_status(&ma_lower);

    if let Some(ref gts) = gt_status {
        if let Some(ref mas) = ma_status {
            if gts != mas {
                // Severe penalty for wrong status (e.g. reverted vs confirmed, or not_found vs confirmed)
                return 0.02;
            }
        } else {
            // Answer missed or failed to state status clearly
            if gts != "unknown" {
                return 0.10;
            }
        }
    }

    // 3. Hash & Address Extraction
    let gt_hashes = extract_hex_tokens(&gt_lower, 64);
    let ma_hashes = extract_hex_tokens(&ma_lower, 64);

    let mut hash_score = 1.0f32;
    if !gt_hashes.is_empty() {
        let mut matched = 0;
        for gth in &gt_hashes {
            if ma_hashes.contains(gth) || ma_lower.contains(gth) {
                matched += 1;
            } else if q_lower.contains(gth) {
                // Tx hash was in question, answer omitted verbatim hash but gave rich summary
                matched += 1;
            }
        }
        if matched == 0 {
            return 0.05;
        }
        hash_score = matched as f32 / gt_hashes.len() as f32;
    }

    let gt_addrs = extract_hex_tokens(&gt_lower, 40);
    let ma_addrs = extract_hex_tokens(&ma_lower, 40);

    let mut addr_score = 1.0f32;
    if gt_addrs.len() >= 2 {
        let from_addr = &gt_addrs[0];
        let to_addr = &gt_addrs[1];

        let ma_has_from = ma_addrs.contains(from_addr) || ma_lower.contains(from_addr);
        let ma_has_to = ma_addrs.contains(to_addr) || ma_lower.contains(to_addr);

        // Check if swapped
        let from_pos = ma_lower.find(from_addr);
        let to_pos = ma_lower.find(to_addr);
        if let (Some(fp), Some(tp)) = (from_pos, to_pos) {
            // If prose explicitly says "to from_addr" or "from to_addr"
            let to_wrong = ma_lower.contains(&format!("to {}", from_addr)) || ma_lower.contains(&format!("to: {}", from_addr));
            let from_wrong = ma_lower.contains(&format!("from {}", to_addr)) || ma_lower.contains(&format!("from: {}", to_addr));
            if to_wrong || from_wrong || (gt_parts.len() == 7 && tp < fp) {
                return 0.15;
            }
        }

        if ma_has_from && ma_has_to {
            addr_score = 1.0;
        } else if ma_has_from || ma_has_to {
            addr_score = 0.5;
        } else {
            addr_score = 0.1;
        }
    } else if !gt_addrs.is_empty() {
        let mut matched = 0;
        for gta in &gt_addrs {
            if ma_addrs.contains(gta) || ma_lower.contains(gta) {
                matched += 1;
            }
        }
        addr_score = matched as f32 / gt_addrs.len() as f32;
    }

    // 4. Integer / Block Number / Value Recall
    let gt_ints = extract_integers(&gt_lower);
    let ma_ints = extract_integers(&ma_lower);

    let mut int_score = 1.0f32;
    let mut near_miss_penalty = 1.0f32;

    if !gt_ints.is_empty() {
        let mut matched = 0;
        for gti in &gt_ints {
            if ma_ints.contains(gti) {
                matched += 1;
            } else {
                // Check if there is an off-by-one or near-miss integer
                for mai in &ma_ints {
                    if (gti.len() == mai.len() && gti.len() >= 4) || (gti.len() >= 6 && mai.len() >= 6) {
                        let diff = digit_diff(gti, mai);
                        if diff <= 2 {
                            near_miss_penalty *= 0.25; // actively penalized for near-miss wrong data
                        }
                    }
                }
            }
        }
        int_score = (matched as f32 / gt_ints.len() as f32) * near_miss_penalty;
    }

    // 5. Finality Tier Scoring (Completeness vs Fabrication)
    let gt_finality = extract_finality(&gt_lower);
    let ma_finality = extract_finality(&ma_lower);

    let mut finality_multiplier = 1.0f32;
    if let Some(ref gtf) = gt_finality {
        if let Some(ref maf) = ma_finality {
            if gtf == maf {
                finality_multiplier = 1.05;
            } else if maf == "l1_finalized" && (gtf == "sequencer_soft" || gtf == "unknown") {
                finality_multiplier = 0.30;
            } else if maf == "unknown" && gtf == "sequencer_soft" {
                finality_multiplier = 0.95;
            } else {
                finality_multiplier = 0.85;
            }
        }
    } else if let Some(ref maf) = ma_finality {
        if maf == "l1_finalized" || maf == "l1_posted" || maf == "native_finalized" {
            finality_multiplier = 1.02;
        }
    }

    // 6. Lexical & Trigram Overlap
    let dice = trigram_dice(&gt_lower, &ma_lower);

    // Weighted composite
    let mut raw_score = 0.35 * hash_score + 0.25 * addr_score + 0.25 * int_score + 0.15 * dice;
    raw_score *= finality_multiplier;

    // Contrast curve: s^2 / (s^2 + (1-s)^2)
    let clamped = raw_score.clamp(0.0, 0.999);
    let s2 = clamped * clamped;
    let inv = (1.0 - clamped) * (1.0 - clamped);
    let contrasted = if (s2 + inv) > 0.0 { s2 / (s2 + inv) } else { 0.0 };

    contrasted.clamp(0.0, 1.0)
}

fn extract_status(s: &str) -> Option<String> {
    if s.contains("confirmed") || s.contains("succeeded") || s.contains("success") || s.contains("mined") {
        Some("confirmed".to_string())
    } else if s.contains("reverted") || s.contains("failed") || s.contains("revert") || s.contains("failure") {
        Some("reverted".to_string())
    } else if s.contains("pending") || s.contains("unmined") || s.contains("in_mempool") {
        Some("pending".to_string())
    } else if s.contains("not_found") || s.contains("not found") || s.contains("nonexistent") {
        Some("not_found".to_string())
    } else {
        None
    }
}

fn extract_finality(s: &str) -> Option<String> {
    if s.contains("l1_finalized") || s.contains("finalized") {
        Some("l1_finalized".to_string())
    } else if s.contains("l1_posted") || s.contains("safe") {
        Some("l1_posted".to_string())
    } else if s.contains("sequencer_soft") || s.contains("soft") {
        Some("sequencer_soft".to_string())
    } else if s.contains("native_finalized") {
        Some("native_finalized".to_string())
    } else if s.contains("unknown") {
        Some("unknown".to_string())
    } else {
        None
    }
}

fn extract_hex_tokens(s: &str, exact_len: usize) -> Vec<String> {
    let mut results = Vec::new();
    let bytes = s.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if i + 2 <= bytes.len() && bytes[i] == b'0' && bytes[i + 1] == b'x' {
            let start = i + 2;
            let mut end = start;
            while end < bytes.len() && ((bytes[end] >= b'0' && bytes[end] <= b'9') || (bytes[end] >= b'a' && bytes[end] <= b'f')) {
                end += 1;
            }
            let hex_len = end - start;
            if hex_len == exact_len {
                results.push(s[i..end].to_string());
            }
            i = end;
        } else {
            i += 1;
        }
    }
    results
}

fn extract_integers(s: &str) -> Vec<String> {
    let mut results = Vec::new();
    let bytes = s.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] >= b'0' && bytes[i] <= b'9' {
            let start = i;
            while i < bytes.len() && bytes[i] >= b'0' && bytes[i] <= b'9' {
                i += 1;
            }
            let num_str = &s[start..i];
            if num_str.len() >= 3 {
                results.push(num_str.to_string());
            }
        } else {
            i += 1;
        }
    }
    results
}

fn digit_diff(a: &str, b: &str) -> usize {
    let mut diff = 0;
    let abytes = a.as_bytes();
    let bbytes = b.as_bytes();
    let min_len = abytes.len().min(bbytes.len());
    for i in 0..min_len {
        if abytes[i] != bbytes[i] {
            diff += 1;
        }
    }
    diff += (abytes.len() as isize - bbytes.len() as isize).unsigned_abs();
    diff
}

fn trigram_dice(a: &str, b: &str) -> f32 {
    let a_trigrams = get_trigrams(a);
    let b_trigrams = get_trigrams(b);
    if a_trigrams.is_empty() && b_trigrams.is_empty() {
        return 1.0;
    }
    if a_trigrams.is_empty() || b_trigrams.is_empty() {
        return 0.0;
    }

    let mut intersection = 0;
    for tri in &a_trigrams {
        if b_trigrams.contains(tri) {
            intersection += 1;
        }
    }

    (2.0 * intersection as f32) / (a_trigrams.len() + b_trigrams.len()) as f32
}

fn get_trigrams(s: &str) -> Vec<String> {
    let chars: Vec<char> = s.chars().collect();
    if chars.len() < 3 {
        return Vec::new();
    }
    let mut trigrams = Vec::with_capacity(chars.len() - 2);
    for i in 0..=chars.len() - 3 {
        let tri: String = chars[i..i + 3].iter().collect();
        trigrams.push(tri);
    }
    trigrams
}
