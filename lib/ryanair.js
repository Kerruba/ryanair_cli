#!/usr/bin/env node --harmony
// var co = require("co");
// var prompt = require("co-prompt");
const cli = require("./cli");
const utilities = require("./utilities");
const program = require("commander");

// Read arguments
program
  .command("fares <from> <to> <date>", { isDefault: true })
  .option(
    "-a, --arrival <filter>",
    "Filter flights arrival time. Accepts format [<=>]{time}",
    utilities.timeFilter
  )
  .option(
    "-d, --departure <filter>",
    "Filter flight departure time. Accepts format [<=>]{time}",
    utilities.timeFilter
  )
  .option(
    "-p, --price <filter>",
    "Filter flight price. Accepts format [<=>]{price}",
    utilities.priceFilter
  )
  .option(
    "-f, --flexdays <days>",
    "Define flexibily days for flight search",
    parseInt
  )
  .option("-o, --output <path>", "Append the results to a file")
  .option(
    "--sort [method]",
    "Sort results (date|price)",
    /^(date|price)/,
    "date"
  )
  .option("--order [order]", "Sorting order (asc|desc)", /^(asc|desc)/, "asc")
  .action(cli.fares);

program
  .command("routes")
  .description("Get routes for a specific airport")
  .option(
	"--from <from>",
	"Define the leaving country, city or airport",
	utilities.routeFilter
  )
  .option(
	"--to <to>",
	"Define the destination country, city or airport",
	utilities.routeFilter
  )
  .action(cli.routes);

program.parse(process.argv);
