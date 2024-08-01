const express = require("express");
const path = require("path");
const { Telegraf } = require('telegraf')
const { message } = require('telegraf/filters')
const process = require('process');
const { MongoClient } = require('mongodb');
const cors = require('cors');
require('dotenv').config()
const TOKEN = process.env.BOT_TOKEN;
const client = new MongoClient(process.env.MONGODB_URI);
client.connect();
const app = express();
let corsOptions = {
   origin : ['http://localhost:57261', 'https://mstrhw.github.io'],
}
app.use(cors(corsOptions));
const bot = new Telegraf(TOKEN);


const port = 3000;
const gameName = process.env.GAME_NAME;
const queries = {};
// // server.use(express.static(path.join(__dirname, 'flappy_test')));
bot.start((ctx) => 	ctx.setChatMenuButton({
		text: "Play game",
		type: "web_app",
		web_app: { url: process.env.APP_ENDPOINT + "?user_id=" + ctx.from.id, },
	}),)
// bot.help((ctx) => ctx.reply('Send me a sticker'))
// bot.on(message('sticker'), (ctx) => ctx.reply('👍'))
// bot.hears('hi', (ctx) => ctx.reply('Hey there'))
// bot.launch()
bot.help((ctx) => ctx.reply(ctx.from.id, "Say /game if you want to play."));
// bot.on(message('start'), function (msg) {
//     bot.sendGame(msg.from.id, gameName)
// });

bot.on("callback_query", function (ctx) {
    console.log("user: " + ctx.from.id)
    console.log("query: " +  ctx.message.from.id)
    if (query.game_short_name !== gameName) {
        ctx.answerCbQuery(ctx.id, "Sorry, '" + ctx.game_short_name + "' is not available.");
    } else {
        queries[ctx.id] = query;
        let gameurl = process.env.APP_ENDPOINT;
        ctx.answerCbQuery({
            callback_query_id: ctx.id,
            url: process.env.APP_ENDPOINT + "?user_id=" + ctx.from.id,
        });
    }
});
bot.on("inline_query", function (iq) {
    bot.answerInlineQuery(iq.id, [{
        type: "game",
        id: "0",
        game_short_name: gameName
    }]);
});

bot.command("setmenu", ctx =>
	// sets Web App as the menu button for current chat
	ctx.setChatMenuButton({
		text: "Play",
		type: "web_app",
		web_app: { url: process.env.APP_ENDPOINT + "?user_id=" + ctx.from.id, },
	}),
);
bot.launch()


app.get("/get_user_info/:user_id", cors(corsOptions), async (req, res) => {
    console.log("/get_user_info " + req.params["user_id"]);
    var answer = "None";
    // console.log("here 1 ");
    var user_id = null;
    if ("user_id" in req.params){
        user_id = req.params["user_id"];
    }
    else{
        return "Set user_id";
    }

    const db = client.db("mydb");
    const collection = db.collection("users");
    var result = await collection.find({"user_id" : user_id}).toArray();
    if (result.length == 0)
    {
        const user = {user_id: user_id, onboarding: false, fraction: "NotSet"};
        result = await collection.insertOne(user);
        result = await collection.find({"user_id" : user_id}).toArray();
    }
    answer = result[0];
    // console.log("here" + answer);
    delete answer['_id'];
    res.send(answer);
});

app.get("/pass_onboarding/:user_id", async (req, res) => {
    console.log("/get_user_info " + req.params["user_id"]);

    var user_id = req.params["user_id"];

    const db = client.db("mydb");
    const collection = db.collection("users");

    const filter = { "user_id": user_id };
    const options = { upsert: false };
    const updateDoc = {
      $set: {
        "onboarding": true
      },
    };
    // Update the first document that matches the filter
    const result = await collection.updateOne(filter, updateDoc, options);
    // console.log("here 1 " + result);
    res.send(result);
});

app.get("/choose_fraction/:user_id/:fraction", cors(corsOptions), async (req, res) => {
    console.log("/choose_fraction " + req.params["user_id"] + " " + req.params["user_id"]);
    var user_id = req.params["user_id"];
    var fraction = req.params["fraction"];
    const db = client.db("mydb");
    const collection = db.collection("users");

    const filter = { "user_id": user_id };
    const options = { upsert: false };
    const updateDoc = {
      $set: {
        "fraction": fraction
      },
    };
    // Update the first document that matches the filter
    const result = await collection.updateOne(filter, updateDoc, options);
    // console.log("here 2 " + result);
    res.send(result);
});

app.get("/get_tasks/:user_id", async (req, res) => {
    var user_id = req.params["user_id"];
    const db = client.db("mydb");
    const collection = db.collection("tasks");

    var result = await collection.find().toArray();
    // if (result.length == 0)
    // {
    //     const user = {user_id: user_id, onboarding: false, fraction: "NotSet"};
    //     result = await collection.insertOne(user);
    //     result = await collection.find({"user_id" : user_id}).toArray();
    // }

    // var answer = result;
    var answer = [{"_id": "dsfdsf", "name": "1", "descr": "adfds", "link": ""}];
    console.log("here" + answer);
    res.send(answer);
});

app.get("/add_task/:name/:descr/:link", async (req, res) => {
    // var user_id = req.params["user_id"];
    const db = client.db("mydb");
    const collection = db.collection("tasks");

    var task = {"name": req.params["user_id"], "descr": req.params["descr"], "link": req.params["link"]}
    var result = await collection.insertOne(task);
    // if (result.length == 0)
    // {
    //     const user = {user_id: user_id, onboarding: false, fraction: "NotSet"};
    //     result = await collection.insertOne(user);
    //     result = await collection.find({"user_id" : user_id}).toArray();
    // }
    // answer = result;
    // console.log("here" + answer);
    res.send(result);
});


const vercel_hello = "Express on Vercel changed again more"
app.get("/", function(req, res)
{

    res.send(vercel_hello);
});

app.listen(port, () => console.log("Server ready on port " + port));

