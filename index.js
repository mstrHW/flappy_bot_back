const express = require("express");
const path = require("path");
const TelegramBot = require("node-telegram-bot-api");
const process = require('process');
// const bodyParser = require('body-parser');
require('dotenv').config()
const TOKEN = process.env.BOT_TOKEN;
const server = express();
const bot = new TelegramBot(TOKEN, {
    polling: true
});
const port = process.env.PORT || 7005;
const gameName = process.env.GAME_NAME;
const queries = {};
// server.use(express.static(path.join(__dirname, 'flappy_test')));
bot.onText(/help/, (msg) => bot.sendMessage(msg.from.id, "Say /game if you want to play."));
bot.onText(/start|game/, (msg) => bot.sendGame(msg.from.id, gameName));
bot.on("callback_query", function (query) {
    console.log("user: " + query.message.from.id)
    if (query.game_short_name !== gameName) {
        bot.answerCallbackQuery(query.id, "Sorry, '" + query.game_short_name + "' is not available.");
    } else {
        queries[query.id] = query;
        let gameurl = process.env.APP_ENDPOINT;
        bot.answerCallbackQuery({
            callback_query_id: query.id,
            url: gameurl
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

server.listen(port);