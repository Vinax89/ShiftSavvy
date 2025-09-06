{ pkgs ? import <nixpkgs> { } }:

pkgs.mkShell {
  nativeBuildInputs = with pkgs; [
    # …your existing tools
    nodejs_18
    corepack_18
  ];
}
