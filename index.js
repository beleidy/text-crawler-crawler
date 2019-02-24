const elasticsearch = require("elasticsearch");
const HCCrawler = require("headless-chrome-crawler");
const RedisCache = require("headless-chrome-crawler/cache/redis");
const uuidv4 = require("uuid/v4");

const REDIS_HOST = "localhost";
const REDIS_PORT = 6379;
const ES_PORT = 9200;
const ES_HOST = `localhost:${ES_PORT}`;

(async function main() {
  const cache = new RedisCache({
    host: REDIS_HOST,
    port: REDIS_PORT
  });

  // Create ES client
  const esClient = new elasticsearch.Client({
    host: ES_HOST,
    log: "trace"
  });

  // Check ES is alive
  try {
    await esClient.ping({ requestTimeout: 30000 });
  } catch (err) {
    console.error("ES error: ", err);
  }

  const crawler = await HCCrawler.launch({
    args: ["--disable-web-security", "--no-sandbox"],
    persistCache: true,
    cache,
    preRequest: options => {
      if (options.url.match(/\.(css|jpg|pdf|docx|js|png|ico)/i)) {
        console.log(options.url, "--wrong-file-type --skipped");
        return false;
      } else {
        console.log(options.url, "Requesting");
        return true;
      }
    },
    onSuccess: result => {
      console.log(result.response.url, `Status ${result.response.status}`);
      esClient.index({
        index: "sites",
        type: "_doc",
        body: {
          domain: new URL(result.options.url).hostname,
          uri: result.response.url,
          siteText: result.result,
          lastUpdated: new Date(Date.now()).toISOString()
        }
      });
    }
  });
})();
