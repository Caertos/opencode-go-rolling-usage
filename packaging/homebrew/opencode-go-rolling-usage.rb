# Homebrew formula for opencode-go-rolling-usage.
#
# This file is a template: before publishing, replace the `sha256` placeholder
# with the real checksum of the npm tarball:
#
#   curl -sL https://registry.npmjs.org/opencode-go-rolling-usage/-/opencode-go-rolling-usage-0.1.0.tgz \
#     | shasum -a 256
#
# Then copy it into a tap as `Formula/opencode-go-rolling-usage.rb`
# (e.g. github.com/Caertos/homebrew-tap) and install with:
#
#   brew install caertos/tap/opencode-go-rolling-usage
#
class OpencodeGoRollingUsage < Formula
  desc "OpenCode Go rolling/weekly/monthly quota in your terminal and TUI sidebar"
  homepage "https://github.com/Caertos/opencode-go-rolling-usage"
  url "https://registry.npmjs.org/opencode-go-rolling-usage/-/opencode-go-rolling-usage-0.1.0.tgz"
  sha256 "REPLACE_WITH_TARBALL_SHA256"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink libexec.glob("bin/*")
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/ogr --version")
  end
end
