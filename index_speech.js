const puppeteer = require('puppeteer-core');

const customArgs = [
  "--use-fake-ui-for-media-stream",
  '--window-size=0,0', // Launch baby window for fun.
  '--window-position=0,0',
]

if (process.env['PROXY_SERVER']) {
  customArgs.push(`--proxy-server=${process.env['PROXY_SERVER']}`);
}

puppeteer.launch({executablePath: process.env['CHROME_PATH'] ? process.env['CHROME_PATH'] : null,
  headless: false,
  // devtools: true,
  args: customArgs,
  ignoreDefaultArgs: ['--mute-audio'],
}).then(async browser => {
    const page = await browser.newPage();

    await page.exposeFunction("handleRecognized", text => {
      console.log(text);
    });

    await page.evaluate(async () => {
      return new Promise((resolve, reject) => {
        var recognition = new webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.lang = 'ja';
        recognition.onresult = function(event) {
          console.log(event);
          for (var i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              window.handleRecognized(event.results[i][0].transcript);
            }
          }
        };
        recognition.onend = function(event) {
          console.log('onend', event);
          window.handleRecognized("end");
          resolve();
        };
        recognition.onstart = function(event) {
          console.log('onstart', event);
          window.handleRecognized("onstarted");
        };
        recognition.start();
        window.handleRecognized("recognition.started");
        console.log('hoge');
      });
    });
    await browser.close();
});
