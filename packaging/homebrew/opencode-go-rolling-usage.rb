# Homebrew formula for opencode-go-rolling-usage.
#
# The url + sha256 below are updated automatically by the
# "Bump Homebrew formula" workflow in the main repository
# (github.com/Caertos/opencode-go-rolling-usage) after each npm release.
class OpencodeGoRollingUsage < Formula
  desc "OpenCode Go rolling/weekly/monthly quota in your terminal and TUI sidebar"
  homepage "https://github.com/Caertos/opencode-go-rolling-usage"
  url "https://registry.npmjs.org/opencode-go-rolling-usage/-/opencode-go-rolling-usage-0.1.1.tgz"
  sha256 "5286a18b595193200a047feedc7d34c533caa5a8aee64cdc63aba5a1b1f90339"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink libexec.glob("bin/*")
  end

  def post_install
    # Register the TUI plugin in the user's OpenCode tui.json so that opening
    # OpenCode is enough after installing. Best-effort; never fail the install.
    script = libexec/"lib/node_modules/opencode-go-rolling-usage/scripts/postinstall.mjs"
    return unless script.exist?

    node = Formula["node"].opt_bin/"node"
    system({ "OPENCODE_GO_ROLLING_USAGE_SETUP" => "1" }, node, script.to_s)
  rescue StandardError
    nil
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/ogr --version")
  end
end
