const test = require("node:test");
const assert = require("node:assert/strict");
const { runCli } = require("./support/run-cli");

const failures = [
  {
    when: "the dictionary takes too long",
    network: "timeout",
    message: /^Error: The dictionary service took too long to respond\./m,
  },
  {
    when: "the network is unreachable",
    network: "offline",
    message: /^Error: Could not reach the dictionary service\. Check your connection/m,
  },
  {
    when: "the dictionary answers HTTP 500",
    network: "dictionary-500",
    message: /^Error: The dictionary service is unavailable right now \(HTTP 500\)\./m,
  },
];

for (const { when, network, message } of failures) {
  test(`exits 1 with an explanation when ${when}`, () => {
    const { stdout, stderr, code } = runCli(["pizza"], { env: { FAKE_NETWORK: network } });

    assert.equal(code, 1);
    assert.equal(stdout, "");
    assert.match(stderr, message);
  });
}

test("asks for a word and shows usage when none is given", () => {
  const { stderr, code, requests } = runCli([]);

  assert.equal(code, 1);
  assert.match(stderr, /^Error: Provide a word or phrase to look up\.$/m);
  assert.match(stderr, /--limit, -n/);
  assert.equal(requests.length, 0);
});
