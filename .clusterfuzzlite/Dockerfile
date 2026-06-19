FROM gcr.io/oss-fuzz-base/base-builder-rust
COPY . $SRC/crytotool
WORKDIR $SRC/crytotool/crypto-core
RUN cargo install cargo-fuzz --locked --version 0.13.2
RUN cargo fuzz build
RUN mkdir -p $OUT && \
    cp fuzz/target/x86_64-unknown-linux-gnu/release/aes_gcm_roundtrip $OUT/ && \
    cp fuzz/target/x86_64-unknown-linux-gnu/release/base64_roundtrip $OUT/
