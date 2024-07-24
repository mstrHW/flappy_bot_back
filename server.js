const express = require('express');
const { Telegraf, Markup } = require('telegraf');
const { message } = require("telegraf/filters");
const path = require('path');
const process = require('process');
const bodyParser = require('body-parser');
require('dotenv').config()

const HOOK_PATH = process.env.HOOK_PATH || "hook";
const PORT = process.env.PORT || 433 ;


const app = express();
app.use(bodyParser.urlencoded({ extended: false }))

app.use(bodyParser.json())

// Use the whole root as static files to be able to serve the html file and
// the build folder
app.use(express.static(path.join(__dirname, '/'), {
    setHeaders: function (res, path) {
        if (path.match('.br')) {
            res.set('Content-Encoding', 'br');
            res.set('Content-Type', 'application/wasm');
        }
    }
}));


// app.use((req, res, next) => {
//     const secret = req.get('X-Telegram-Bot-Api-Secret-Token');
//
//     if (process.env.SECRET_TOKEN !== secret) {
//         return res.sendStatus(301);
//     }
//
//     next();
// });


const bot = new Telegraf(process.env.BOT_TOKEN, {
    telegram: { webhookReply: true },
});


process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

bot.telegram.setWebhook(`${process.env.APP_ENDPOINT}/${HOOK_PATH}`, {
    secret_token: process.env.SECRET_TOKEN,
    allowed_updates: ['message']
});

app.post(`/${HOOK_PATH}`, async (req, res) => {
    bot.handleUpdate(req.body, res);
});

bot.on(message('text'), async (ctx) => {
    console.log('#msg')
    await ctx.reply(rules, Markup.inlineKeyboard([{
        text: "🤟Let's play🤟!!!",
        web_app: {
            url: process.env.APP_ENDPOINT
        }
    }]));
});



app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});