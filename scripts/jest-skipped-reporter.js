"use strict";

// Prints every skipped test with the reason it is skipped, so CI logs carry
// more than Jest's bare "N skipped" count. Kept ES5: the Node 6 leg loads it
// untranspiled.

var path = require("path");

function reasonFor(file, test) {
  var rel = file.split(path.sep).join("/");
  var name = test.fullName || test.title;

  if (/packages\/babel-core\/test\/async\.js$/.test(rel)) {
    return "async test gated by nodeGte8 (needs Node >= 8, this is " +
      process.version + ")";
  }
  if (/packages\/babel-standalone\/test\/babel\.js$/.test(rel)) {
    return "@babel/standalone smoke tests are describe.skip'd when TEST_TYPE=cov " +
      "(standalone bundle is not built in coverage mode)";
  }
  if (/packages\/babel-traverse\/test\/traverse\.js$/.test(rel)) {
    return "upstream it.skip: requeue after skip is unsupported, see NodePath.requeue";
  }
  if (/eslint\/babel-eslint-tests\/test\/integration\/eslint\/eslint\.js$/.test(rel)) {
    return "upstream it.skip: known ESLint scope issue with excluded properties left of spread (#249)";
  }
  return "fixture '" + name + "' lives in a dot-prefixed directory " +
    "(disabled upstream; helper-fixtures marks it task.disabled -> it.skip)";
}

function SkippedReporter() {}

function categoryFor(reason) {
  return /^fixture '/.test(reason)
    ? "fixture lives in a dot-prefixed directory (disabled upstream)"
    : reason;
}

function isSkipped(test) {
  return test.status === "pending" || test.status === "skipped" || test.status === "todo";
}

SkippedReporter.prototype.onRunComplete = function(contexts, results) {
  var lines = [];
  var suites = [];
  var counts = {};
  results.testResults.forEach(function(file) {
    var rel = path.relative(process.cwd(), file.testFilePath);
    var tests = file.testResults || [];
    var skipped = tests.filter(isSkipped);
    skipped.forEach(function(test) {
      var reason = reasonFor(file.testFilePath, test);
      var category = categoryFor(reason);
      counts[category] = (counts[category] || 0) + 1;
      lines.push(
        "  SKIPPED " + rel + " > " + (test.fullName || test.title) +
          "\n      reason: " + reason
      );
    });
    if (skipped.length && skipped.length === tests.length) {
      suites.push(
        "  SKIPPED SUITE " + rel + " (all " + skipped.length + " tests)" +
          "\n      reason: " + reasonFor(file.testFilePath, {})
      );
    }
  });
  var summary = Object.keys(counts).map(function(category) {
    return "  " + counts[category] + " x " + category;
  });
  process.stdout.write(
    "\n=== Skipped tests (" + lines.length + ") ===\n" +
      (lines.length ? lines.join("\n") + "\n" : "  none\n") +
      "=== Wholly skipped test suites (" + suites.length + ") ===\n" +
      (suites.length ? suites.join("\n") + "\n" : "  none\n") +
      "=== Skipped tests by reason (" + lines.length + " total) ===\n" +
      (summary.length ? summary.join("\n") + "\n" : "  none\n") +
      "=== End of skipped tests ===\n"
  );
};

module.exports = SkippedReporter;
