const express = require("express");
const path = require("path");
const TelegramBot = require("node-telegram-bot-api");
const process = require('process');
const { MongoClient } = require('mongodb');
import serverless from "serverless-http";
import fetch from "node-fetch";

const octokit = new Octokit({
  request: {
    fetch: fetch,
  },
});
const cors = require('cors');
require('dotenv').config()
const TOKEN = process.env.BOT_TOKEN;
const client = new MongoClient(process.env.MONGODB_URI);
client.connect();
const app = express();
const router = express.Router();

const bot = new TelegramBot(TOKEN, {
    polling: true
});
const port = 3001;
const gameName = process.env.GAME_NAME;
const queries = {};
// // server.use(express.static(path.join(__dirname, 'flappy_test')));
bot.onText(/help/, (msg) => bot.sendMessage(msg.from.id, "Say /game if you want to play."));
bot.onText(/start|game/, function (msg) {
    bot.sendGame(msg.from.id, gameName)
});

bot.on("callback_query", function (query) {
    console.log("user: " + query.from.id)
    console.log("query: " +  query.message.from.id)
    if (query.game_short_name !== gameName) {
        bot.answerCallbackQuery(query.id, "Sorry, '" + query.game_short_name + "' is not available.");
    } else {
        queries[query.id] = query;
        let gameurl = process.env.APP_ENDPOINT;
        bot.answerCallbackQuery({
            callback_query_id: query.id,
            url: gameurl + "?user_id=" + query.from.id,
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


router.get("/get_user_info/:user_id", async (req, res) => {
   var answer = "None";
    console.log("here 1 ");
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
    console.log("here" + answer);
    delete answer['_id'];
    res.send(answer);
});

router.get("/pass_onboarding/:user_id", async (req, res) => {

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
    console.log("here 1 " + result);
    res.send(result);
});

router.get("/choose_fraction/:user_id/:fraction", async (req, res) => {
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
    console.log("here 2 " + result);
    res.send(result);
});

router.get("/get_tasks/:user_id", async (req, res) => {

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

router.get("/add_task/:name/:descr/:link", async (req, res) => {

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
if(!module.parent){
    app.listen(port, () => console.log("Server ready on port " + port));
}

app.use('/.netlify/functions/api', router);
module.exports.handler = serverless(app);