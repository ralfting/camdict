const yargs = require("yargs");
const fetch = require("node-fetch");
const cheerio = require("cheerio");

require("yargs")
  .command({
    command: "dictionary [value]",
    aliases: ["d"],
    desc: "Brings the meaning of the word",
    handler: async (argv) => {
      try {
        const response = await fetch(
          `https://dictionary.cambridge.org/pt/dicionario/ingles/${argv.value}`
        );

        const $ = cheerio.load(await response.text());
        console.log(
          "Word: " + argv.value + " - " + $(".pos.dpos").first().text()
        );
        console.log($(".ddef_d").first().text());
        console.log("Examples");

        //$(".def-body.ddef_b").each((_idx, el) => console.log($(el).text()));
        $(".def-body.ddef_b")
          .first()
          .find(".examp")
          .each((_idx, el) => console.log("- " + $(el).text().trim()));
        //$(".ddef_d").each((_idx, el) => console.log($(el).text()));

        //Object.keys($(".ddef_d")).forEach((text) => {
        //console.log($[text]);
        //});
      } catch (error) {
        console.error(error);
      }
    },
  })
  .demandCommand(1, "You need at least one command before moving on")
  .help().argv;
