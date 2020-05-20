const puppeteer = require("puppeteer-core");

const customArgs = [
  "--use-fake-ui-for-media-stream",
  "--window-size=0,0", // Launch baby window for fun.
  "--window-position=0,0",
];

if (process.env["PROXY_SERVER"]) {
  customArgs.push(`--proxy-server=${process.env["PROXY_SERVER"]}`);
}
const OBSWebSocket = require("obs-websocket-js");

const obs = new OBSWebSocket();

obs.connect({ address: "localhost:4444" }).then(() => {
  console.log("opened");
  obs.sendCallback(
    "SetTextGDIPlusProperties",
    {
      source: "jimaku_fixed",
      text: "",
    },
    console.log
  );
  obs.sendCallback(
    "SetTextGDIPlusProperties",
    {
      source: "jimaku_not_fixed",
      text: "",
    },
    console.log
  );
});

puppeteer
  .launch({
    executablePath: process.env["CHROME_PATH"]
      ? process.env["CHROME_PATH"]
      : null,
    headless: false,
    devtools: true,
    args: customArgs,
    ignoreDefaultArgs: ["--mute-audio"],
  })
  .then(async (browser) => {
    const page = await browser.newPage();

    await page.exposeFunction("logging", (text) => {
      console.log(text);
    });

    await page.exposeFunction("handleRecognized", (text) => {
      obs.sendCallback(
        "SetTextGDIPlusProperties",
        {
          source: "jimaku_not_fixed",
          text: text,
        },
        (prop) => {
          console.log(text);
        }
      );
    });

    await page.exposeFunction("handleRecognizedFixed", (text) => {
      obs.sendCallback(
        "SetTextGDIPlusProperties",
        {
          source: "jimaku_fixed",
          text: text,
        },
        (prop) => {
          console.log("fixed", text);
        }
      );
      obs.sendCallback(
        "SetTextGDIPlusProperties",
        {
          source: "jimaku_not_fixed",
          text: "",
        },
        () => {}
      );
    });

    await page.evaluate(async () => {
      return new Promise((resolve, reject) => {
        var recognition = new webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.lang = "ja";
        recognition.onresult = function (event) {
          console.log(event);
          for (var i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              window.handleRecognizedFixed(event.results[i][0].transcript);
            } else {
              window.handleRecognized(event.results[i][0].transcript);
            }
          }
        };
        recognition.onend = function (event) {
          console.log("onend", event);
          window.logging("end");
          resolve();
        };
        recognition.onstart = function (event) {
          console.log("onstart", event);
          window.logging("onstarted");
        };
        recognition.start();
        window.logging("recognition.started");
        console.log("hoge");
      });
    });
    await browser.close();
  });
