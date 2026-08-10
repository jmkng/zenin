use bindgen::Builder;
use cc::Build;
use std::env::var;
use std::path::PathBuf;

const MEDIC_INCLUDE_PATH: &str = "vendor/medic/include";

fn build_medic(out_path: &PathBuf) {
    let mut builder = Builder::default().clang_arg(format!("-I{}", MEDIC_INCLUDE_PATH));

    let headers = ["cpu.h"];
    for header in headers {
        builder = builder.header(format!("{}/{}", MEDIC_INCLUDE_PATH, header));
    }

    builder
        .generate()
        .expect("failed to generate bindings")
        .write_to_file(out_path.join("medic.rs"))
        .expect("failed to write bindings");

    let src_files = ["cpu.c"];
    let mut cc_builder = Build::new();

    for file in src_files {
        cc_builder.file(format!("vendor/medic/src/{}", file));
    }

    cc_builder.include(MEDIC_INCLUDE_PATH).compile("medic");
}

fn main() {
    println!("cargo:rerun-if-changed=medic");
    let out_path = PathBuf::from(var("OUT_DIR").unwrap());
    build_medic(&out_path);
}
