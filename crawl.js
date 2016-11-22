const rp = require('request-promise');
const cheerio = require('cheerio');
const co = require('co');
const fs = require('fs');

co(function*() {
  console.log("Getting categories...");
  let categories = yield getCategories();
  for (let category of categories) {
    console.log("Getting talks for", category.name);
    category.talks = yield getTalks(category);
  }
  yield writeFilePromise('talks.json', JSON.stringify(categories, null, 2), {});
  console.log("Done!");
}).catch(err => {
  throw err;
});

function getCategories() {
  const menuStarts = 12;
  const options = {
    uri: "http://www.jkrishnamurti.org/krishnamurti-teachings/audio.php",
    transform: (body) => cheerio.load(body)
  };
  return rp(options)
    .then($ => {
      let categories = [];
      $("#result-filter")
        .find("li")
        .each((idx, li) => {
          if (idx < menuStarts) return;
          let href = $(li).find("a").attr("href");
          let name = $(li).text();
          categories.push({
            name,
            href: options.uri + href
          });
        });
      return categories;
    });
}

function getTalks(category) {
  const url = "http://www.jkrishnamurti.org/krishnamurti-teachings/";
  const options = {
    uri: category.href,
    transform: (body) => cheerio.load(body)
  };

  return rp(options)
    .then($ => {
      let pages = $(".show_num").find("a").length / 2 || 1;
      let pagesProm = [];
      for (let page = 1; page <= pages; page++) {
        const pageOptions = Object.assign(
          {},
          options,
          { uri: `${options.uri}&page=${page}` }
        );
        pagesProm.push(rp(pageOptions));
      }
      return Promise.all(pagesProm);
    })
    .then(pages => {
      let talks = [];
      pages.forEach($ => {
        $(".photo").each((idx, div) => {
          let $div = $(div);
          let $a = $div.find("a");
          talks.push({
            title: $a.text().split("\t").splice(-1)[0],
            description: $div.find("h5").text().trim(),
            href: url + $a.attr("href")
          });
        });
      });
      return talks;
    });
}

function writeFilePromise(name, data, options) {
  return new Promise((resolve, reject) => {
    fs.writeFile(name, data, options, (err) => {
      if (err) reject(err);
      resolve(true);
    });
  });
}


