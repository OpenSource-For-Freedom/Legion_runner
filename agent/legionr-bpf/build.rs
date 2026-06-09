// Compiles the eBPF crate (legionr-bpf-ebpf) to BPF bytecode at build time and
// makes it available to the userspace binary via OUT_DIR. Requires a nightly
// toolchain with rust-src and `bpf-linker` on PATH.

use aya_build::cargo_metadata;

fn main() {
    let cargo_metadata::Metadata { packages, .. } = cargo_metadata::MetadataCommand::new()
        .no_deps()
        .exec()
        .expect("cargo metadata");
    let ebpf = packages
        .into_iter()
        .find(|p| p.name == "legionr-bpf-ebpf")
        .expect("legionr-bpf-ebpf package present");
    aya_build::build_ebpf([ebpf]).expect("build eBPF program");
}
