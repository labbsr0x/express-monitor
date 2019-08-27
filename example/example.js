const express = require("express");
const Monitor = require('../lib/monitor')
const app = express();

Monitor.init(app, true, [0.1, 1]);

app.get("/", (req, res, next) => {
    res.send({"ok": true});
})

app.listen(3000,  () => {
    console.log("Started!")
})