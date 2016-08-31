const express = require('express');
const fs = require('fs');
const parse = require('url').parse;
const cache = {};
const year = process.env.YEAR || 2016;
const app = express();
const vhost = require('vhost');
const port = process.env.PORT || 8000;
const root = process.env.NODE_ENV==='production' ? '.ffconf.org' : '.ffconf.dev'; //'.ffconf.org';
const years = {
  2011: require('@remy/ffconf2011'),
  2012: require('@remy/ffconf2012'),
  2013: require('@remy/ffconf2013'),
  2014: require('@remy/ffconf2014'),
  2015: require('@remy/ffconf2015'),
  2016: require('@remy/ffconf2016'),
};

app.disable('x-powered-by');

Object.keys(years).forEach(year => {
  console.log(`registering http://${year}${root}:${port}`);
  app.use(vhost(year + root, years[year]));
});

// middleware via vhost to listen to each year

app.get('/*', (req, res) => {
  const url = parse(req.url);
  const file = url.pathname.replace(/\./g, '').replace(/^\//, ''); // poor man's sanity

  // keeps our dyno awake via the main site
  if (url === 'ping') {
    return res.status(204).end();
  }

  if (cache[file] === undefined) {
    // one off readsync - quick and dirty
    try {
      cache[file] = fs.readFileSync('./redirects/' + file, 'utf8').split('\n')[0].trim();
    } catch (e) {
      cache[file] = null; // don't bother looking again until restart
      console.warn('failed redirect on ' + req.url);
    }
  }

  if (cache[file]) {
    return res.redirect(302, cache[file]);
  }

  res.redirect(302, 'https://' + year + root + req.url);
});

app.listen(port);
