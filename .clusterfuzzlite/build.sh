#!/bin/bash -eu
cd $SRC/crytotool/crypto-core
cargo fuzz build
ls -la fuzz/target/x86_64-unknown-linux-gnu/release/
