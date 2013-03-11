// URL variables
var visitedUrls = [], pendingUrls = [];

// Create instances
var casper = require('casper').create({ /*verbose: true, logLevel: 'debug'*/ });
var utils = require('utils')
var helpers = require('./helpers')

// Set the start URL
var startUrl = casper.cli.args[0];

// Spider from the given URL
function spider(url) {

	if (url.indexOf(startUrl) === -1) {
		return false;
	}

	// Add the URL to the visited stack
	visitedUrls.push(url);

	// Open the URL
	casper.open(url).then(function() {

		// Set the status style based on server status code
		var status = this.status().currentHTTPStatus;
		switch(status) {
			case 200: var statusStyle = { fg: 'green', bold: true }; break;
			case 404: case 503: var statusStyle = { fg: 'red', bold: true }; break;
			case 301: var statusStyle = { fg: 'blue', bold: true }; break;
			 default: var statusStyle = { fg: 'magenta', bold: true }; break;
		}

		// Display the spidered URL and status
		this.echo(this.colorizer.format(status, statusStyle) + ' ' + url);

		// Find links present on this page
		var links = this.evaluate(function() {
			var links = [];
			Array.prototype.forEach.call(__utils__.findAll('a'), function(e) {
				links.push(e.getAttribute('href'));
			});
			return links;
		});

		// Add newly found URLs to the stack
		var baseUrl = this.getGlobal('location').origin;
		Array.prototype.forEach.call(links, function(link) {
			var newUrl = helpers.absoluteUri(baseUrl, link);
			if (pendingUrls.indexOf(newUrl) == -1 && visitedUrls.indexOf(newUrl) == -1) {
				//casper.echo(casper.colorizer.format('-> Pushed ' + newUrl + ' onto the stack', { fg: 'magenta' }));
				pendingUrls.push(newUrl);
			}
		});

		// If there are URLs to be processed
		if (pendingUrls.length > 0) {
			var nextUrl = pendingUrls.shift();
			//this.echo(this.colorizer.format('<- Popped ' + nextUrl + ' from the stack', { fg: 'blue' }));
			spider(nextUrl);
		}

	});

}

if (startUrl) {
	// Start spidering
	casper.start(startUrl, function() {
		spider(startUrl);
	});

	// Start the run
	casper.run();
} else {
	console.log("Usage: casperjs spider.js http://starturl.com");
	casper.exit();
}
